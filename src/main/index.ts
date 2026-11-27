import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { BrowserWindow, Menu, app, dialog, ipcMain, protocol, session, shell, systemPreferences } from "electron";
import { parseSubtitles } from "@shared/srt";
import { type CaptionRequest, type ExportRequest, type Project, type PublishRequest, type Settings, UI_ZOOM_STEPS, isKvsVoice } from "@shared/types";
import { fallbackCount, translateToKhmer, writeCaptions, type TranslateLine } from "./ai";
import { defaultDownloadDir, downloadLink, LIBRARY_DIR } from "./download";

const defaultExportDir = () => join(LIBRARY_DIR, "Exports");
import { exportVideo } from "./export";
import { listGeminiModels } from "./gemini";
import { probe } from "./media";
import { mediaVisuals } from "./visuals";
import { loadSettings, saveSettings, viewOf } from "./settings";
import { findTool, installHint } from "./tools";
import { mediaPath } from "@shared/media";
import { transcribe } from "./transcribe";
import { importKvsVoices, kvsImportable, cloneVoice, deleteKvsVoice, kvsSamplePath, kvsStatus, listKvsVoices, makePresetVoice, presetVoice, saveRecording, speakWithKvs, syncKvsPresets } from "./kvs";
import { removeVoices, type SeparationQuality } from "./separate";
import { instantSample, synthesizeLines } from "./voice";
import { type CharacterLine, type VoiceChoice, findCharacters } from "./characters";
import { connectLink, ensureProfile, facebookPages, postAccount, postProfiles, publish } from "./publish";

// Media files are streamed to the editor through kroma://media/<path>, with Range support so long videos seek instantly.
// The automated smoke test gets its own settings and autosave, so it never touches yours.
if (process.env.KROMA_SMOKE === "1") {
	const dir = join(app.getPath("temp"), "kroma-smoke");
	rmSync(dir, { recursive: true, force: true });
	app.setPath("userData", dir);
}

protocol.registerSchemesAsPrivileged([{ scheme: "kroma", privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } }]);

