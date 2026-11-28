// Animated captions: how a subtitle line comes in (fade, pop, slide) or how its words follow the speech (the spoken
// word lights up, or words appear one by one). Pure timing here; drawing is the renderer's subtitleRender.
//
// There are no word timings from speech to text, so each word gets a share of the line's time by its length
// (graphemes), which follows natural speech closely enough for captions.

export type CaptionAnimation = "none" | "fade" | "pop" | "slide" | "words" | "build";

export const CAPTION_ANIMATIONS: { value: CaptionAnimation; label: string; description: string }[] = [
	{ value: "none", label: "None", description: "Each line just appears" },
	{ value: "fade", label: "Fade in", description: "Each line fades in" },
	{ value: "pop", label: "Pop", description: "Each line pops in, a little bouncy" },
	{ value: "slide", label: "Slide up", description: "Each line rises into place" },
	{ value: "words", label: "Spoken word", description: "The word being said lights up (TikTok style)" },
	{ value: "build", label: "Word by word", description: "Words appear as they're said" },
];

/** How long a line takes to come in (fade, pop, slide), in seconds. */
export const ENTER_SECONDS = 0.24;
/** Images per second for the coming-in part of an export. */
const ENTER_FPS = 30;

/** What to draw at one moment: how far the line has come in (0–1), and the word being said (0-based). */
export interface CaptionMotion {
	animation: CaptionAnimation;
	enter?: number;
	word?: number;
}

const graphemes = (text: string) => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)).length;

/** Each word's share of the line's time, by its length; they add up to 1. */
export function wordShares(words: string[]): number[] {
	const lengths = words.map((w) => Math.max(1, graphemes(w)));
	const total = lengths.reduce((a, b) => a + b, 0) || 1;
	return lengths.map((n) => n / total);
}

/** The word being said `elapsed` seconds into a line of `duration` seconds. */
export function wordAt(shares: number[], duration: number, elapsed: number): number {
	if (!shares.length) return 0;
	let end = 0;
	for (let i = 0; i < shares.length; i++) {
		end += shares[i] * duration;
		if (elapsed < end) return i;
	}
	return shares.length - 1;
}

/** Eased progress 0–1 (smooth start and end). */
export const ease = (t: number) => {
	const x = Math.min(1, Math.max(0, t));
	return 1 - (1 - x) ** 3;
};

/** What the line looks like `elapsed` seconds after it appears (the preview, every frame). */
export function motionAt(animation: CaptionAnimation | undefined, shares: number[], duration: number, elapsed: number): CaptionMotion | undefined {
	if (!animation || animation === "none") return undefined;
	if (animation === "words" || animation === "build") return { animation, word: wordAt(shares, duration, elapsed) };
	return { animation, enter: Math.min(1, Math.max(0, elapsed / ENTER_SECONDS)) };
}

/**
 * The still images an export needs for one line: [start, end) times, each with what to draw. A line with no motion is
 * one image; a line that comes in is a few images over its first quarter second, then one; spoken-word lines are one
 * image per word.
 */
export function motionFrames(animation: CaptionAnimation | undefined, shares: number[], start: number, end: number): { start: number; end: number; motion?: CaptionMotion }[] {
	const duration = end - start;
	if (!animation || animation === "none" || duration <= 0) return [{ start, end }];
	if (animation === "words" || animation === "build") {
		if (shares.length <= 1) return [{ start, end, motion: { animation, word: 0 } }];
		const frames: { start: number; end: number; motion: CaptionMotion }[] = [];
		let t = start;
		shares.forEach((share, word) => {
			const next = word === shares.length - 1 ? end : t + share * duration;
			frames.push({ start: t, end: next, motion: { animation, word } });
			t = next;
		});
		return frames;
	}
	const enterEnd = Math.min(end, start + ENTER_SECONDS);
	const steps = Math.max(1, Math.round((enterEnd - start) * ENTER_FPS));
	const frames: { start: number; end: number; motion?: CaptionMotion }[] = [];
	for (let i = 0; i < steps; i++) {
		const a = start + ((enterEnd - start) * i) / steps;
		const b = start + ((enterEnd - start) * (i + 1)) / steps;
		frames.push({ start: a, end: b, motion: { animation, enter: (i + 0.5) / steps } });
	}
	if (end > enterEnd) frames.push({ start: enterEnd, end });
	return frames;
}
