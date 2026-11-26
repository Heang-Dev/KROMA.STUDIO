import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, statSync, writeFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { VoiceCue, VoiceLine } from "@shared/types";
import { voiceTempo } from "@shared/voice";
import { LIBRARY_DIR } from "./download";
import { mapLimit, requireTool, runBuffer } from "./tools";

// Khmer voice-over with Microsoft's neural Khmer voices (the free Edge read-aloud service: no key, runs in the cloud).
// Lines are cached by (text, voice, speed), so editing one line only re-speaks that line.

const CACHE_DIR = join(LIBRARY_DIR, "voice-cache");
const BITRATE = 48_000; // the MP3 format below is constant 48 kbit/s, so duration = bytes * 8 / bitrate
const SAMPLE_RATE = 24_000;
const PARALLEL = 6;

export async function synthesizeLines(
	lines: { id: string; text: string }[],
	voice: string,
	rate: number,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
): Promise<Record<string, VoiceLine>> {
	mkdirSync(CACHE_DIR, { recursive: true });
	const result: Record<string, VoiceLine> = {};
	let done = 0;
	let failed = 0;
	let lastError = "";
	onProgress(0, `Speaking 0/${lines.length} lines`);

	const workers = Array.from({ length: Math.min(PARALLEL, lines.length) }, () => ({ tts: null as MsEdgeTTS | null }));
	let next = 0;
	await Promise.all(
		workers.map(async (worker) => {
			while (next < lines.length && !signal?.aborted) {
				const line = lines[next++];
				const key = createHash("sha1").update(`${voice}|${rate}|${line.text}`).digest("hex").slice(0, 16);
				const path = join(CACHE_DIR, `${key}.mp3`);
				try {
					if (!existsSync(path)) {
						if (!worker.tts) {
							worker.tts = new MsEdgeTTS();
							await worker.tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
						}
						writeFileSync(path, await speak(worker.tts, line.text, rate));
					}
					result[line.id] = { path, duration: (statSync(path).size * 8) / BITRATE, text: line.text };
				} catch (err) {
					failed += 1;
					lastError = err instanceof Error ? err.message : String(err);
					worker.tts?.close();
					worker.tts = null; // reconnect for the next line
				}
				done += 1;
				onProgress(done / lines.length, `Speaking ${done}/${lines.length} lines${failed ? ` · ${failed} failed` : ""}`);
			}
			worker.tts?.close();
		}),
	);
	if (signal?.aborted) throw new Error("Cancelled");
	if (failed === lines.length) throw new Error(`The voice service didn't answer: ${lastError}`);
	return result;
}

async function speak(tts: MsEdgeTTS, text: string, rate: number): Promise<Buffer> {
	const { audioStream } = tts.toStream(escapeXml(text), { rate: `${rate >= 0 ? "+" : ""}${rate}%` });
	const chunks: Buffer[] = [];
	const timeout = setTimeout(() => audioStream.destroy(new Error("The voice service timed out")), 30_000);
	try {
		for await (const chunk of audioStream) chunks.push(chunk as Buffer);
	} finally {
		clearTimeout(timeout);
	}
	const audio = Buffer.concat(chunks);
	if (audio.length < 500) throw new Error("The voice service returned no audio");
	return audio;
}

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);

/**
 * Builds one mono WAV holding every voice line at its time, each sped up (at most 1.6x) to finish before the next line.
 * Written in order, so a 2-hour movie never needs the whole track in memory.
 */
export async function buildVoiceTrack(lines: VoiceCue[], total: number, outPath: string, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<void> {
	const ffmpeg = requireTool("ffmpeg");
	const sorted = [...lines].sort((a, b) => a.start - b.start);
	let decoded = 0;
	const pcm = await mapLimit(sorted, 6, async (line) => {
		const tempo = voiceTempo(line.duration, line.start, line.slotEnd);
		const data = await runBuffer(ffmpeg, ["-v", "error", "-i", line.path, "-filter:a", `atempo=${tempo.toFixed(3)}`, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "pipe:1"], signal);
		decoded += 1;
		if (decoded % 20 === 0) onProgress(decoded / sorted.length, `Preparing the voice-over ${decoded}/${sorted.length}`);
		return data;
	});

	const fd = openSync(outPath, "w");
	try {
		writeSync(fd, Buffer.alloc(44)); // header, filled in at the end
		const silence = Buffer.alloc(SAMPLE_RATE * 2);
		let cursor = 0; // samples written
		const writeSilence = (samples: number) => {
			while (samples > 0) {
				const n = Math.min(samples, SAMPLE_RATE);
				writeSync(fd, silence, 0, n * 2);
				samples -= n;
				cursor += n;
			}
		};
		sorted.forEach((line, i) => {
			const startSample = Math.round(line.start * SAMPLE_RATE);
			if (startSample > cursor) writeSilence(startSample - cursor);
			// Never run into the next line: cut what doesn't fit (rare after the speed-up).
			const nextStart = sorted[i + 1] ? Math.round(sorted[i + 1].start * SAMPLE_RATE) : Number.POSITIVE_INFINITY;
			const room = Math.max(0, nextStart - cursor);
			const data = pcm[i].subarray(0, Math.min(pcm[i].length, room * 2) & ~1);
			writeSync(fd, data);
			cursor += data.length / 2;
		});
		const end = Math.round(total * SAMPLE_RATE);
		if (end > cursor) writeSilence(end - cursor);
		writeSync(fd, wavHeader(cursor * 2), 0, 44, 0);
	} finally {
		closeSync(fd);
	}
}

function wavHeader(dataBytes: number): Buffer {
	const h = Buffer.alloc(44);
	h.write("RIFF", 0);
	h.writeUInt32LE(36 + dataBytes, 4);
	h.write("WAVE", 8);
	h.write("fmt ", 12);
	h.writeUInt32LE(16, 16);
	h.writeUInt16LE(1, 20); // PCM
	h.writeUInt16LE(1, 22); // mono
	h.writeUInt32LE(SAMPLE_RATE, 24);
	h.writeUInt32LE(SAMPLE_RATE * 2, 28);
	h.writeUInt16LE(2, 32);
	h.writeUInt16LE(16, 34);
	h.write("data", 36);
	h.writeUInt32LE(dataBytes, 40);
	return h;
}
