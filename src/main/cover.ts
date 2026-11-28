import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PostFormat } from "@shared/batch";
import { LIBRARY_DIR } from "./download";
import { batchExportPath } from "./batch";
import { loadSettings } from "./settings";
import { mapLimit, requireTool } from "./tools";

// Episode covers: a full-size frame for the cover, a good moment picked automatically, and where a cover is saved
// (next to the episode's exports: "05 - Title (16x9) cover.jpg").

function ffmpegOut(args: string[], signal?: AbortSignal): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const child = spawn(requireTool("ffmpeg"), args, { stdio: ["ignore", "pipe", "ignore"] });
		const chunks: Buffer[] = [];
		const stop = () => child.kill();
		signal?.addEventListener("abort", stop, { once: true });
		child.stdout.on("data", (c: Buffer) => chunks.push(c));
		child.on("error", reject);
		child.on("close", () => {
			signal?.removeEventListener("abort", stop);
			resolve(Buffer.concat(chunks));
		});
	});
}

/** One frame at `seconds` as a JPEG (up to 1920 px wide), for drawing the cover on. */
export async function coverFrame(path: string, seconds: number): Promise<Uint8Array> {
	const jpg = await ffmpegOut(["-v", "error", "-ss", Math.max(0, seconds).toFixed(2), "-i", path, "-frames:v", "1", "-vf", "scale='min(1920,iw)':-2", "-q:v", "2", "-f", "image2", "-c:v", "mjpeg", "-"]);
	if (!jpg.length) throw new Error("Couldn't read a frame of the video there.");
	return new Uint8Array(jpg);
}

const W = 160;

/**
 * A good moment for a cover: of 16 frames across the video (not the opening or the credits), the sharpest one that's
 * neither dark nor washed out, judged on the picture above the subtitle strip.
 */
export async function pickCoverTime(path: string, duration: number, signal?: AbortSignal): Promise<number> {
	const times = Array.from({ length: 16 }, (_, i) => duration * (0.12 + (0.72 * i) / 15));
	const scores = await mapLimit(times, 4, async (t) => {
		const data = await ffmpegOut(["-v", "error", "-ss", t.toFixed(2), "-i", path, "-frames:v", "1", "-vf", `scale=${W}:-2,format=gray`, "-f", "rawvideo", "-"], signal).catch(() => Buffer.alloc(0));
		const H = Math.floor(data.length / W);
		if (H < 16) return -1;
		const rows = Math.floor(H * 0.75);
		let edges = 0;
		let sum = 0;
		for (let y = 1; y < rows; y++) {
			for (let x = 1; x < W; x++) {
				const v = data[y * W + x];
				sum += v;
				edges += Math.abs(v - data[y * W + x - 1]) + Math.abs(v - data[(y - 1) * W + x]);
			}
		}
		const mean = sum / (rows * W);
		// Mid brightness is best; very dark or very bright frames lose.
		const light = 1 - Math.min(1, Math.abs(mean - 120) / 110);
		// Subtitle text along the bottom (rows dense with sharp vertical edges) would sit under the cover's title.
		let textRows = 0;
		for (let y = Math.floor(H * 0.72); y < H; y++) {
			let e = 0;
			for (let x = 1; x < W; x++) if (Math.abs(data[y * W + x] - data[y * W + x - 1]) >= 48) e++;
			if (e / W >= 0.05) textRows++;
		}
		const subtitles = textRows >= H * 0.03 ? 0.35 : 1;
		return (edges / (rows * W)) * (0.3 + light) * subtitles;
	});
	let best = 0;
	for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
	return times[best];
}

/** Where a cover is saved: next to the episode's export ("… (16x9) cover.jpg"), or in the export folder for an unsaved project. */
export function coverPath(projectPath: string | null, name: string, format: PostFormat): string {
	if (projectPath) return batchExportPath(projectPath, format).replace(/\.mp4$/i, " cover.jpg");
	const dir = loadSettings().exportDir || join(LIBRARY_DIR, "Exports");
	const safe = name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "Cover";
	return join(dir, `${safe} (${format.replace(":", "x")}) cover.jpg`);
}

export function saveCover(projectPath: string | null, name: string, format: PostFormat, jpg: Uint8Array): string {
	const file = coverPath(projectPath, name, format);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, jpg);
	return file;
}