const MIME: Record<string, string> = { ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

function serveMedia(request: Request): Response {
	const path = mediaPath(new URL(request.url).pathname);
	let size: number;
	try {
		size = statSync(path).size;
	} catch {
		return new Response("Not found", { status: 404 });
	}
	const type = MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
	const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
	if (!range) {
		return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, { headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" } });
	}
	const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
	const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
	return new Response(Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream, {
		status: 206,
		headers: { "Content-Type": type, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" },
	});
}

const tasks = new Map<string, AbortController>();

// Several windows can be open, each with its own project. Each window has a slot (1, 2, …): slot 1 keeps the usual
// autosave (reopened at launch), other slots autosave to their own file, removed when that window is closed.
const slots = new Map<number, number>();
const slotOf = (sender: Electron.WebContents) => slots.get(sender.id) ?? 1;
const autosavePath = (slot: number) => join(app.getPath("userData"), slot === 1 ? "autosave.json" : `autosave-${slot}.json`);
/** The window a dialog belongs to: the one the user is working in. */
const focused = () => (BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0])!;

function createWindow(): void {
	const used = new Set(slots.values());
	let slot = 1;
	while (used.has(slot)) slot++;
	// A new window opens a little below and right of the one you're in, like other Mac apps.
	const from = BrowserWindow.getFocusedWindow()?.getBounds();
	const win = new BrowserWindow({
		width: from?.width ?? 1500,
		height: from?.height ?? 940,
		...(from ? { x: from.x + 28, y: from.y + 28 } : {}),
		minWidth: 1100,
		minHeight: 700,
		backgroundColor: "#0e0f12",
		...(process.platform === "darwin"
			? // Centred in the 44px title bar, which keeps its size at every interface zoom (see .title-bar in styles.css).
				{ titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 16, y: 16 } }
			: // Windows and Linux: Kroma's own title bar, with the system's minimize / maximize / close drawn on the right
				// (recoloured to the theme by the editor, see window:titleBar).
				{ titleBarStyle: "hidden" as const, titleBarOverlay: { color: "#0e0f12", symbolColor: "#e5e5e5", height: 44 }, icon: windowIcon() }),
		show: false,
		webPreferences: { preload: join(__dirname, "../preload/index.js"), sandbox: true, contextIsolation: true },
	});
	// The saved interface size, applied before the window shows and again after every reload.
	const contentsId = win.webContents.id;
	slots.set(contentsId, slot);
	win.webContents.on("did-finish-load", () => win.webContents.setZoomFactor(loadSettings().uiZoom));
	win.once("ready-to-show", () => win.show());
	// Closing an extra window with unsaved work asks first (the editor flags it); its autosave then goes away.
	win.webContents.on("will-prevent-unload", (event) => {
		const choice = dialog.showMessageBoxSync(win, { type: "warning", buttons: ["Close Window", "Cancel"], defaultId: 1, cancelId: 1, message: "Close this window?", detail: "This window's project has changes that aren't saved to a file. Save it first (⌘S) to keep them." });
		if (choice === 0) event.preventDefault();
	});
	win.on("closed", () => {
		slots.delete(contentsId);
		if (slot !== 1) rmSync(autosavePath(slot), { force: true });
	});
	// Full screen hides the traffic lights, so the title bar drops the space it keeps for them.
	win.on("enter-full-screen", () => win.webContents.send("fullscreen:changed", true));
	win.on("leave-full-screen", () => win.webContents.send("fullscreen:changed", false));
	win.webContents.setWindowOpenHandler(({ url }) => {
		void shell.openExternal(url);
		return { action: "deny" };
	});
	if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
	else void win.loadFile(join(__dirname, "../renderer/index.html"));
}

/** Linux shows this in the taskbar (Windows and Mac take the icon from the app itself). */
function windowIcon(): string | undefined {
	if (process.platform !== "linux") return undefined;
	const icon = [join(process.resourcesPath ?? "", "icon.png"), join(__dirname, "../../resources/icon.png")].find((p) => existsSync(p));
	return icon;
}

// ── Interface size (⌘+ / ⌘− / ⌘0, like a browser) ──

function setZoom(zoom: number): number {
	const value = Math.round(Math.min(UI_ZOOM_STEPS[UI_ZOOM_STEPS.length - 1], Math.max(UI_ZOOM_STEPS[0], zoom)) * 100) / 100;
	saveSettings({ uiZoom: value });
	for (const w of BrowserWindow.getAllWindows()) {
		w.webContents.setZoomFactor(value);
		w.webContents.send("zoom:changed", value);
	}
	return value;
}

function stepZoom(direction: 1 | -1 | 0): number {
	if (direction === 0) return setZoom(1);
	const current = loadSettings().uiZoom;
	const steps = [...UI_ZOOM_STEPS];
	const next = direction > 0 ? steps.find((z) => z > current + 0.001) : [...steps].reverse().find((z) => z < current - 0.001);
	return setZoom(next ?? current);
}

/** App menu: the standard macOS menus, with View's zoom items wired to the saved interface size. */
function buildMenu(): void {
	const zoomItems: Electron.MenuItemConstructorOptions[] = [
		{ label: "Actual Size", accelerator: "CmdOrCtrl+0", click: () => stepZoom(0) },
		{ label: "Zoom In", accelerator: "CmdOrCtrl+=", click: () => stepZoom(1) },
		{ label: "Zoom In", accelerator: "CmdOrCtrl+Plus", visible: false, acceleratorWorksWhenHidden: true, click: () => stepZoom(1) },
		{ label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => stepZoom(-1) },
	];
	const mac = process.platform === "darwin";
	Menu.setApplicationMenu(
		Menu.buildFromTemplate([
			...(mac ? ([{ role: "appMenu" }] as Electron.MenuItemConstructorOptions[]) : []),
			{
				label: "File",
				submenu: [{ label: "New Window", accelerator: "CmdOrCtrl+Shift+N", click: () => createWindow() }, { type: "separator" }, { role: "close" }, ...(mac ? [] : ([{ role: "quit", label: "Exit" }] as Electron.MenuItemConstructorOptions[]))],
			},
			{ role: "editMenu" },
			{ label: "View", submenu: [...zoomItems, { type: "separator" }, { role: "togglefullscreen" }, ...(app.isPackaged ? [] : ([{ type: "separator" }, { role: "reload" }, { role: "toggleDevTools" }] as Electron.MenuItemConstructorOptions[]))] },
			{ role: "windowMenu" },
		]),
	);
}

/** Runs a long task with progress events and cancellation by task id. */
function task<T>(taskId: string, work: (progress: (p: number, m: string) => void, signal: AbortSignal) => Promise<T>): Promise<T> {
	const controller = new AbortController();
	tasks.set(taskId, controller);
	// Every window hears it; only the one that started the task (it knows the id) shows it.
	const progress = (p: number, message: string) => {
		for (const w of BrowserWindow.getAllWindows()) w.webContents.send("task:progress", { taskId, progress: p, message });
	};
	return work(progress, controller.signal).finally(() => tasks.delete(taskId));
}

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "m4v", "mkv", "webm", "avi", "flv", "ts"] }];

