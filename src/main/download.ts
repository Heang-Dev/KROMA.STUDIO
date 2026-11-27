import { app } from "electron";
import { mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { downloadErrorMessage, normalizeLink } from "@shared/links";
import type { DownloadResult } from "@shared/types";
import { probe } from "./media";
import { findTool, requireTool, run } from "./tools";

// The Movies folder on a Mac, Videos on Windows and Linux.
export const LIBRARY_DIR = join(videosDir(), "Kroma Studio");

function videosDir(): string {
	try {
		return app.getPath("videos");
	} catch {
		return join(homedir(), process.platform === "darwin" ? "Movies" : "Videos");
	}
}

// Chinese first (Bilibili's AI subtitles are "ai-zh"), then English as a fallback source.
const SUB_LANGS = "zh-Hans,zh-Hant,zh,zh-CN,zh-TW,ai-zh,en";
export const SUB_ARGS = ["--write-subs", "--write-auto-subs", "--sub-langs", SUB_LANGS, "--convert-subs", "srt"];

/** Best video up to this height, as MP4 when the site has it (so it plays everywhere without converting). */
export const formatFor = (height: "1080" | "720" | "480") => `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/bv*[height<=${height}]+ba/b[height<=${height}]/bv*+ba/b`;

/** Progress, title and the final file, in lines Kroma reads (see readProgress). */
export const PROGRESS_ARGS = [
	// --print makes yt-dlp quiet, which hides the progress lines too unless asked for.
	"--progress",
	"--newline",
	"--no-simulate",
	"--merge-output-format",
	"mp4",
	"--progress-template",
	"download:KROMA_PROGRESS %(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.speed)s|%(progress.eta)s",
	"--print",
	"before_dl:KROMA_TITLE %(title)s",
	"--print",
	"before_dl:KROMA_FORMAT %(format_id)s",
	"--print",
	"after_move:KROMA_FILE %(filepath)s",
];

/**
 * What every yt-dlp run needs: Kroma's ffmpeg (bundled on Windows and Linux), your browser's logins when chosen, and
 * a JavaScript runtime for YouTube. YouTube's pages need JavaScript solved (without it some formats go missing);
 * Kroma's own Electron runs as Node for that (ELECTRON_RUN_AS_NODE), so nothing else has to be installed.
 */
export function ytdlpCommon(cookiesBrowser: string): { args: string[]; env: Record<string, string> } {
	const ffmpeg = findTool("ffmpeg");
	return {
		args: [
			...(ffmpeg ? ["--ffmpeg-location", ffmpeg] : []),
			// Only this one: yt-dlp would otherwise pick Deno when it happens to be installed.
			"--no-js-runtimes",
			"--js-runtimes",
			`node:${process.execPath}`,
			// Your browser's logins unlock 1080p on Bilibili and videos that need an account.
			...(cookiesBrowser ? ["--cookies-from-browser", cookiesBrowser] : []),
		],
		env: { ELECTRON_RUN_AS_NODE: "1" },
	};
}

export const defaultDownloadDir = () => join(LIBRARY_DIR, "downloads");

export async function downloadLink(
	pasted: string,
	cookiesBrowser: string,
	downloadDir: string,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
): Promise<DownloadResult> {
	const ytdlp = requireTool("yt-dlp");
	const url = normalizeLink(pasted);
	const dir = join(downloadDir || defaultDownloadDir(), String(Date.now()));
	mkdirSync(dir, { recursive: true });

	const { args, env } = ytdlpCommon(cookiesBrowser);
	const baseArgs = [
		...args,
		"--no-playlist",
		"-f",
		formatFor("1080"),
		"-o",
		join(dir, "%(id)s.%(ext)s"),
		...PROGRESS_ARGS,
	];
	const subArgs = SUB_ARGS;

	let title = "";
	let file = "";
	const onLine = (line: string) => {
		if (line.startsWith("KROMA_TITLE ")) title = line.slice(12).trim();
		else if (line.startsWith("KROMA_FILE ")) file = line.slice(11).trim();
		else if (line.startsWith("KROMA_PROGRESS ")) {
			const [pct, speed, eta] = line.slice(15).split("|").map((s) => s.trim());
			const value = Number.parseFloat(pct) / 100;
			if (Number.isFinite(value)) onProgress(Math.min(0.99, value), `Downloading ${pct} · ${speed} · ${eta} left`);
		} else if (line.includes("Merging formats")) onProgress(0.99, "Joining video and audio…");
		else if (line.includes("Writing video subtitles")) onProgress(-1, "Getting the site's subtitles…");
	};

	onProgress(-1, "Reading the link…");
	try {
		try {
			await run(ytdlp, [...baseArgs, ...subArgs, url], { onLine, signal, env });
		} catch (err) {
			if (signal?.aborted) throw err;
			const message = err instanceof Error ? err.message : String(err);
			// Subtitle requests sometimes get rate limited; the video matters more, so retry without them.
			// A link yt-dlp can't read at all fails the same way twice, so don't retry those.
			if (file || /unsupported url|generic information extractor|drm|private|sign in/i.test(message)) throw err;
			onProgress(-1, "Retrying without the site's subtitles…");
			await run(ytdlp, [...baseArgs, url], { onLine, signal, env });
		}
	} catch (err) {
		if (signal?.aborted) throw err;
		throw new Error(downloadErrorMessage(err instanceof Error ? err.message : String(err)));
	}
	if (!file) throw new Error("The download finished but no video file was found.");

	const media = await probe(file);
	const siteSubtitles: Record<string, string> = {};
	for (const name of readdirSync(dir)) {
		const match = name.match(/\.([A-Za-z-]+)\.srt$/);
		if (match) siteSubtitles[match[1]] = join(dir, name);
	}
	media.name = title || media.name;
	media.sourceUrl = url;
	media.siteSubtitles = siteSubtitles;
	return { media, title: title || media.name };
}
