import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { LIBRARY_DIR } from "./download";
import { findTool, installHint, requireTool, run } from "./tools";

// Removes the original voices from a video's sound and keeps the music and effects (the UVR models, through
// audio-separator), so the Khmer voice-over replaces the Chinese speech instead of talking over it.
// Runs on this Mac with uv; the first run downloads the tool and the model. Results are cached per video and quality.

export type SeparationQuality = "fast" | "best";

const MODELS: Record<SeparationQuality, string> = {
	// ~8x faster than real time on an M-series CPU; removes speech well.
	fast: "UVR-MDX-NET-Inst_HQ_3.onnx",
	// Cleanest result, but slower than real time on a Mac.
	best: "model_bs_roformer_ep_317_sdr_12.ckpt",
};

const CACHE = join(LIBRARY_DIR, "cache", "separated");
const inFlight = new Map<string, Promise<string>>();

export function removeVoices(mediaPath: string, duration: number, quality: SeparationQuality, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<string> {
	const stat = statSync(mediaPath);
	const key = createHash("sha1").update(`${mediaPath}|${stat.size}|${stat.mtimeMs}|${quality}`).digest("hex").slice(0, 16);
	const out = join(CACHE, `${key}.wav`);
	if (existsSync(out)) return Promise.resolve(out);
	const running = inFlight.get(key);
	if (running) return running;
	const job = separate(mediaPath, duration, quality, out, onProgress, signal).finally(() => inFlight.delete(key));
	inFlight.set(key, job);
	return job;
}

async function separate(mediaPath: string, duration: number, quality: SeparationQuality, out: string, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<string> {
	const uvx = findTool("uvx");
	if (!uvx) throw new Error(`Removing voices needs uv. Install it with: ${installHint("uvx")}`);
	const ffmpeg = requireTool("ffmpeg");
	const work = join(CACHE, `work-${Date.now()}`);
	mkdirSync(work, { recursive: true });
	try {
		onProgress(-1, "Reading the sound");
		const input = join(work, "sound.wav");
		await run(ffmpeg, ["-y", "-v", "error", "-i", mediaPath, "-vn", "-ac", "2", "-ar", "44100", input], { signal });

		onProgress(-1, "Preparing voice removal (the first time downloads the tool and model)");
		let started = false;
		await run(
			uvx,
			[
				"--python",
				"3.12",
				"--from",
				"audio-separator[cpu]",
				// Packages the tool needs but doesn't declare.
				"--with",
				"audioread",
				"--with",
				"standard-aifc",
				"--with",
				"standard-sunau",
				"audio-separator",
				input,
				"-m",
				MODELS[quality],
				"--single_stem",
				"Instrumental",
				"--output_format",
				"WAV",
				"--model_file_dir",
				join(LIBRARY_DIR, "cache", "separator-models"),
				"--output_dir",
				work,
			],
			{
				signal,
				onLine: (line) => {
					// tqdm progress: " 12/58 [...]"
					const m = line.match(/(\d+)\/(\d+)\s*\[/);
					if (m) {
						started = true;
						const p = Number(m[1]) / Number(m[2]);
						onProgress(p, `Removing the original voices · ${Math.round(p * 100)}%`);
					} else if (!started && /download/i.test(line)) onProgress(-1, "Downloading the voice-removal model (first time only)");
				},
			},
		);
		const result = readdirSync(work).find((f) => f.includes("(Instrumental)"));
		if (!result) throw new Error("Voice removal finished without a result.");
		renameSync(join(work, result), out);
		onProgress(1, `Original voices removed (${Math.round(duration / 60)} min of sound)`);
		return out;
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}
