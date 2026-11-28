import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, statSync, writeFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { VoiceCue, VoiceLine } from "@shared/types";
import { planVoice } from "@shared/voice";
import { languageOf, languageOfVoice } from "@shared/languages";
import { LIBRARY_DIR } from "./download";
import { mapLimit, requireTool, runBuffer } from "./tools";
import { t } from "@shared/i18n";

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
	onProgress(0, t("Speaking {done}/{total} lines", { done: 0, total: lines.length }));

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
						// The free service sometimes drops a stream mid-sentence (some voices, like the Thai women, often):
						// reconnect and try again, a few times, waiting a little longer each time.
						for (let attempt = 0; ; attempt++) {
							try {
								writeFileSync(path, await speak(worker.tts, line.text, rate));
								break;
							} catch (err) {
								if (attempt >= 4 || signal?.aborted) throw err;
								worker.tts.close();
								await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
								worker.tts = new MsEdgeTTS();
								await worker.tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
							}
						}
					}
					result[line.id] = { path, duration: (statSync(path).size * 8) / BITRATE, text: line.text };
				} catch (err) {
					failed += 1;
					lastError = err instanceof Error ? err.message : String(err);
					worker.tts?.close();
					worker.tts = null; // reconnect for the next line
				}
				done += 1;
				onProgress(done / lines.length, `${t("Speaking {done}/{total} lines", { done, total: lines.length })}${failed ? ` · ${t("{n} failed", { n: failed })}` : ""}`);
			}
			worker.tts?.close();
		}),
	);
	if (signal?.aborted) throw new Error("Cancelled");
	if (failed === lines.length) throw new Error(t("The voice service didn't answer: {error}", { error: lastError }));
	return result;
}


/** A short Khmer sample of an Instant voice at the given speed (cached like any voiced line). */
export async function instantSample(voice: string, rate: number): Promise<string> {
	const result = await synthesizeLines([{ id: "sample", text: (languageOfVoice(voice) ?? languageOf()).sample }], voice, rate, () => undefined);
	const line = result.sample;
	if (!line) throw new Error(t("The voice service didn't answer. Check your internet and try again."));
	return line.path;
}

async function speak(tts: MsEdgeTTS, text: string, rate: number): Promise<Buffer> {
	const { audioStream } = tts.toStream(escapeXml(text), { rate: `${rate >= 0 ? "+" : ""}${rate}%` });
	const chunks: Buffer[] = [];
	const timeout = setTimeout(() => audioStream.destroy(new Error(t("The voice service timed out"))), 30_000);
	try {
		for await (const chunk of audioStream) chunks.push(chunk as Buffer);
	} finally {
		clearTimeout(timeout);
	}
	const audio = Buffer.concat(chunks);
	if (audio.length < 500) throw new Error(t("The voice service returned no audio"));
	return audio;
}

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);

/**
 * Builds one mono WAV holding every voice line at its planned time (see planVoice), written in order so a 2-hour
 * movie never needs the whole track in memory.
 */
export async function buildVoiceTrack(lines: VoiceCue[], total: number, outPath: string, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<void> {
	const ffmpeg = requireTool("ffmpeg");
	const sorted = [...lines].sort((a, b) => a.start - b.start);
	// Every line is spoken in full: planVoice moves a long line's neighbour a little later instead of cutting it.
	const plan = planVoice(sorted);
	let decoded = 0;
	const pcm = await mapLimit(sorted, 6, async (line, i) => {
		const data = await runBuffer(ffmpeg, ["-v", "error", "-i", line.path, "-filter:a", tempoFilter(plan[i].tempo), "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "pipe:1"], signal);
		decoded += 1;
		if (decoded % 20 === 0) onProgress(decoded / sorted.length, t("Preparing the voice-over {done}/{total}", { done: decoded, total: sorted.length }));
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
		sorted.forEach((_, i) => {
			const startSample = Math.round(plan[i].start * SAMPLE_RATE);
			if (startSample > cursor) writeSilence(startSample - cursor);
			writeSync(fd, pcm[i]);
			cursor += pcm[i].length / 2;
		});
		const end = Math.round(total * SAMPLE_RATE);
		if (end > cursor) writeSilence(end - cursor);
		writeSync(fd, wavHeader(cursor * 2), 0, 44, 0);
	} finally {
		closeSync(fd);
	}
}

/** ffmpeg's atempo takes 0.5–2 per filter; chain two for anything above 2 (not expected, but safe). */
function tempoFilter(tempo: number): string {
	if (tempo <= 2) return `atempo=${tempo.toFixed(3)}`;
	return `atempo=2,atempo=${(tempo / 2).toFixed(3)}`;
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
