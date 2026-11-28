// The Download Center: list what's behind pasted links (a video, a playlist, a whole channel), then download the
// chosen videos one queue at a time, each into its playlist's folder and (when asked) its own Kroma project.
// The queue lives in the main process and in <library>/downloads/center.json, so it keeps going when you switch pages
// and picks up where it stopped when Kroma starts again (yt-dlp resumes its .part files).

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { BrowserWindow, dialog, shell } from "electron";
import {
	DEFAULT_DOWNLOAD_OPTIONS,
	type DownloadCenterState,
	type DownloadItem,
	type DownloadOptions,
	type ListedSource,
	type ListedVideo,
	buildProject,
	isArchiveSkip,
	isRateLimited,
	parseTitleLines,
	TITLE_PRINT,
	type FilledTitle,
	type ImportFile,
	type ImportPick,
	isVideoFile,
	naturalCompare,
	sidecarSubtitles,
	VIDEO_EXTENSIONS,
	nextToStart,
	numbered,
	parseExtractors,
	parseListing,
	safeName,
	splitLinks,
} from "@shared/downloads";
import { downloadErrorMessage } from "@shared/links";
import type { MediaItem, Project } from "@shared/types";
import type { StoredAction } from "@shared/notify";
import { defaultDownloadDir, formatFor, LIBRARY_DIR, PROGRESS_ARGS, SUB_ARGS, ytdlpCommon } from "./download";
import { probe } from "./media";
import { createBatchTracker } from "@shared/notify";
import { notifyFromMain } from "./notify";
import { loadSettings } from "./settings";
import { mapLimit, requireTool, run } from "./tools";
import { t } from "@shared/i18n";

/**
 * Videos listed at a time; "Load more" lists the next page. Big channels have thousands. Bilibili channel pages come
 * without titles (about a second each to fill in, and too many requests get blocked), so they list fewer at a time.
 */
const pageSize = (url: string) => (/space\.bilibili\.com/.test(url) ? 30 : 200);

const centerDir = () => join(LIBRARY_DIR, "downloads");
const centerFile = () => join(centerDir(), "center.json");
/** yt-dlp's record of what's been downloaded ("youtube <id>" per line): a playlist downloaded again skips those. */
const archiveFile = () => join(centerDir(), "archive.txt");
const projectsDir = () => join(LIBRARY_DIR, "projects");
const isYouTube = (url: string) => /^https?:\/\/([\w-]+\.)?(youtube\.com|youtu\.be)\//i.test(url);

// ── Listing ──

/** Lists the videos behind each link in the pasted text. A link that fails comes back with its error. */
export async function listLinks(text: string): Promise<ListedSource[]> {
	const links = splitLinks(text);
	if (!links.length) throw new Error(t("No links found. Paste links that start with https://, one per line."));
	const results: ListedSource[] = [];
	for (const url of links) results.push(await listSource(url, 1));
	return results;
}

/**
 * Titles and lengths for videos the listing gave without them (a Bilibili channel lists links only). About a second
 * per Bilibili video, so the page asks for ~10 at a time and fills the rows in as they come.
 */
export async function fetchTitles(urls: string[]): Promise<FilledTitle[]> {
	const ytdlp = requireTool("yt-dlp");
	const { args, env } = ytdlpCommon(loadSettings().cookiesBrowser);
	let out = "";
	// --ignore-errors: one deleted video mustn't hide the others' titles (yt-dlp still exits with an error then).
	await run(ytdlp, [...args, "--skip-download", "--ignore-errors", "--no-playlist", "--no-warnings", "--print", TITLE_PRINT, ...urls], { env, onLine: (l) => void (out += `${l}\n`) }).catch(() => undefined);
	return parseTitleLines(out);
}

/** One page of a link's videos, starting at `start` (1-based). */
export async function listSource(url: string, start: number): Promise<ListedSource> {
	const ytdlp = requireTool("yt-dlp");
	const { args, env } = ytdlpCommon(loadSettings().cookiesBrowser);
	try {
		const size = pageSize(url);
		const json = await run(ytdlp, [...args, "--flat-playlist", "--yes-playlist", "-J", "--playlist-start", String(start), "--playlist-end", String(start + size - 1), url], { env });
		return parseListing(json, url, start, size);
	} catch (err) {
		return { url, title: url, kind: "video", items: [], hasMore: false, error: downloadErrorMessage(err instanceof Error ? err.message : String(err)) };
	}
}

