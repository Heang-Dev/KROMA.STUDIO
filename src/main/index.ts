import { createReadStream, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { BrowserWindow, Menu, app, dialog, ipcMain, protocol, shell } from "electron";
import { parseSubtitles } from "@shared/srt";
import { type CaptionRequest, type ExportRequest, type Project, type Settings, UI_ZOOM_STEPS } from "@shared/types";
import { translateToKhmer, writeCaptions, type TranslateLine } from "./ai";
import { downloadLink, LIBRARY_DIR } from "./download";
import { exportVideo } from "./export";
import { probe } from "./media";
import { loadSettings, saveSettings, viewOf } from "./settings";
import { findTool } from "./tools";
import { transcribe } from "./transcribe";
import { synthesizeLines } from "./voice";

// Media files are streamed to the editor through kroma://media/<path>, with Range support so long videos seek instantly.
// The automated smoke test gets its own settings and autosave, so it never touches yours.
if (process.env.KROMA_SMOKE === "1") {
	const dir = join(app.getPath("temp"), "kroma-smoke");
	rmSync(dir, { recursive: true, force: true });
	app.setPath("userData", dir);
}

protocol.registerSchemesAsPrivileged([{ scheme: "kroma", privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }]);

const MIME: Record<string, string> = { ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav" };

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
		tools: { ffmpeg: Boolean(findTool("ffmpeg")), ffprobe: Boolean(findTool("ffprobe")), ytdlp: Boolean(findTool("yt-dlp")) },
		libraryDir: LIBRARY_DIR,
		version: app.getVersion(),
		smoke: process.env.KROMA_SMOKE === "1",
	}));

	ipcMain.handle("settings:get", () => viewOf(loadSettings()));
	ipcMain.handle("zoom:set", (_e, zoom: number) => setZoom(zoom));
	ipcMain.handle("settings:save", (_e, patch: Partial<Record<keyof Settings, string | number | null>>) => saveSettings(patch));

	ipcMain.handle("media:open", async () => {
		const res = await dialog.showOpenDialog(win!, { properties: ["openFile", "multiSelections"], filters: VIDEO_FILTERS });
		if (res.canceled) return [];
		return Promise.all(res.filePaths.map((p) => probe(p)));
	});
	ipcMain.handle("media:probe", (_e, path: string) => probe(path));
	ipcMain.handle("media:readSubtitles", (_e, path: string) => parseSubtitles(readFileSync(path, "utf8")));

	ipcMain.handle("task:cancel", (_e, taskId: string) => tasks.get(taskId)?.abort());
	ipcMain.handle("task:download", (_e, taskId: string, url: string) => task(taskId, (p, s) => downloadLink(url, loadSettings().cookiesBrowser, p, s)));
	ipcMain.handle("task:voice", (_e, taskId: string, lines: { id: string; text: string }[], voice: string, rate: number) =>
		task(taskId, (p, s) => synthesizeLines(lines, voice, rate, p, s)),
	);
	ipcMain.handle("task:transcribe", (_e, taskId: string, path: string, duration: number, language: string) =>
		task(taskId, (p, s) => transcribe(path, duration, language, loadSettings(), p, s)),
	);
	ipcMain.handle("task:translate", (_e, taskId: string, lines: TranslateLine[], notes: string) =>
		task(taskId, (p, s) => translateToKhmer(lines, notes, loadSettings(), p, s)),
	);
	ipcMain.handle("task:captions", (_e, taskId: string, req: CaptionRequest) => task(taskId, (_p, s) => writeCaptions(req, loadSettings(), s)));
	ipcMain.handle("task:export", (_e, taskId: string, req: ExportRequest) => task(taskId, (p, s) => exportVideo(req, p, s)));

	ipcMain.handle("dialog:saveVideo", async (_e, name: string) => {
		const res = await dialog.showSaveDialog(win!, { defaultPath: join(app.getPath("videos"), `${name}.mp4`), filters: [{ name: "MP4 video", extensions: ["mp4"] }] });
		return res.canceled ? null : res.filePath;
	});
	ipcMain.handle("srt:import", async () => {
		const res = await dialog.showOpenDialog(win!, { properties: ["openFile"], filters: [{ name: "Subtitles", extensions: ["srt", "vtt"] }] });
		return res.canceled ? null : parseSubtitles(readFileSync(res.filePaths[0], "utf8"));
	});
	ipcMain.handle("srt:export", async (_e, name: string, content: string) => {
		const res = await dialog.showSaveDialog(win!, { defaultPath: join(app.getPath("videos"), `${name}.srt`), filters: [{ name: "SubRip subtitles", extensions: ["srt"] }] });
		if (res.canceled || !res.filePath) return null;
		writeFileSync(res.filePath, content);
		return res.filePath;
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
