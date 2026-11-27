// The Download Center's pure logic (no Electron, no files): reading pasted links, yt-dlp's listings, picking what
// downloads next, and building a project for each downloaded video. The main process (src/main/downloads.ts) does the
// rest.

import { DEFAULT_STYLE, type MediaItem, type Project } from "./types";
import { extractShareTitle, normalizeLink } from "./links";

export type DownloadStatus = "waiting" | "downloading" | "done" | "failed" | "skipped" | "cancelled";
export type DownloadQuality = "1080" | "720" | "480";

export interface DownloadOptions {
	quality: DownloadQuality;
	/** The site's own subtitles, when it has them. */
	subtitles: boolean;
	/** A Kroma project (.kroma) for each video. */
	makeProjects: boolean;
	/** Videos downloading at the same time (1–3). */
	concurrency: 1 | 2 | 3;
}

export const DEFAULT_DOWNLOAD_OPTIONS: DownloadOptions = { quality: "1080", subtitles: true, makeProjects: true, concurrency: 2 };

export interface DownloadItem {
	id: string;
	url: string;
	/** The site's id for the video (YouTube's 11 characters), when the listing gave one. */
	videoId?: string;
	title: string;
	/** A file you already had (Import files…): `url` is its file:// link, nothing was downloaded. */
	imported?: boolean;
	/** `title` is a placeholder (the link) until the download reads the real one. */
	untitled?: boolean;
	/** The playlist or channel it came from, or "Single videos". */
	group: string;
	/** Position in its playlist (1, 2, …); 0 for single videos. */
	index: number;
	/** How many videos the group has, for numbering ("01", "001"). */
	groupSize?: number;
	duration?: number;
	status: DownloadStatus;
	/** 0..1, or -1 while yt-dlp is reading the page or joining the files. */
	progress: number;
	/** Bytes per second. */
	speed?: number;
	secondsLeft?: number;
	/** What it's doing, in a few words ("Joining video and audio…"). */
	message?: string;
	error?: string;
	mediaPath?: string;
	projectPath?: string;
	/** Quality and subtitles chosen when it was added. */
	quality: DownloadQuality;
	subtitles: boolean;
	makeProjects: boolean;
	added: number;
}

export interface DownloadCenterState {
	items: DownloadItem[];
	options: DownloadOptions;
	/** Paused: nothing new starts (running downloads finish). Set when YouTube asks to confirm you're not a bot. */
	paused: boolean;
	pauseReason?: string;
}

export type SourceKind = "video" | "playlist" | "channel";

export interface ListedVideo {
	url: string;
	videoId?: string;
	title: string;
	duration?: number;
	/** Position in the playlist, 1-based. */
	index: number;
	/** The listing had no title (Bilibili channel pages): `title` is the link until filled in (see titleFetch). */
	untitled?: boolean;
}

export interface ListedSource {
	/** The link as pasted (normalized). */
	url: string;
	title: string;
	kind: SourceKind;
	/** Videos in the whole playlist or channel, when the site says. */
	count?: number;
	items: ListedVideo[];
	/** The site gave no real name (a Bilibili channel lists as its number): the uploader's name fills it in later. */
	untitled?: boolean;
	/** More videos can be listed (the listing stopped at its page size). */
	hasMore: boolean;
	error?: string;
}

/** Every http(s) link in pasted text, in order and without repeats (one per line, or inside share messages). */
export function splitLinks(text: string): string[] {
	return splitShares(text).map((s) => s.url);
}

/**
 * The links in pasted text, each with the title its share message gave, if any
 * ("【第1集 …】 https://b23.tv/x", "复制打开抖音，看看【…】 https://v.douyin.com/…/").
 */
