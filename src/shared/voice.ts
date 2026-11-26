// Timing of the voice-over, shared by the preview and the export so both sound the same.
// A dubbed line is often longer than the original. No line is ever cut: a long line may push the next one a little
// later (the lag is caught up in the next pause), and only when it would fall too far behind is it sped up further.

export const MAX_TEMPO = 1.6;
/** Hard ceiling, only used when a line would otherwise run far past the next one. */
export const MAX_CATCH_UP_TEMPO = 2;
/** How far behind the subtitles a line may start, at most, before speeding up harder. */
export const MAX_LAG = 1.2;
const GAP = 0.05;

/** Old rule kept for callers that only need a single line's tempo. */
export function voiceTempo(duration: number, start: number, slotEnd: number): number {
	const slot = Math.max(0.2, slotEnd - start);
	return Math.min(MAX_TEMPO, Math.max(1, duration / slot));
}

export interface PlannedLine {
	/** When the voice starts on the timeline (may be a little after the subtitle). */
	start: number;
	tempo: number;
	/** When it ends: start + duration / tempo. */
	end: number;
}

/** Plans every voice line: `lines` are sorted by start; `slotEnd` is where the next subtitle starts (or the video ends). */
export function planVoice(lines: { start: number; slotEnd: number; duration: number }[]): PlannedLine[] {
	let cursor = 0;
	return lines.map((line) => {
		const start = Math.max(line.start, cursor);
		const room = Math.max(0.2, line.slotEnd - start);
		let tempo = Math.min(MAX_TEMPO, Math.max(1, line.duration / room));
		// Running more than MAX_LAG past the next subtitle: speed up harder to stay with the picture.
		const limit = line.slotEnd + MAX_LAG;
		if (start + line.duration / tempo > limit) tempo = Math.min(MAX_CATCH_UP_TEMPO, Math.max(tempo, line.duration / Math.max(0.2, limit - start)));
		const end = start + line.duration / tempo;
		cursor = end + GAP;
		return { start, tempo, end };
	});
}
