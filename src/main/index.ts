import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { BrowserWindow, Menu, app, dialog, ipcMain, protocol, shell } from "electron";
import { parseSubtitles } from "@shared/srt";
import { type CaptionRequest, type ExportRequest, type Project, type Settings, UI_ZOOM_STEPS, isKvsVoice } from "@shared/types";
import { fallbackCount, translateToKhmer, writeCaptions, type TranslateLine } from "./ai";
import { defaultDownloadDir, downloadLink, LIBRARY_DIR } from "./download";

const defaultExportDir = () => join(LIBRARY_DIR, "Exports");
import { exportVideo } from "./export";
import { listGeminiModels } from "./gemini";
import { probe } from "./media";
import { mediaVisuals } from "./visuals";
import { loadSettings, saveSettings, viewOf } from "./settings";
import { findTool } from "./tools";
import { transcribe } from "./transcribe";
import { cloneVoice, deleteKvsVoice, kvsStatus, listKvsVoices, speakWithKvs } from "./kvs";
import { removeVoices, type SeparationQuality } from "./separate";
import { synthesizeLines } from "./voice";

// Media files are streamed to the editor through kroma://media/<path>, with Range support so long videos seek instantly.
// The automated smoke test gets its own settings and autosave, so it never touches yours.
if (process.env.KROMA_SMOKE === "1") {
	const dir = join(app.getPath("temp"), "kroma-smoke");
	rmSync(dir, { recursive: true, force: true });
	app.setPath("userData", dir);
}

protocol.registerSchemesAsPrivileged([{ scheme: "kroma", privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }]);