let extractors: { name: string; broken: boolean }[] | null = null;

/** Every site yt-dlp can download from (1,700+), read once. */
export async function listPlatforms(): Promise<{ name: string; broken: boolean }[]> {
	if (!extractors) extractors = parseExtractors(await run(requireTool("yt-dlp"), ["--list-extractors"]));
	return extractors;
}

// ── The queue ──

let state: DownloadCenterState = { items: [], options: { ...DEFAULT_DOWNLOAD_OPTIONS }, paused: false };
const running = new Map<string, AbortController>();
/** YouTube asks "are you a bot?" when downloads come too fast: its videos start a few seconds apart. */
let youtubeReadyAt = 0;
let pumpTimer: ReturnType<typeof setTimeout> | undefined;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

export function downloadState(): DownloadCenterState {
	return state;
}

/** Loads the saved queue. Downloads that were running when Kroma closed start again (`resume`). */
export function startDownloadCenter(resume: boolean): void {
	try {
		const saved = JSON.parse(readFileSync(centerFile(), "utf8")) as Partial<DownloadCenterState>;
		state = {
			items: (saved.items ?? []).map((i) => (i.status === "downloading" ? { ...i, status: "waiting", progress: 0, speed: undefined, secondsLeft: undefined } : i)),
			options: { ...DEFAULT_DOWNLOAD_OPTIONS, ...saved.options },
			paused: Boolean(saved.paused),
			pauseReason: saved.pauseReason,
		};
	} catch {
		// No queue yet.
	}
	if (resume) pump();
}

/** Tells every window (at most twice a second) and keeps the queue on disk. */
function changed(now = false): void {
	if (flushTimer && !now) return;
	clearTimeout(flushTimer);
	flushTimer = setTimeout(
		() => {
			flushTimer = undefined;
			flush();
		},
		now ? 0 : 500,
	);
}

export function flush(): void {
	for (const w of BrowserWindow.getAllWindows()) w.webContents.send("downloads:update", state);
	try {
		mkdirSync(centerDir(), { recursive: true });
		const tmp = `${centerFile()}.tmp`;
		writeFileSync(tmp, JSON.stringify(state, null, "\t"));
		renameSync(tmp, centerFile());
	} catch {
		// The library folder may be unavailable for a moment; the next change saves again.
	}
}

function patch(id: string, fields: Partial<DownloadItem>): void {
	state = { ...state, items: state.items.map((i) => (i.id === id ? { ...i, ...fields } : i)) };
	changed(fields.status !== undefined);
}

/** Adds videos to the queue (ones already in it, and not failed, are left out). Returns how many were added. */
export function addDownloads(videos: ListedVideo[], group: string, groupSize: number | undefined): number {
	const known = new Set(state.items.filter((i) => i.status !== "failed" && i.status !== "cancelled").map((i) => i.url));
	const { quality, subtitles, makeProjects } = state.options;
	// The listing's title may still be a placeholder (the link): the download fills in the real one.
	const fresh: DownloadItem[] = videos
		.filter((v) => !known.has(v.url))
		.map((v) => ({
			id: randomUUID(),
			url: v.url,
			videoId: v.videoId,
			title: v.title,
			group: group || "Single videos",
			index: v.index,
			groupSize,
			duration: v.duration,
			...(v.untitled ? { untitled: true } : {}),
			status: "waiting",
			progress: 0,
			quality,
			subtitles,
			makeProjects,
			added: Date.now(),
		}));
	// A failed or cancelled copy of a video added again makes way for the new one.
	const urls = new Set(fresh.map((i) => i.url));
	state = { ...state, items: [...state.items.filter((i) => !urls.has(i.url)), ...fresh] };
	changed(true);
	pump();
	return fresh.length;
}

export function setDownloadOptions(options: Partial<DownloadOptions>): DownloadCenterState {
	state = { ...state, options: { ...state.options, ...options } };
	changed(true);
	pump();
	return state;
}

export function setDownloadsPaused(paused: boolean): void {
	state = { ...state, paused, pauseReason: undefined };
	changed(true);
	pump();
}

