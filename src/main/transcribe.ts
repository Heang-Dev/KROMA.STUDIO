import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Settings, SourceCue } from "@shared/types";
import { mapLimit, requireTool, run } from "./tools";

// Cloud speech-to-text through an OpenAI-compatible endpoint (Groq by default).
// The audio is cut into small pieces and sent in parallel, so a long movie takes about as long as one piece.

const CHUNK_SECONDS = 600;
const MAX_CUE_SECONDS = 7;

// Lines Whisper is known to invent over silence or music in Chinese videos.
const HALLUCINATIONS = [/请不吝点赞/, /订阅.*频道/, /字幕由.*提供/, /明镜与点点/, /感谢观看/, /^谢谢大家?[。！]?$/, /Amara\.org/i];

interface Segment {
	start: number;
	end: number;
	text: string;
	no_speech_prob?: number;
}

export async function transcribe(
	mediaPath: string,
	duration: number,
	language: string,
	settings: Settings,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
): Promise<SourceCue[]> {
	if (!settings.asrKey) throw new Error("Add your speech-to-text API key in Settings first (Groq is free to start).");
	const ffmpeg = requireTool("ffmpeg");
	const dir = mkdtempSync(join(tmpdir(), "kroma-asr-"));
	const starts: number[] = [];
	for (let t = 0; t < duration; t += CHUNK_SECONDS) starts.push(t);

	let done = 0;
	const report = () => onProgress(done / starts.length, `Transcribing in the cloud · ${done}/${starts.length} parts`);
	report();

	try {
		const parts = await mapLimit(starts, settings.concurrency, async (start, i) => {
			const chunk = join(dir, `part${i}.m4a`);
			const length = Math.min(CHUNK_SECONDS, duration - start);
			// Mono 16 kHz at 32 kbps: ~2.4 MB per 10 minutes, well under upload limits.
			await run(ffmpeg, ["-y", "-ss", String(start), "-t", String(length), "-i", mediaPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "aac", "-b:a", "32k", chunk], { signal });
			const segments = await requestTranscription(chunk, language, settings, signal);
			done += 1;
			report();
			return segments.map((s) => ({ ...s, start: s.start + start, end: Math.min(s.end, length) + start }));
		});
		return clean(parts.flat());
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

async function requestTranscription(file: string, language: string, settings: Settings, signal?: AbortSignal): Promise<Segment[]> {
	const url = `${settings.asrBaseUrl.replace(/\/$/, "")}/audio/transcriptions`;
	for (let attempt = 0; ; attempt++) {
		const form = new FormData();
		form.append("file", new Blob([readFileSync(file)], { type: "audio/mp4" }), "audio.m4a");
		form.append("model", settings.asrModel);
		form.append("response_format", "verbose_json");
		form.append("timestamp_granularities[]", "segment");
		if (language && language !== "auto") form.append("language", language);
		// Steers Whisper towards Simplified Chinese with punctuation.
		if (language === "zh") form.append("prompt", "以下是普通话的句子，使用简体中文。");

		const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${settings.asrKey}` }, body: form, signal });
		if (response.ok) {
			const data = (await response.json()) as { segments?: Segment[]; text?: string };
			return data.segments ?? [];
		}
		const body = await response.text();
		const retryable = response.status === 429 || response.status >= 500;
		if (!retryable || attempt >= 4) {
			if (response.status === 401) throw new Error("The speech-to-text API key was refused. Check it in Settings.");
			throw new Error(`Speech-to-text failed (${response.status}): ${body.slice(0, 200)}`);
		}
		const wait = Number(response.headers.get("retry-after")) || 2 ** attempt * 3;
		await new Promise((r) => setTimeout(r, wait * 1000));
	}
}

/** Drops invented lines and splits long segments at punctuation so each line fits on screen. */
export function clean(segments: Segment[]): SourceCue[] {
	const out: SourceCue[] = [];
	for (const seg of segments) {
		const text = seg.text.trim();
		if (!text || (seg.no_speech_prob ?? 0) > 0.85) continue;
		if (HALLUCINATIONS.some((re) => re.test(text))) continue;
		const prev = out[out.length - 1];
		if (prev && prev.text === text && seg.start - prev.end < 1) continue; // Whisper repeat loop
		out.push(...splitLong({ start: seg.start, end: seg.end, text }));
	}
	return out;
}

export function splitLong(cue: SourceCue): SourceCue[] {
	const length = cue.end - cue.start;
	if (length <= MAX_CUE_SECONDS) return [cue];
	const pieces = cue.text.split(/(?<=[。！？，,.!?；;])/).filter((p) => p.trim());
	if (pieces.length < 2) return [cue];
	const total = pieces.reduce((n, p) => n + p.length, 0);
	const out: SourceCue[] = [];
	let t = cue.start;
	for (const piece of pieces) {
		const end = t + (length * piece.length) / total;
		out.push({ start: t, end, text: piece.trim() });
		t = end;
	}
	return out;
}