const MIME: Record<string, string> = { ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

function serveMedia(request: Request): Response {
	const path = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, "/"));
	let size: number;
	try {
		size = statSync(path).size;
	} catch {
		return new Response("Not found", { status: 404 });
	}
	const type = MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
	const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
	if (!range) {
		return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, { headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes" } });
	}
	const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
	const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
	return new Response(Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream, {
		status: 206,
		headers: { "Content-Type": type, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes" },
	});
}

let win: BrowserWindow | null = null;
const tasks = new Map<string, AbortController>();

function createWindow(): void {
	win = new BrowserWindow({
		width: 1500,
		height: 940,
		minWidth: 1100,
		minHeight: 700,
		backgroundColor: "#0e0f12",
		titleBarStyle: "hiddenInset",
		// Centred in the 44px title bar, which keeps its size at every interface zoom (see .title-bar in styles.css).
		trafficLightPosition: { x: 16, y: 16 },
		show: false,
		webPreferences: { preload: join(__dirname, "../preload/index.js"), sandbox: true, contextIsolation: true },
	});
	// The saved interface size, applied before the window shows and again after every reload.
	win.webContents.on("did-finish-load", () => win?.webContents.setZoomFactor(loadSettings().uiZoom));
	win.once("ready-to-show", () => win?.show());
	// Full screen hides the traffic lights, so the title bar drops the space it keeps for them.
	win.on("enter-full-screen", () => win?.webContents.send("fullscreen:changed", true));
	win.on("leave-full-screen", () => win?.webContents.send("fullscreen:changed", false));
	win.webContents.setWindowOpenHandler(({ url }) => {
		void shell.openExternal(url);
		return { action: "deny" };
	});
	if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
	else void win.loadFile(join(__dirname, "../renderer/index.html"));
}

// ── Interface size (⌘+ / ⌘− / ⌘0, like a browser) ──

function setZoom(zoom: number): number {
	const value = Math.round(Math.min(UI_ZOOM_STEPS[UI_ZOOM_STEPS.length - 1], Math.max(UI_ZOOM_STEPS[0], zoom)) * 100) / 100;
	saveSettings({ uiZoom: value });
	win?.webContents.setZoomFactor(value);
	win?.webContents.send("zoom:changed", value);
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
	Menu.setApplicationMenu(
		Menu.buildFromTemplate([
			{ role: "appMenu" },
			{ role: "fileMenu" },
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
	const progress = (p: number, message: string) => win?.webContents.send("task:progress", { taskId, progress: p, message });
	return work(progress, controller.signal).finally(() => tasks.delete(taskId));
}

const VIDEO_FILTERS = [{ name: "Video", extensions: ["mp4", "mov", "m4v", "mkv", "webm", "avi", "flv", "ts"] }];

function registerIpc(): void {
	ipcMain.handle("app:info", () => ({
		tools: { ffmpeg: Boolean(findTool("ffmpeg")), ffprobe: Boolean(findTool("ffprobe")), ytdlp: Boolean(findTool("yt-dlp")), uv: Boolean(findTool("uvx")) },
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
		const res = await dialog.showOpenDialog(win!, { properties: ["openFile", "multiSelections"], filters: VIDEO_FILTERS });
		if (res.canceled) return [];
		return Promise.all(res.filePaths.map((p) => probe(p)));
	});
	ipcMain.handle("media:probe", (_e, path: string) => probe(path));
	ipcMain.handle("media:visuals", (_e, path: string, duration: number) => mediaVisuals(path, duration));
	ipcMain.handle("media:readSubtitles", (_e, path: string) => parseSubtitles(readFileSync(path, "utf8")));

	ipcMain.handle("task:cancel", (_e, taskId: string) => tasks.get(taskId)?.abort());
	ipcMain.handle("task:download", (_e, taskId: string, url: string) => task(taskId, (p, s) => downloadLink(url, loadSettings().cookiesBrowser, loadSettings().downloadDir, p, s)));
	ipcMain.handle("task:voice", (_e, taskId: string, lines: { id: string; text: string }[], voice: string, rate: number) =>
		task(taskId, (p, s) => (isKvsVoice(voice) ? speakWithKvs(loadSettings(), lines, voice, p, s) : synthesizeLines(lines, voice, rate, p, s))),
	);
	ipcMain.handle("kvs:status", () => kvsStatus(loadSettings()));
	ipcMain.handle("kvs:voices", () => listKvsVoices());
	ipcMain.handle("kvs:delete", (_e, id: string) => deleteKvsVoice(id));
	ipcMain.handle("kvs:pickRecording", async () => {
		const res = await dialog.showOpenDialog(win!, { properties: ["openFile"], filters: [{ name: "Recording", extensions: ["wav", "mp3", "m4a", "aac", "ogg", "flac", "mp4", "mov", "webm"] }] });
		return res.canceled ? null : res.filePaths[0];
	});
	ipcMain.handle("task:separate", (_e, taskId: string, path: string, duration: number, quality: SeparationQuality) => task(taskId, (p, s) => removeVoices(path, duration, quality, p, s)));
	ipcMain.handle("task:clone", (_e, taskId: string, name: string, recording: string) => task(taskId, (p, s) => cloneVoice(loadSettings(), name, recording, p, s)));
	ipcMain.handle("task:transcribe", (_e, taskId: string, path: string, duration: number, language: string) =>
		task(taskId, (p, s) => transcribe(path, duration, language, loadSettings(), p, s)),
	);
	ipcMain.handle("task:translate", (_e, taskId: string, lines: TranslateLine[], notes: string) =>
		task(taskId, async (p, s) => {
			const translations = await translateToKhmer(lines, notes, loadSettings(), p, s);
			return { translations, fallback: fallbackCount.get(lines) ?? 0 };
		}),
	);
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
			const res = await dialog.showSaveDialog(win!, { defaultPath: join(dir, `${safe}.${ext}`), filters });
			return res.canceled || !res.filePath ? null : res.filePath;
		}
		let target = join(dir, `${safe}.${ext}`);
		for (let n = 2; existsSync(target); n++) target = join(dir, `${safe} (${n}).${ext}`);
		return target;
	};
	ipcMain.handle("dialog:saveVideo", (_e, name: string) => exportTarget(name, "mp4"));
	ipcMain.handle("dialog:chooseFolder", async (_e, current: string) => {
		const res = await dialog.showOpenDialog(win!, { defaultPath: current || app.getPath("videos"), properties: ["openDirectory", "createDirectory"] });
		return res.canceled ? null : res.filePaths[0];
	});
	ipcMain.handle("folders:defaults", () => ({ exportDir: defaultExportDir(), downloadDir: defaultDownloadDir(), libraryDir: LIBRARY_DIR }));
	ipcMain.handle("shell:openFolder", (_e, dir: string) => {
		mkdirSync(dir, { recursive: true });
		void shell.openPath(dir);
	});
	ipcMain.handle("srt:import", async () => {
		const res = await dialog.showOpenDialog(win!, { properties: ["openFile"], filters: [{ name: "Subtitles", extensions: ["srt", "vtt"] }] });
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
			const res = await dialog.showSaveDialog(win!, { defaultPath: join(LIBRARY_DIR, `${project.name}.kroma`), filters: [{ name: "Kroma project", extensions: ["kroma"] }] });
			if (res.canceled || !res.filePath) return null;
			target = res.filePath;
		}
		writeFileSync(target, JSON.stringify(project, null, "\t"));
		return target;
	});
	ipcMain.handle("project:open", async () => {
		const res = await dialog.showOpenDialog(win!, { properties: ["openFile"], defaultPath: LIBRARY_DIR, filters: [{ name: "Kroma project", extensions: ["kroma"] }] });
		if (res.canceled) return null;
		const project = JSON.parse(readFileSync(res.filePaths[0], "utf8")) as Project;
		return { project, path: res.filePaths[0] };
	});

	// Autosave: the editor writes the open project here a moment after every change, and reopens it at launch.
	const autosaveFile = join(app.getPath("userData"), "autosave.json");
	ipcMain.handle("autosave:write", (_e, project: Project, path: string | null) => writeFileSync(autosaveFile, JSON.stringify({ project, path })));
	ipcMain.handle("autosave:read", () => {
		try {
			return JSON.parse(readFileSync(autosaveFile, "utf8")) as { project: Project; path: string | null };
		} catch {
			return null;
		}
	});

	ipcMain.handle("shell:show", (_e, path: string) => shell.showItemInFolder(path));
	ipcMain.handle("shell:open", (_e, url: string) => {
		if (/^https:\/\//.test(url)) void shell.openExternal(url);
	});
}

app.whenReady().then(() => {
	protocol.handle("kroma", serveMedia);
	registerIpc();
	buildMenu();
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
