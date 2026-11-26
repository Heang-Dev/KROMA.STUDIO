import type { SourceCue } from "./types";

/** "00:01:02,345" or "01:02.345" (VTT) -> seconds. */
export function parseTimestamp(value: string): number {
	const parts = value.trim().replace(",", ".").split(":");
	let seconds = 0;
	for (const part of parts) seconds = seconds * 60 + Number.parseFloat(part);
	return Number.isFinite(seconds) ? seconds : 0;
}

export function formatTimestamp(seconds: number): string {
	const ms = Math.max(0, Math.round(seconds * 1000));
	const h = Math.floor(ms / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	const s = Math.floor((ms % 60_000) / 1000);
	const pad = (n: number, w = 2) => String(n).padStart(w, "0");
	return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

const TAG = /<[^>]+>|\{\\[^}]*\}/g;

/** Parses SRT or WebVTT text. Drops styling tags and empty lines. */
export function parseSubtitles(content: string): SourceCue[] {
	const cues: SourceCue[] = [];
	const blocks = content.replace(/\r/g, "").replace(/^﻿/, "").split(/\n{2,}/);
	for (const block of blocks) {
		const lines = block.split("\n");
		const timeIndex = lines.findIndex((l) => l.includes("-->"));
		if (timeIndex < 0) continue;
		const [a, b] = lines[timeIndex].split("-->");
		const text = lines
			.slice(timeIndex + 1)
			.map((l) => l.replace(TAG, "").trim())
			.filter(Boolean)
			.join(" ");
		if (!text) continue;
		const start = parseTimestamp(a);
		const end = parseTimestamp(b.trim().split(/\s+/)[0]);
		if (end > start) cues.push({ start, end, text });
	}
	return dedupeRolling(cues);
}

/**
 * YouTube auto-captions repeat each line as it scrolls ("A", "A B", "B C"…).
 * Merge consecutive cues whose text repeats the previous one.
 */
function dedupeRolling(cues: SourceCue[]): SourceCue[] {
	const out: SourceCue[] = [];
	for (const cue of cues) {
		const prev = out[out.length - 1];
		if (prev && prev.text === cue.text && cue.start - prev.end < 0.5) {
			prev.end = cue.end;
			continue;
		}
		out.push({ ...cue });
	}
	return out;
}

export function toSrt(cues: { start: number; end: number; text: string }[]): string {
	return cues
		.filter((c) => c.text.trim())
		.map((c, i) => `${i + 1}\n${formatTimestamp(c.start)} --> ${formatTimestamp(c.end)}\n${c.text.trim()}\n`)
		.join("\n");
}
