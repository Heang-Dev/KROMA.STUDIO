import { mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DownloadResult } from "@shared/types";
import { probe } from "./media";
import { requireTool, run } from "./tools";

export const LIBRARY_DIR = join(homedir(), "Movies", "Kroma Studio");

// Chinese first (Bilibili's AI subtitles are "ai-zh"), then English as a fallback source.
const SUB_LANGS = "zh-Hans,zh-Hant,zh,zh-CN,zh-TW,ai-zh,en";

export async function downloadLink(
	url: string,
	cookiesBrowser: string,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
): Promise<DownloadResult> {
	const ytdlp = requireTool("yt-dlp");
	const dir = join(LIBRARY_DIR, "downloads", String(Date.now()));
	mkdirSync(dir, { recursive: true });

	const baseArgs = [
		"--no-playlist",
		"--newline",
		"--no-simulate",
		"-f",
		"bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b",
		"--merge-output-format",
		"mp4",
		"-o",
		join(dir, "%(id)s.%(ext)s"),
		"--progress-template",
		"download:KROMA_PROGRESS %(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
		"--print",
		"before_dl:KROMA_TITLE %(title)s",
		"--print",
		"after_move:KROMA_FILE %(filepath)s",
		// Your browser's logins unlock 1080p on Bilibili and videos that need an account.
		...(cookiesBrowser ? ["--cookies-from-browser", cookiesBrowser] : []),
	];
	const subArgs = ["--write-subs", "--write-auto-subs", "--sub-langs", SUB_LANGS, "--convert-subs", "srt"];

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
		await run(ytdlp, [...baseArgs, ...subArgs, url], { onLine, signal });
	} catch (err) {
		if (signal?.aborted) throw err;
		// Subtitle requests sometimes get rate limited; the video matters more, so retry without them.
		if (!file) {
			onProgress(-1, "Retrying without the site's subtitles…");
			await run(ytdlp, [...baseArgs, url], { onLine, signal });
		}
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
