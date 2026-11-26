import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Settings, SourceCue } from "@shared/types";
import { geminiWithFallback } from "./gemini";
import { mapLimit, requireTool, run } from "./tools";

// Cloud speech-to-text through an OpenAI-compatible endpoint (Groq by default).
// The audio is cut into small pieces and sent in parallel, so a long movie takes about as long as one piece.

const CHUNK_SECONDS = 600;
const GEMINI_CHUNK_SECONDS = 120;
const MAX_CUE_SECONDS = 7;

// Lines Whisper is known to invent over silence or music in Chinese videos.
const HALLUCINATIONS = [/普通话的句子/, /请不吝点赞/, /订阅.*频道/, /字幕由.*提供/, /明镜与点点/, /感谢观看/, /^谢谢大家?[。！]?$/, /Amara\.org/i];

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
): Promise<{ cues: SourceCue[]; note?: string }> {
	const useGemini = settings.asrProvider === "gemini";
	if (useGemini && !settings.geminiKey) throw new Error("Add your free Gemini key in Settings → Translation (speech to text uses it too), or choose Groq in Settings → Speech to Text.");
	if (!useGemini && !settings.asrKey) throw new Error("Add your speech-to-text API key in Settings → Speech to Text (Groq is free to start).");
	const ffmpeg = requireTool("ffmpeg");
	const dir = mkdtempSync(join(tmpdir(), "kroma-asr-"));
	// Gemini listens to shorter pieces (its timings stay accurate and each answer stays small); Whisper takes 10 minutes at once.
	const pieceSeconds = useGemini ? GEMINI_CHUNK_SECONDS : CHUNK_SECONDS;
	const starts: number[] = [];
	for (let t = 0; t < duration; t += pieceSeconds) starts.push(t);

	let done = 0;
	let liteParts = 0;
	const service = useGemini ? "Gemini" : "the cloud";
	const report = (note = "") => onProgress(done / starts.length, note || `Transcribing with ${service} · ${done}/${starts.length} parts`);
	report();

	try {
		const parts = await mapLimit(starts, useGemini ? Math.min(settings.concurrency, 3) : settings.concurrency, async (start, i) => {
			const chunk = join(dir, `part${i}.m4a`);
			const length = Math.min(pieceSeconds, duration - start);
			// Mono 16 kHz at 32 kbps: ~2.4 MB per 10 minutes, well under upload limits.
			await run(ffmpeg, ["-y", "-ss", String(start), "-t", String(length), "-i", mediaPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "aac", "-b:a", "32k", chunk], { signal });
			const segments = useGemini
				? await geminiTranscription(chunk, length, language, settings, signal, (reason) => report(`${reason} · ${done}/${starts.length} parts done`), () => liteParts++)
				: await requestTranscription(chunk, language, settings, signal);
			done += 1;
			report();
			return segments.map((s) => ({ ...s, start: s.start + start, end: Math.min(s.end, length) + start }));
		});
		const note = liteParts
			? `Gemini's main model wasn't available (free daily limit or busy), so ${liteParts} of ${starts.length} parts used the lighter Flash-Lite model, which is less accurate. Add a free Groq key in Settings → Speech to Text for full accuracy on long videos.`
			: undefined;
		return { cues: clean(parts.flat()), note };
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

const LANGUAGE_NAMES: Record<string, string> = { zh: "Simplified Chinese", yue: "Cantonese (written in Traditional Chinese)", en: "English", ko: "Korean", ja: "Japanese", th: "Thai", vi: "Vietnamese" };

const SEGMENT_SCHEMA = {
	type: "OBJECT",
	properties: { segments: { type: "ARRAY", items: { type: "OBJECT", properties: { start: { type: "NUMBER" }, end: { type: "NUMBER" }, text: { type: "STRING" } }, required: ["start", "end", "text"] } } },
	required: ["segments"],
};

/** Gemini listens to one audio piece and returns timed subtitle lines (seconds from the start of the piece). */
async function geminiTranscription(file: string, length: number, language: string, settings: Settings, signal: AbortSignal | undefined, onRetry: (reason: string) => void, onFallback: () => void): Promise<Segment[]> {
	const written = LANGUAGE_NAMES[language] ?? "the language spoken, as it is normally written";
	const answer = await geminiWithFallback<{ segments: Segment[] }>(settings, {
		system: "You make accurate subtitles from audio. You write exactly what is said, never summarise, never translate, and never invent lines for music or silence.",
		prompt: `Transcribe the speech in this ${Math.round(length)}-second audio in ${written}, with punctuation. Split it into subtitle lines of one short sentence (at most about 16 Chinese characters or 12 words). Give each line's start and end time in seconds from the beginning of the audio. Skip music, sound effects and silence.`,
		schema: SEGMENT_SCHEMA,
		audio: { mimeType: "audio/mp4", data: readFileSync(file).toString("base64") },
		timeoutMs: 180_000,
		// Low thinking makes Gemini mishear sound-alike words (过度 → 过渡) and round timings; listening keeps its default.
		thinking: "model",
		temperature: 0,
		signal,
		onRetry,
		onFallback,
	});
	// Keep timings inside the piece and in order; Gemini occasionally rounds past the end.
	return (answer.segments ?? [])
		.map((s) => ({ start: Math.max(0, Math.min(length, Number(s.start) || 0)), end: Math.max(0, Math.min(length, Number(s.end) || 0)), text: String(s.text ?? "") }))
		.filter((s) => s.end > s.start && s.text.trim())
		.sort((a, b) => a.start - b.start);
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
	// A subtitle should be one readable sentence: split long or wordy lines at their punctuation.
	if (length <= MAX_CUE_SECONDS && !(length > 3.5 && [...cue.text].length > 18)) return [cue];
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
