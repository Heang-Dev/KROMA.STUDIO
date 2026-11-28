import { spawn } from "node:child_process";
import { type FoundSubtitles, type GreyFrame, findBurnedSubtitles } from "@shared/hardsubs";
import { mapLimit, requireTool } from "./tools";

// Finds burned-in subtitles in a video: grabs small grey frames across it with ffmpeg and looks for the strip where
// text keeps appearing (shared/hardsubs). Takes a few seconds; nothing is written to disk.

const WIDTH = 320;
const SAMPLES = 30;

/** One small grey frame at `seconds`, or null if ffmpeg couldn't read one there. */
function grab(ffmpeg: string, path: string, seconds: number, signal?: AbortSignal): Promise<GreyFrame | null> {
	return new Promise((resolve) => {
		const args = ["-v", "error", "-ss", seconds.toFixed(2), "-i", path, "-frames:v", "1", "-vf", `scale=${WIDTH}:-2,format=gray`, "-f", "rawvideo", "-"];
		const child = spawn(ffmpeg, args, { stdio: ["ignore", "pipe", "ignore"] });
		const chunks: Buffer[] = [];
		const stop = () => child.kill();
		signal?.addEventListener("abort", stop, { once: true });
		child.stdout.on("data", (c: Buffer) => chunks.push(c));
		child.on("error", () => resolve(null));
		child.on("close", () => {
			signal?.removeEventListener("abort", stop);
			const data = new Uint8Array(Buffer.concat(chunks));
			const height = Math.floor(data.length / WIDTH);
			resolve(height >= 16 ? { width: WIDTH, height, data: data.subarray(0, WIDTH * height) } : null);
		});
	});
}

/** The burned-in subtitle strip of a video (fractions of its picture), or null when none is found. */
export async function detectBurnedSubtitles(path: string, duration: number, onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<FoundSubtitles | null> {
	const ffmpeg = requireTool("ffmpeg");
	// Spread across the video, skipping the opening and the credits.
	const times = Array.from({ length: SAMPLES }, (_, i) => duration * (0.08 + (0.84 * i) / (SAMPLES - 1)));
	let done = 0;
	const frames = await mapLimit(times, 4, async (t) => {
		const f = await grab(ffmpeg, path, t, signal);
		onProgress?.(++done / times.length);
		return f;
	});
	if (signal?.aborted) throw new Error("Cancelled");
	return findBurnedSubtitles(frames.filter((f): f is GreyFrame => f !== null));
}