function registerIpc(): void {
	ipcMain.handle("app:info", (e) => ({
		slot: slotOf(e.sender),
		tools: { ffmpeg: Boolean(findTool("ffmpeg")), ffprobe: Boolean(findTool("ffprobe")), ytdlp: Boolean(findTool("yt-dlp")), uv: Boolean(findTool("uvx")) },
		platform: process.platform,
		installHints: { ffmpeg: installHint("ffmpeg"), ytdlp: installHint("yt-dlp"), uv: installHint("uvx") },
		libraryDir: LIBRARY_DIR,
		version: app.getVersion(),
		smoke: process.env.KROMA_SMOKE === "1" || process.env.KROMA_E2E === "1",
		// End-to-end runs use the real settings (your keys) but must not touch your autosaved project.
		e2e: process.env.KROMA_E2E === "1",
	}));

	ipcMain.handle("settings:get", () => viewOf(loadSettings()));
	ipcMain.handle("gemini:models", () => {
		const key = loadSettings().geminiKey;
		return key ? listGeminiModels(key) : [];
	});
	ipcMain.handle("zoom:set", (_e, zoom: number) => setZoom(zoom));
	ipcMain.handle("settings:save", (_e, patch: Partial<Record<keyof Settings, string | number | boolean | null>>) => saveSettings(patch));

	ipcMain.handle("media:open", async () => {
		const res = await dialog.showOpenDialog(focused(), { properties: ["openFile", "multiSelections"], filters: VIDEO_FILTERS });
		if (res.canceled) return [];
		return Promise.all(res.filePaths.map((p) => probe(p)));
	});
	ipcMain.handle("media:probe", (_e, path: string) => probe(path));
	ipcMain.handle("media:visuals", (_e, path: string, duration: number) => mediaVisuals(path, duration));
	ipcMain.handle("media:readSubtitles", (_e, path: string) => parseSubtitles(readFileSync(path, "utf8")));

	ipcMain.handle("task:cancel", (_e, taskId: string) => tasks.get(taskId)?.abort());
	ipcMain.handle("task:download", (_e, taskId: string, url: string) => task(taskId, (p, s) => downloadLink(url, loadSettings().cookiesBrowser, loadSettings().downloadDir, p, s)));
	ipcMain.handle("task:voice", (_e, taskId: string, lines: { id: string; text: string }[], voice: string, rate: number) =>
		task(taskId, async (p, s) => {
			if (!isKvsVoice(voice)) return synthesizeLines(lines, voice, rate, p, s);
			// A template without its saved sample gets one first, so every line (now and later) sounds the same.
			const name = voice.startsWith("kvs-design:") ? voice.slice("kvs-design:".length) : null;
			if (name && !presetVoice(name)) await presetFromKvsOrDesign(name, (v, m) => p(-1, `Preparing the voice "${name}" (once): ${m.replace(/^Voice engine: /, "")}`), s);
			return speakWithKvs(loadSettings(), lines, voice, p, s);
		}),
	);
	ipcMain.handle("voice:sample", (_e, voice: string, rate: number) => (isKvsVoice(voice) ? kvsSamplePath(voice) : instantSample(voice, rate)));
	ipcMain.handle("task:presetVoice", (_e, taskId: string, name: string) => task(taskId, (p, s) => presetFromKvsOrDesign(name, p, s)));
	ipcMain.handle("kvs:status", () => kvsStatus(loadSettings()));
	// Every look at the library first brings over KVS's preset samples (at most every 20 s), so both apps sound the same.
	let synced = 0;
	ipcMain.handle("kvs:voices", async () => {
		if (Date.now() - synced > 20_000) {
			synced = Date.now();
			await syncKvsPresets(kvsDir()).catch(() => 0);
		}
		return listKvsVoices();
	});
	// The KVS project folder: the saved setting, or the usual place next to this project.
	/** A template's sample: KVS's own when it has one (so both apps match), otherwise designed here once. */
async function presetFromKvsOrDesign(name: string, p: (v: number, m: string) => void, s?: AbortSignal) {
	await syncKvsPresets(kvsDir()).catch(() => 0);
	return presetVoice(name) ?? makePresetVoice(loadSettings(), name, p, s);
}

const kvsDir = () => loadSettings().kvsProjectDir || join(app.getPath("home"), "Documents", "PERSONAL", "PROJECTS", "KHMER.VOICE.STUDIO");
	ipcMain.handle("kvs:importable", () => kvsImportable(kvsDir()));
	ipcMain.handle("kvs:import", (_e, ids: number[]) => importKvsVoices(kvsDir(), ids));
	ipcMain.handle("kvs:delete", (_e, id: string) => deleteKvsVoice(id));
	ipcMain.handle("kvs:pickRecording", async () => {
		const res = await dialog.showOpenDialog(focused(), { properties: ["openFile"], filters: [{ name: "Recording", extensions: ["wav", "mp3", "m4a", "aac", "ogg", "flac", "mp4", "mov", "webm"] }] });
		return res.canceled ? null : res.filePaths[0];
	});
	ipcMain.handle("task:separate", (_e, taskId: string, path: string, duration: number, quality: SeparationQuality) => task(taskId, (p, s) => removeVoices(path, duration, quality, p, s)));
	ipcMain.handle("task:clone", (_e, taskId: string, name: string, recording: string, transcript?: string) => task(taskId, (p, s) => cloneVoice(loadSettings(), name, recording, p, s, transcript)));
	ipcMain.handle("recording:save", (_e, bytes: Uint8Array) => saveRecording(bytes));
	// macOS asks once for the microphone; afterwards it's on/off in System Settings → Privacy → Microphone.
	ipcMain.handle("mic:access", async () => {
		if (process.platform !== "darwin" || process.env.KROMA_SMOKE === "1") return "granted"; // tests use a fake microphone
		const status = systemPreferences.getMediaAccessStatus("microphone");
		if (status === "not-determined") return (await systemPreferences.askForMediaAccess("microphone")) ? "granted" : "denied";
		return status;
	});
	ipcMain.handle("mic:settings", () => shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"));
	ipcMain.handle("task:transcribe", (_e, taskId: string, path: string, duration: number, language: string) =>
		task(taskId, (p, s) => transcribe(path, duration, language, loadSettings(), p, s)),
	);
	ipcMain.handle("task:translate", (_e, taskId: string, lines: TranslateLine[], notes: string, language?: string) =>
		task(taskId, async (p, s) => {
			const translations = await translateToKhmer(lines, notes, loadSettings(), p, s, language);
			return { translations, fallback: fallbackCount.get(lines) ?? 0 };
		}),
	);
	ipcMain.handle("task:characters", (_e, taskId: string, lines: CharacterLine[], voices: VoiceChoice[], notes: string) => task(taskId, (p, s) => findCharacters(lines, voices, notes, loadSettings(), p, s)));
	// Posting through Upload-Post (key and profile from Settings → Posting).
	ipcMain.handle("post:account", () => postAccount(loadSettings().postKey));
	ipcMain.handle("post:profiles", () => postProfiles(loadSettings().postKey));
	ipcMain.handle("post:connect", async () => {
		const s = loadSettings();
		const profile = await ensureProfile(s.postKey, s.postProfile);
		if (profile !== s.postProfile) saveSettings({ postProfile: profile });
		await shell.openExternal(await connectLink(s.postKey, profile));
		return profile;
	});
	ipcMain.handle("post:facebookPages", () => {
		const s = loadSettings();
		return s.postProfile ? facebookPages(s.postKey, s.postProfile) : [];
	});
	ipcMain.handle("task:publish", (_e, taskId: string, req: PublishRequest) => task(taskId, (p, s) => publish(loadSettings().postKey, req, p, s)));
	ipcMain.handle("task:captions", (_e, taskId: string, req: CaptionRequest) => task(taskId, (_p, s) => writeCaptions(req, loadSettings(), s)));
	ipcMain.handle("task:export", (_e, taskId: string, req: ExportRequest) => task(taskId, (p, s) => exportVideo(req, p, s)));

	// Exports go straight into the export folder (a free name, never overwriting), or through the Save dialog when asked.
	const exportTarget = async (name: string, ext: "mp4" | "srt"): Promise<string | null> => {
		const settings = loadSettings();
		const dir = settings.exportDir || defaultExportDir();
		mkdirSync(dir, { recursive: true });
		const safe = name.replace(/[/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Kroma export";
		if (settings.askExportPath) {
			const filters = ext === "mp4" ? [{ name: "MP4 video", extensions: ["mp4"] }] : [{ name: "SubRip subtitles", extensions: ["srt"] }];
			const res = await dialog.showSaveDialog(focused(), { defaultPath: join(dir, `${safe}.${ext}`), filters });
			return res.canceled || !res.filePath ? null : res.filePath;
		}
		let target = join(dir, `${safe}.${ext}`);
		for (let n = 2; existsSync(target); n++) target = join(dir, `${safe} (${n}).${ext}`);
		return target;
	};
	ipcMain.handle("dialog:saveVideo", (_e, name: string) => exportTarget(name, "mp4"));
	ipcMain.handle("dialog:pickImage", async () => {
		const res = await dialog.showOpenDialog(focused(), { properties: ["openFile"], filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }] });
		return res.canceled ? null : res.filePaths[0];
	});
	ipcMain.handle("dialog:chooseFolder", async (_e, current: string) => {
		const res = await dialog.showOpenDialog(focused(), { defaultPath: current || app.getPath("videos"), properties: ["openDirectory", "createDirectory"] });
		return res.canceled ? null : res.filePaths[0];
	});
	ipcMain.handle("folders:defaults", () => ({ exportDir: defaultExportDir(), downloadDir: defaultDownloadDir(), libraryDir: LIBRARY_DIR }));
	ipcMain.handle("shell:openFolder", (_e, dir: string) => {
		mkdirSync(dir, { recursive: true });
		void shell.openPath(dir);
	});
	ipcMain.handle("srt:import", async () => {
		const res = await dialog.showOpenDialog(focused(), { properties: ["openFile"], filters: [{ name: "Subtitles", extensions: ["srt", "vtt"] }] });
		return res.canceled ? null : parseSubtitles(readFileSync(res.filePaths[0], "utf8"));
	});
	ipcMain.handle("srt:export", async (_e, name: string, content: string) => {
		const target = await exportTarget(name, "srt");
		if (!target) return null;
		writeFileSync(target, content);
		return target;
	});

	ipcMain.handle("project:save", async (_e, project: Project, path: string | null) => {
		let target = path;
		if (!target) {
			const res = await dialog.showSaveDialog(focused(), { defaultPath: join(LIBRARY_DIR, `${project.name}.kroma`), filters: [{ name: "Kroma project", extensions: ["kroma"] }] });
			if (res.canceled || !res.filePath) return null;
			target = res.filePath;
		}
		writeFileSync(target, JSON.stringify(project, null, "\t"));
		return target;
	});
	ipcMain.handle("project:open", async () => {
		const res = await dialog.showOpenDialog(focused(), { properties: ["openFile"], defaultPath: LIBRARY_DIR, filters: [{ name: "Kroma project", extensions: ["kroma"] }] });
		if (res.canceled) return null;
		const project = JSON.parse(readFileSync(res.filePaths[0], "utf8")) as Project;
		return { project, path: res.filePaths[0] };
	});

	// Autosave: the editor writes the open project here a moment after every change, and reopens it at launch.
	// Each window has its own autosave file (see slots).
	ipcMain.handle("autosave:write", (e, project: Project, path: string | null) => writeFileSync(autosavePath(slotOf(e.sender)), JSON.stringify({ project, path })));
	ipcMain.handle("autosave:read", (e) => {
		try {
			return JSON.parse(readFileSync(autosavePath(slotOf(e.sender)), "utf8")) as { project: Project; path: string | null };
		} catch {
			return null;
		}
	});

	// The window buttons on Windows and Linux follow the light / dark theme.
	ipcMain.handle("window:titleBar", (e, color: string, symbolColor: string) => {
		if (process.platform === "darwin") return;
		BrowserWindow.fromWebContents(e.sender)?.setTitleBarOverlay({ color, symbolColor, height: 44 });
	});
	ipcMain.handle("file:exists", (_e, path: string) => existsSync(path));
	ipcMain.handle("shell:show", (_e, path: string) => shell.showItemInFolder(path));
	ipcMain.handle("shell:open", (_e, url: string) => {
		if (/^https:\/\//.test(url)) void shell.openExternal(url);
	});
}

// One Kroma at a time: opening it again (or "New Window" from the Windows taskbar) opens a window in the running app,
// so two copies never write the same autosave. Test runs start their own copy.
const testRun = process.env.KROMA_SMOKE === "1" || process.env.KROMA_E2E === "1";
const firstCopy = testRun || app.requestSingleInstanceLock();
if (!firstCopy) app.quit();
app.on("second-instance", (_e, argv) => {
	const existing = BrowserWindow.getAllWindows()[0];
	if (argv.includes("--new-window") || !existing) return createWindow();
	if (existing.isMinimized()) existing.restore();
	existing.focus();
});
if (process.platform === "win32") app.setAppUserModelId("kh.kroma.studio");

app.whenReady().then(() => {
	if (!firstCopy) return;
	protocol.handle("kroma", serveMedia);
	// The editor may use the microphone (recording a voice to clone); nothing else (camera, screen, …).
	const audioOnly = (permission: string, mediaTypes?: string[]) => permission === "media" && (mediaTypes ?? ["audio"]).every((t) => t === "audio");
	session.defaultSession.setPermissionRequestHandler((_wc, permission, callback, details) => callback(audioOnly(permission, (details as { mediaTypes?: string[] }).mediaTypes)));
	session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === "media");
	registerIpc();
	buildMenu();
	createWindow();
	// Right-click the Dock icon (Mac) or the taskbar button (Windows) → New Window.
	app.dock?.setMenu(Menu.buildFromTemplate([{ label: "New Window", click: () => createWindow() }]));
	if (process.platform === "win32") app.setUserTasks([{ program: process.execPath, arguments: "--new-window", iconPath: process.execPath, iconIndex: 0, title: "New Window", description: "Open another Kroma window" }]);
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