export function retryDownload(id: string): void {
	patch(id, { status: "waiting", progress: 0, error: undefined, message: undefined, speed: undefined, secondsLeft: undefined });
	pump();
}

export function retryFailed(): void {
	state = { ...state, items: state.items.map((i) => (i.status === "failed" || i.status === "cancelled" ? { ...i, status: "waiting", progress: 0, error: undefined, message: undefined } : i)) };
	changed(true);
	pump();
}

export function cancelDownload(id: string): void {
	const controller = running.get(id);
	if (controller) controller.abort();
	else patch(id, { status: "cancelled", message: undefined });
}

/**
 * Takes a video off the list (the downloaded file and project stay). It's also forgotten by the download archive,
 * so adding it again downloads it again.
 */
export function removeDownload(id: string): void {
	const item = state.items.find((i) => i.id === id);
	running.get(id)?.abort();
	state = { ...state, items: state.items.filter((i) => i.id !== id) };
	if (item?.videoId) forgetInArchive(item.videoId);
	changed(true);
}

/** Takes finished videos off the list (done, and already downloaded). */
export function clearFinished(): void {
	state = { ...state, items: state.items.filter((i) => i.status !== "done" && i.status !== "skipped") };
	changed(true);
}

export function showDownload(id: string): void {
	const item = state.items.find((i) => i.id === id);
	const path = [item?.mediaPath, item?.projectPath].find((p) => p && existsSync(p));
	if (path) shell.showItemInFolder(path);
	else void shell.openPath(itemDir(item?.group ?? ""));
}

function forgetInArchive(videoId: string): void {
	try {
		const lines = readFileSync(archiveFile(), "utf8").split("\n");
		const kept = lines.filter((l) => l.trim().split(/\s+/)[1] !== videoId);
		if (kept.length !== lines.length) writeFileSync(archiveFile(), kept.join("\n"));
	} catch {
		// No archive yet.
	}
}

/** Starts what can start: the next waiting videos, up to the limit, YouTube ones a few seconds apart. */
function pump(): void {
	clearTimeout(pumpTimer);
	for (const item of nextToStart(state, state.options.concurrency)) {
		if (running.has(item.id)) continue;
		if (isYouTube(item.url)) {
			const wait = youtubeReadyAt - Date.now();
			if (wait > 0) {
				pumpTimer = setTimeout(pump, wait);
				return;
			}
			youtubeReadyAt = Date.now() + 3000 + Math.random() * 5000;
		}
		void download(item);
	}
}

const itemDir = (group: string) => join(loadSettings().downloadDir || defaultDownloadDir(), safeName(group));
/** yt-dlp output templates treat % as a field: a literal one is written %%. */
const literal = (text: string) => text.replace(/%/g, "%%");

async function download(item: DownloadItem): Promise<void> {
	const controller = new AbortController();
	running.set(item.id, controller);
	patch(item.id, { status: "downloading", progress: -1, message: t("Reading the page…"), error: undefined });
	try {
		const result = await fetchVideo(item, controller.signal);
		let projectPath: string | undefined;
		if (item.makeProjects && result.media) {
			patch(item.id, { progress: -1, message: t("Making the project…") });
			projectPath = ensureProject({ ...item, title: result.title }, result.media);
		} else projectPath = findProject(item);
		if (!result.skipped) finished(true, result.title || item.title, projectPath ? { kind: "openProject", path: projectPath } : result.media ? { kind: "showFile", path: result.media.path } : undefined);
		patch(item.id, {
			status: result.skipped ? "skipped" : "done",
			progress: 1,
			message: result.skipped ? t("Already downloaded") : undefined,
			speed: undefined,
			secondsLeft: undefined,
			mediaPath: result.media?.path,
			projectPath,
		});
	} catch (err) {
		const raw = err instanceof Error ? err.message : String(err);
		if (controller.signal.aborted) {
			if (state.items.some((i) => i.id === item.id)) patch(item.id, { status: "cancelled", progress: 0, message: undefined, speed: undefined, secondsLeft: undefined });
		} else {
			patch(item.id, { status: "failed", progress: 0, error: downloadErrorMessage(raw), message: undefined, speed: undefined, secondsLeft: undefined });
			finished(false, item.title, undefined, downloadErrorMessage(raw));
			// More downloads now would only make the site stricter: stop starting new ones until you resume.
			if (isRateLimited(raw)) {
				state = { ...state, paused: true, pauseReason: t("The site wants a break (too many downloads in a row). Wait a while (Bilibili: a few minutes, YouTube: up to an hour) and press Resume, or turn on browser logins in Settings → Downloads.") };
				changed(true);
			}
		}
	} finally {
		running.delete(item.id);
		pump();
		endOfRun();
	}
}