export function splitShares(text: string): { url: string; shareTitle?: string }[] {
	const seen = new Set<string>();
	const out: { url: string; shareTitle?: string }[] = [];
	for (const line of text.split(/\r?\n/)) {
		const found = line.match(/https?:\/\/[^\s"'<>，。！）)]+/gi) ?? [];
		for (const raw of found) {
			const url = sourceLink(normalizeLink(raw));
			if (seen.has(url)) continue;
			seen.add(url);
			const shareTitle = found.length === 1 ? (extractShareTitle(line) ?? undefined) : undefined;
			out.push(shareTitle ? { url, shareTitle } : { url });
		}
	}
	return out;
}

/**
 * A YouTube channel's home page lists its tabs (Videos, Shorts, Live), not videos: point it at the Videos tab.
 * youtube.com/@name, /channel/UC…, /c/name and /user/name all work.
 */
export function sourceLink(url: string): string {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return url;
	}
	if (!/(^|\.)youtube\.com$/.test(u.hostname)) return url;
	const parts = u.pathname.split("/").filter(Boolean);
	const channel = (parts[0]?.startsWith("@") && parts.length === 1) || (["channel", "c", "user"].includes(parts[0] ?? "") && parts.length === 2);
	if (channel) {
		u.pathname = `/${parts.join("/")}/videos`;
		return u.toString();
	}
	return url;
}

interface FlatEntry {
	_type?: string;
	id?: string;
	title?: string;
	url?: string;
	webpage_url?: string;
	duration?: number | null;
	ie_key?: string;
}

interface FlatInfo extends FlatEntry {
	entries?: (FlatEntry | null)[];
	playlist_count?: number;
	channel?: string;
	uploader?: string;
	extractor?: string;
	webpage_url?: string;
}

/** A link for one entry of a flat listing (YouTube gives bare ids for some). */
function entryUrl(entry: FlatEntry): string | null {
	const url = entry.url || entry.webpage_url;
	if (url && /^https?:\/\//.test(url)) return url;
	if (entry.id && (entry.ie_key === "Youtube" || /^[\w-]{11}$/.test(entry.id))) return `https://www.youtube.com/watch?v=${entry.id}`;
	return null;
}

/**
 * Reads `yt-dlp --flat-playlist -J` output: a single video, a playlist or a channel. `start` is the 1-based position
 * of the first entry (for "Load more"), `pageSize` the most entries asked for.
 */
export function parseListing(json: string, url: string, start = 1, pageSize = Number.POSITIVE_INFINITY): ListedSource {
	const info = JSON.parse(json) as FlatInfo;
	if (info._type !== "playlist" || !Array.isArray(info.entries)) {
		const link = info.webpage_url || url;
		return { url, title: info.title || link, kind: "video", count: 1, items: [{ url: link, videoId: info.id, title: info.title || link, duration: num(info.duration), index: 1 }], hasMore: false };
	}
	const entries = info.entries.filter((e): e is FlatEntry => Boolean(e));
	const items: ListedVideo[] = [];
	entries.forEach((e, i) => {
		// Tabs and nested playlists (a channel home page) aren't videos.
		if (e._type === "playlist" || /\/(playlist|videos|shorts|streams)(\?|$)/.test(e.url ?? "")) return;
		const link = entryUrl(e);
		if (link) items.push({ url: link, videoId: e.id || videoIdOf(link), title: e.title || videoIdOf(link) || link, duration: num(e.duration), index: start + i, ...(e.title ? {} : { untitled: true }) });
	});
	const channel = /space\.bilibili\.com\/\d+\/(video|upload)/.test(url) || /\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)(\/(videos|shorts|streams))?\/?$/.test(new URL(url, "https://x").pathname) || (info.id?.startsWith("UC") && info.extractor === "youtube:tab");
	const title = (info.title || info.channel || info.uploader || url).replace(/\s+-\s+(Videos|Shorts|Live)$/, "");
	const count = num(info.playlist_count);
	const hasMore = Number.isFinite(pageSize) && entries.length >= pageSize && (count === undefined || start - 1 + entries.length < count);
	const untitled = /^\d+$/.test(title) || title === url;
	return { url, title: untitled && channel ? `Channel ${title}` : title, kind: channel ? "channel" : "playlist", count, items, hasMore, ...(untitled ? { untitled } : {}) };
}

/** The site's id in a link: a Bilibili BV id (with its part, "BV1xx_p2"), or YouTube's v= id. */
export function videoIdOf(url: string): string | undefined {
	const bv = url.match(/\/video\/(BV[0-9A-Za-z]{10}|av\d+)/);
	if (bv) {
		const part = url.match(/[?&]p=(\d+)/);
		return part && part[1] !== "1" ? `${bv[1]}_p${part[1]}` : bv[1];
	}
	return url.match(/[?&]v=([\w-]{11})/)?.[1];
}

/** What `--print` asks for when filling in titles (see parseTitleLines). */
export const TITLE_PRINT = "KROMA_TITLE %(original_url)s|%(id)s|%(duration)s|%(uploader)s|%(title)s";

export interface FilledTitle {
	url: string;
	id: string;
	duration?: number;
	uploader?: string;
	title: string;
}

/** yt-dlp's TITLE_PRINT lines, for filling in titles. */
export function parseTitleLines(output: string): FilledTitle[] {
	return output
		.split("\n")
		.filter((line) => line.startsWith("KROMA_TITLE "))
		.map((line) => line.slice(12).trim().split("|"))
		.filter((parts) => parts.length >= 5)
		.map(([url, id, duration, uploader, ...title]) => ({ url, id, duration: num(Number.parseFloat(duration)), uploader: uploader && uploader !== "NA" ? uploader : undefined, title: title.join("|").trim() }))
		.filter((r) => r.title && r.title !== "NA");
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);

/**
 * The items to start now: waiting ones, oldest first, up to `concurrency` downloading at once. Nothing starts while
 * paused.
 */
export function nextToStart(state: Pick<DownloadCenterState, "items" | "paused">, concurrency: number): DownloadItem[] {
	if (state.paused) return [];
	const running = state.items.filter((i) => i.status === "downloading").length;
	const free = Math.max(0, Math.min(3, concurrency) - running);
	return state.items.filter((i) => i.status === "waiting").slice(0, free);
}

/** yt-dlp skipped the video because the download archive has it ("… has already been recorded in the archive"). */
export function isArchiveSkip(output: string): boolean {
	return /has already been recorded in (the )?archive/i.test(output);
}

/** The site wants a break: YouTube's "Sign in to confirm you're not a bot", Bilibili's "blocked by server (412)". */
export function isRateLimited(output: string): boolean {
	return /confirm you.?re not a bot|blocked by server \(412\)|rejected by server \(352\)|http error 412|http error 429|too many requests/i.test(output);
}

/** A name that works as a file or folder name on every system (and isn't too long). */
export function safeName(name: string, max = 80): string {
	const clean = name
		.replace(/[/\\:*?"<>|\u0000-\u001f]+/g, " ")
		.replace(/\s+/g, " ")
		.replace(/^[.\s]+|[.\s]+$/g, "")
		.trim();
	return (clean.slice(0, max).trim() || "Untitled").replace(/[.\s]+$/, "");
}

/** "07" in a playlist of 12, "007" in one of 250; no number for single videos. */
export function numbered(index: number, groupSize: number | undefined, title: string): string {
	if (!index) return safeName(title);
	const width = Math.max(2, String(Math.max(groupSize ?? 0, index)).length);
	return `${String(index).padStart(width, "0")} - ${safeName(title)}`;
}

/** A new project with the video on the timeline, named after it (the same shape the editor saves). */
export function buildProject(media: MediaItem, title: string, id: () => string): Project {
	const portrait = media.height > media.width;
	return {
		version: 1,
		name: title.slice(0, 80) || "Untitled",
		aspect: portrait ? "9:16" : "16:9",
		fit: "blur",
		media: [{ ...media, name: title || media.name }],
		clips: [{ id: id(), mediaId: media.id, in: 0, out: media.duration }],
		cues: [],
		style: { ...DEFAULT_STYLE },
		context: "",
	};
}

/** "12 done · 2 downloading · 30 waiting · 1 failed" */
export function queueSummary(items: DownloadItem[]): string {
	const count = (s: DownloadStatus) => items.filter((i) => i.status === s).length;
	const parts: [number, string][] = [
		[count("done") + count("skipped"), "done"],
		[count("downloading"), "downloading"],
		[count("waiting"), "waiting"],
		[count("failed"), "failed"],
		[count("cancelled"), "cancelled"],
	];
	return parts
		.filter(([n]) => n > 0)
		.map(([n, label]) => `${n} ${label}`)
		.join(" · ");
}

/** Sites people ask about, with what works. Shown above the searchable list of every site yt-dlp knows. */
/** `partial`: free videos download, paid / VIP ones are locked (DRM) — shown as "Free only", not as a failure. */
export const PLATFORMS: { name: string; support: "yes" | "partial"; note: string; url: string; region: "chinese" | "global" }[] = [
	{ name: "Bilibili", support: "yes", note: "Videos, multi-part videos, collections (合集), series and channel uploads. 1080p and member videos need browser logins (Settings → Downloads)", url: "https://www.bilibili.com", region: "chinese" },
	{ name: "Bilibili paid / VIP 番剧", support: "partial", note: "Paid and VIP episodes are locked; free seasons may work", url: "https://www.bilibili.com/anime/", region: "chinese" },
	{ name: "Douyin", support: "yes", note: "Single videos and share messages. May need browser logins", url: "https://www.douyin.com", region: "chinese" },
	{ name: "Ixigua / Toutiao", support: "yes", note: "Videos", url: "https://www.ixigua.com", region: "chinese" },
	{ name: "Xiaohongshu", support: "yes", note: "Video notes", url: "https://www.xiaohongshu.com", region: "chinese" },
	{ name: "Weibo", support: "yes", note: "Videos and a user's videos", url: "https://weibo.com", region: "chinese" },
	{ name: "AcFun", support: "yes", note: "Videos and bangumi", url: "https://www.acfun.cn", region: "chinese" },
	{ name: "Youku", support: "partial", note: "Free episodes only; VIP episodes are locked (DRM)", url: "https://www.youku.com", region: "chinese" },
	{ name: "iQiyi / iq.com", support: "partial", note: "Free episodes only; VIP episodes are locked (DRM)", url: "https://www.iq.com", region: "chinese" },
	{ name: "Tencent Video / WeTV", support: "partial", note: "Free episodes only; VIP episodes are locked (DRM)", url: "https://wetv.vip", region: "chinese" },
	{ name: "Mango TV", support: "partial", note: "Free episodes only; VIP episodes are locked (DRM)", url: "https://www.mgtv.com", region: "chinese" },
	{ name: "YouTube", support: "yes", note: "Videos, Shorts, playlists and whole channels", url: "https://www.youtube.com", region: "global" },
	{ name: "TikTok", support: "yes", note: "Videos and profile pages", url: "https://www.tiktok.com", region: "global" },
	{ name: "Facebook", support: "yes", note: "Videos, posts and reels", url: "https://www.facebook.com/watch", region: "global" },
	{ name: "Instagram", support: "yes", note: "Posts and reels (some need browser logins)", url: "https://www.instagram.com", region: "global" },
	{ name: "X (Twitter)", support: "yes", note: "Videos in posts", url: "https://x.com", region: "global" },
	{ name: "Vimeo", support: "yes", note: "Videos and showcases", url: "https://vimeo.com", region: "global" },
	{ name: "Dailymotion", support: "yes", note: "Videos and playlists", url: "https://www.dailymotion.com", region: "global" },
];

/** `yt-dlp --list-extractors` → site names (sub-extractors like "youtube:tab" folded into "youtube"), broken ones marked. */
export function parseExtractors(output: string): { name: string; broken: boolean }[] {
	// By lower-case name ("BiliBili", "bilibili" and "Bilibili" are one site), shown as first written.
	const sites = new Map<string, { name: string; broken: boolean }>();
	for (const line of output.split("\n")) {
		const text = line.trim();
		if (!text) continue;
		const broken = text.includes("(CURRENTLY BROKEN)");
		const name = text.replace(/\s*\(CURRENTLY BROKEN\)\s*$/, "").split(":")[0];
		if (!name || name === "generic") continue;
		// A site works when any of its extractors works.
		const key = name.toLowerCase();
		const seen = sites.get(key);
		sites.set(key, { name: seen?.name ?? name, broken: (seen?.broken ?? true) && broken });
	}
	return [...sites.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

// ── Importing video files you already have ──

export const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm", "m4v", "avi", "flv"];

/** Natural order for file names: "EP2" before "EP10", "第2集" before "第10集". */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
export const naturalCompare = (a: string, b: string): number => collator.compare(a, b);

export const isVideoFile = (name: string): boolean => VIDEO_EXTENSIONS.includes(name.split(".").pop()?.toLowerCase() ?? "");

/**
 * Subtitle files next to a video, by language: "EP1.srt" (language unknown: "und"), "EP1.zh.srt", "EP1.en.srt".
 * Returns the matching file names.
 */
export function sidecarSubtitles(video: string, names: string[]): Record<string, string> {
	const stem = video.replace(/\.[^.]+$/, "");
	const subs: Record<string, string> = {};
	for (const name of names) {
		if (!name.toLowerCase().endsWith(".srt") || !name.startsWith(stem)) continue;
		const middle = name.slice(stem.length, -4);
		if (middle === "") subs.und = name;
		else {
			const lang = middle.match(/^\.([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,4})?)$/)?.[1];
			if (lang) subs[lang.replace("_", "-")] = name;
		}
	}
	return subs;
}

/** A video file picked for import: probed (`media`), or why it can't be used. */
export interface ImportFile {
	path: string;
	name: string;
	size: number;
	media?: MediaItem;
	error?: string;
}

export interface ImportPick {
	/** The folder's name, or "Imported files". */
	group: string;
	files: ImportFile[];
}
