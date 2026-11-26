import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MediaVisuals } from "@shared/types";
import { LIBRARY_DIR } from "./download";
import { requireTool, run, runBuffer } from "./tools";

// Timeline pictures (a filmstrip of small frames) and the audio waveform, made once per video with ffmpeg and cached.
// Only keyframes are decoded for the filmstrip, so even a 2-hour movie takes seconds.

const MAX_THUMBS = 240;
const THUMB_HEIGHT = 96;
export const PEAKS_PER_SECOND = 20;
const SAMPLE_RATE = 1000;

const inFlight = new Map<string, Promise<MediaVisuals>>();

export function mediaVisuals(path: string, duration: number): Promise<MediaVisuals> {
	const stat = statSync(path);
	const key = createHash("sha1").update(`${path}|${stat.size}|${stat.mtimeMs}`).digest("hex").slice(0, 16);
	const existing = inFlight.get(key);
	if (existing) return existing;
	const job = build(path, duration, join(LIBRARY_DIR, "cache", "visuals", key)).finally(() => inFlight.delete(key));
	inFlight.set(key, job);
	return job;
}

async function build(path: string, duration: number, dir: string): Promise<MediaVisuals> {
	const meta = join(dir, "visuals.json");
	if (existsSync(meta)) {
		const cached = JSON.parse(readFileSync(meta, "utf8")) as MediaVisuals;
		if (cached.thumbs.files.every((f) => existsSync(f))) return { ...cached, peaks: [...readFileSync(join(dir, "peaks.bin"))] };
	}
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(join(dir, "thumbs"), { recursive: true });
	const ffmpeg = requireTool("ffmpeg");
	const interval = Math.max(1, duration / MAX_THUMBS);

	const [peaks] = await Promise.all([
		waveform(ffmpeg, path, duration).catch(() => new Uint8Array(0)),
		run(ffmpeg, ["-v", "error", "-skip_frame", "nokey", "-i", path, "-an", "-vf", `fps=1/${interval.toFixed(3)},scale=-2:${THUMB_HEIGHT}`, "-q:v", "6", join(dir, "thumbs", "%04d.jpg")]).catch(() => ""),
	]);

	const files = readdirSync(join(dir, "thumbs"))
		.filter((f) => f.endsWith(".jpg"))
		.sort()
		.map((f) => join(dir, "thumbs", f));
	writeFileSync(join(dir, "peaks.bin"), peaks);
	const visuals: MediaVisuals = { thumbs: { interval, files }, peaksPerSecond: PEAKS_PER_SECOND, peaks: [] };
	writeFileSync(meta, JSON.stringify(visuals));
	return { ...visuals, peaks: [...peaks] };
}

/** Loudness peaks, PEAKS_PER_SECOND per second, 0–255. */
async function waveform(ffmpeg: string, path: string, duration: number): Promise<Uint8Array> {
	const pcm = await runBuffer(ffmpeg, ["-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "pipe:1"]);
	const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
	const per = SAMPLE_RATE / PEAKS_PER_SECOND;
	const out = new Uint8Array(Math.ceil(Math.max(samples.length / per, duration * PEAKS_PER_SECOND)));
	let loudest = 1;
	for (let i = 0; i < out.length; i++) {
		let peak = 0;
		for (let j = i * per; j < Math.min(samples.length, (i + 1) * per); j++) peak = Math.max(peak, Math.abs(samples[j]));
		out[i] = Math.min(255, peak >> 7);
		loudest = Math.max(loudest, out[i]);
	}
	// Normalise so quiet videos still show a readable wave.
	const gain = 255 / loudest;
	for (let i = 0; i < out.length; i++) out[i] = Math.min(255, Math.round(out[i] * gain));
	return out;
}