// ── Notifications: one per video (only the first few as system notifications), and a summary for a big run ──

const batch = createBatchTracker(3);

function finished(ok: boolean, title: string, action: StoredAction | undefined, error?: string): void {
	const { system } = batch.item(ok);
	const name = title.length > 60 ? `${title.slice(0, 59)}…` : title;
	if (ok) notifyFromMain({ tone: "success", kind: "downloads", title: t("Downloaded {name}", { name }), action, system });
	else notifyFromMain({ tone: "error", kind: "downloads", title: t("Download failed: {name}", { name }), detail: error, action: { kind: "view", view: "downloads" }, system });
}

/** When nothing is downloading and nothing more will start (the queue is empty, or paused), the run is over. */
function endOfRun(): void {
	if (!batch.count || running.size) return;
	if (!state.paused && state.items.some((i) => i.status === "waiting")) return;
	const summary = batch.finish();
	if (summary) notifyFromMain({ ...summary, kind: "downloads", detail: state.paused ? t("The queue is paused.") : undefined, action: { kind: "view", view: "downloads" } });
}

/** Downloads one video with yt-dlp. `skipped`: the archive says it's done already (media is then the earlier file, if found). */
async function fetchVideo(listed: DownloadItem, signal: AbortSignal): Promise<{ media: MediaItem | null; skipped: boolean; title: string }> {
	let item = listed;
	const ytdlp = requireTool("yt-dlp");
	const dir = itemDir(item.group);
	mkdirSync(dir, { recursive: true });
	const { args, env } = ytdlpCommon(loadSettings().cookiesBrowser);
	// "07 - Moving Birds [ps55secj7iU].mp4": in playlist order, readable, and unique by the site's id. The title is the
	// site's own (the listing may not have had one yet).
	const number = item.index ? numbered(item.index, item.groupSize, "x").slice(0, -1) : "";
	const name = `${number}%(title).80B [%(id)s].%(ext)s`;
	const base = [
		...args,
		"--no-playlist",
		"-f",
		formatFor(item.quality),
		"--download-archive",
		archiveFile(),
		...(isYouTube(item.url) ? ["--sleep-requests", "1"] : []),
		"-o",
		join(literal(dir), name),
		...PROGRESS_ARGS,
		"--progress-template",
		"download:KROMA_PROGRESS %(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.speed)s|%(progress.eta)s|%(progress.filename)s",
	];

	let file = "";
	let skipped = false;
	let parts = 1;
	const files: string[] = [];
	const onLine = (line: string) => {
		if (isArchiveSkip(line)) skipped = true;
		else if (line.startsWith("KROMA_TITLE ")) {
			const title = line.slice(12).trim();
			if (title && title !== "NA") {
				item = { ...item, title, untitled: undefined };
				patch(item.id, { title, untitled: undefined });
			}
		}
		else if (line.startsWith("KROMA_FILE ")) file = line.slice(11).trim();
		else if (line.startsWith("KROMA_FORMAT ")) parts = line.includes("+") ? 2 : 1;
		else if (line.startsWith("KROMA_PROGRESS ")) {
			const [pct, , , speed, eta, ...rest] = line.slice(15).split("|");
			const filename = rest.join("|").trim();
			// Subtitle files show progress too; only the video and its sound count.
			if (/\.(srt|vtt|json3|ass|ttml|srv\d|xml)(\.part)?$/i.test(filename)) return;
			if (!files.includes(filename)) files.push(filename);
			const value = Number.parseFloat(pct) / 100;
			if (!Number.isFinite(value)) return;
			const part = Math.min(files.indexOf(filename), parts - 1);
			// A video with separate sound downloads two files: the video is most of it.
			const overall = parts === 2 ? (part === 0 ? value * 0.9 : 0.9 + value * 0.1) : value;
			const bytes = Number.parseFloat(speed);
			const left = Number.parseFloat(eta);
			patch(item.id, { progress: Math.min(0.99, overall), message: undefined, speed: Number.isFinite(bytes) ? bytes : undefined, secondsLeft: Number.isFinite(left) ? left + (parts === 2 && part === 0 ? left * 0.1 : 0) : undefined });
		} else if (line.includes("Merging formats")) patch(item.id, { progress: -1, message: t("Joining video and audio…"), speed: undefined, secondsLeft: undefined });
		else if (line.includes("Writing video subtitles")) patch(item.id, { message: t("Getting the site's subtitles…") });
	};

	try {
		try {
			await run(ytdlp, [...base, ...(item.subtitles ? SUB_ARGS : []), item.url], { onLine, signal, env });
		} catch (err) {
			if (signal.aborted || !item.subtitles) throw err;
			const message = err instanceof Error ? err.message : String(err);
			// Subtitle requests sometimes get rate limited; the video matters more, so try once more without them.
			if (file || skipped || /unsupported url|generic information extractor|drm|private|sign in|not a bot/i.test(message)) throw err;
			patch(item.id, { message: t("Trying again without the site's subtitles…") });
			await run(ytdlp, [...base, item.url], { onLine, signal, env });
		}
	} catch (err) {
		if (signal.aborted) throw new Error("Cancelled");
		throw err;
	}

	if (skipped && !file) {
		const earlier = item.videoId ? findFile(dir, item.videoId) : null;
		return { media: earlier ? await describe(earlier, item) : null, skipped: true, title: item.title };
	}
	if (!file || !existsSync(file)) throw new Error(t("The download finished but no video file was found."));
	return { media: await describe(file, item), skipped: false, title: item.title };
}

/** The downloaded file as a media item, with the site's subtitles that came with it. */
async function describe(file: string, item: DownloadItem): Promise<MediaItem> {
	const media = await probe(file);
	const stem = basename(file, extname(file));
	const siteSubtitles: Record<string, string> = {};
	for (const name of readdirSync(dirname(file))) {
		if (!name.startsWith(`${stem}.`)) continue;
		const match = name.slice(stem.length).match(/^\.([A-Za-z-]+)\.srt$/);
		if (match) siteSubtitles[match[1]] = join(dirname(file), name);
	}
	media.name = item.title;
	media.sourceUrl = item.url;
	media.siteSubtitles = siteSubtitles;
	return media;
}

function findFile(dir: string, videoId: string): string | null {
	try {
		const name = readdirSync(dir).find((n) => n.includes(`[${videoId}].`) && /\.(mp4|mkv|webm|mov)$/i.test(n));
		return name ? join(dir, name) : null;
	} catch {
		return null;
	}
}

// ── Projects ──

/** Projects made from downloads, by the video's link: so a video never gets two. Read from disk once. */
let projectIndex: Map<string, string> | null = null;

function projects(): Map<string, string> {
	if (projectIndex) return projectIndex;
	projectIndex = new Map();
	const walk = (dir: string, depth: number) => {
		let names: string[] = [];
		try {
			names = readdirSync(dir);
		} catch {
			return;
		}
		for (const name of names) {
			const path = join(dir, name);
			if (name.endsWith(".kroma")) {
				try {
					const project = JSON.parse(readFileSync(path, "utf8")) as Project;
					for (const m of project.media ?? []) projectIndex!.set(m.sourceUrl ?? fileLink(m.path), path);
				} catch {
					// Not a project we can read.
				}
			} else if (depth > 0 && !name.includes(".")) walk(path, depth - 1);
		}
	};
	walk(projectsDir(), 1);
	return projectIndex;
}

function findProject(item: DownloadItem): string | undefined {
	const path = projects().get(item.url);
	return path && existsSync(path) ? path : undefined;
}

/** The video's project: the one made before, or a new one in projects/<playlist>/<NN - title>.kroma. */
function ensureProject(item: DownloadItem, media: MediaItem): string {
	const existing = findProject(item);
	if (existing) return existing;
	const dir = join(projectsDir(), safeName(item.group));
	mkdirSync(dir, { recursive: true });
	const stem = numbered(item.index, item.groupSize, item.title);
	let path = join(dir, `${stem}.kroma`);
	for (let n = 2; existsSync(path); n++) path = join(dir, `${stem} (${n}).kroma`);
	writeFileSync(path, JSON.stringify(buildProject(media, item.title, randomUUID), null, "\t"));
	projects().set(item.url, path);
	return path;
}

// ── Importing files you already have ──

const fileLink = (path: string) => pathToFileURL(path).href;

/** Asks for video files, or a folder of them, and reads each (length, size, subtitles next to it). */
export async function pickImport(window: BrowserWindow, kind: "files" | "folder"): Promise<ImportPick | null> {
	const res = await dialog.showOpenDialog(window, {
		properties: kind === "folder" ? ["openDirectory"] : ["openFile", "multiSelections"],
		filters: kind === "folder" ? undefined : [{ name: t("Video"), extensions: VIDEO_EXTENSIONS }],
	});
	if (res.canceled || !res.filePaths.length) return null;
	return scanImport(kind === "folder" ? res.filePaths[0] : null, kind === "folder" ? [] : res.filePaths);
}

/** The video files directly in `folder` (not its subfolders), or the given files, in natural order ("EP2" before "EP10"). */
export async function scanImport(folder: string | null, files: string[]): Promise<ImportPick> {
	const paths = folder ? readdirSync(folder).filter((n) => isVideoFile(n) && !n.startsWith(".")).map((n) => join(folder, n)) : files;
	paths.sort((a, b) => naturalCompare(basename(a), basename(b)));
	const listings = new Map<string, string[]>();
	const namesIn = (dir: string) => {
		if (!listings.has(dir)) listings.set(dir, readdirSync(dir));
		return listings.get(dir)!;
	};
	const read = async (path: string): Promise<ImportFile> => {
		const name = basename(path);
		const size = statSync(path).size;
		try {
			const media = await probe(path);
			if (!media.width) return { path, name, size, error: t("No video in this file (sound only).") };
			const subs = sidecarSubtitles(name, namesIn(dirname(path)));
			media.name = name.replace(/\.[^.]+$/, "");
			media.siteSubtitles = Object.fromEntries(Object.entries(subs).map(([lang, file]) => [lang, join(dirname(path), file)]));
			return { path, name, size, media };
		} catch {
			return { path, name, size, error: t("Kroma can't read this file (damaged, or not a video).") };
		}
	};
	return { group: folder ? basename(folder) : "Imported files", files: await mapLimit(paths, 4, read) };
}

/**
 * A project for each file, listed in the queue as done. Files stay where they are. A file that already has a project
 * gets that one back. Returns how many were added to the list.
 */
export function importProjects(files: { media: MediaItem; index: number }[], group: string, groupSize: number): number {
	const items: DownloadItem[] = files.map(({ media, index }) => {
		const item: DownloadItem = {
			id: randomUUID(),
			url: fileLink(media.path),
			title: media.name,
			group: group || "Imported files",
			index,
			groupSize,
			duration: media.duration,
			imported: true,
			status: "done",
			progress: 1,
			quality: state.options.quality,
			subtitles: false,
			makeProjects: true,
			added: Date.now(),
			mediaPath: media.path,
		};
		return { ...item, projectPath: ensureProject(item, media) };
	});
	const urls = new Set(items.map((i) => i.url));
	state = { ...state, items: [...state.items.filter((i) => !urls.has(i.url)), ...items] };
	changed(true);
	return items.length;
}

/** Stops every download (Kroma is quitting): they're saved as waiting, to resume next time. */
export function stopDownloads(): void {
	clearTimeout(pumpTimer);
	const ids = [...running.keys()];
	for (const c of running.values()) c.abort();
	state = { ...state, items: state.items.map((i) => (ids.includes(i.id) ? { ...i, status: "waiting", progress: 0, speed: undefined, secondsLeft: undefined, message: undefined } : i)) };
	clearTimeout(flushTimer);
	try {
		mkdirSync(centerDir(), { recursive: true });
		writeFileSync(centerFile(), JSON.stringify(state, null, "\t"));
	} catch {
		// Nothing more to do while quitting.
	}
}
