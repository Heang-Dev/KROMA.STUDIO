// Finding burned-in subtitles in a video, from a few grey frames sampled across it.
//
// Subtitle text is a strip of dense, sharp vertical edges (letter strokes with outlines) that comes back in the same
// rows frame after frame, while the picture behind it changes. So: per frame, which rows are "texty"; across frames,
// how often each row is; then the strip in the lower part of the picture where that's clearly higher than just above
// and below it. Its width is where text was seen in that strip. Pure, so it can be tested on made-up frames.

export interface GreyFrame {
	width: number;
	height: number;
	/** One byte per pixel, row by row. */
	data: Uint8Array;
}

export interface FoundSubtitles {
	/** Fractions of the video picture (0–1). */
	x: number;
	y: number;
	w: number;
	h: number;
	/** How sure, 0–1: the share of frames that had text in the strip. */
	score: number;
}

/** A jump in brightness between neighbouring pixels this big counts as an edge. */
const EDGE = 48;
/** A row is texty when this share of its pixels (in the middle 90%) are edges. */
const TEXTY_ROW = 0.05;

/** Texty rows of one frame, and the edge pixels (for the strip's width). */
function edges(frame: GreyFrame): { rows: Float32Array; isEdge: Uint8Array } {
	const { width: W, height: H, data } = frame;
	const rows = new Float32Array(H);
	const isEdge = new Uint8Array(W * H);
	const x0 = Math.floor(W * 0.05);
	const x1 = Math.ceil(W * 0.95);
	for (let y = 0; y < H; y++) {
		let count = 0;
		const row = y * W;
		for (let x = x0; x < x1 - 1; x++) {
			if (Math.abs(data[row + x + 1] - data[row + x]) >= EDGE) {
				isEdge[row + x] = 1;
				count++;
			}
		}
		rows[y] = count / (x1 - x0);
	}
	return { rows, isEdge };
}

/**
 * The burned-in subtitle strip, or null when there's none (or it's not clear enough). Looks in the lower 45% of the
 * picture, where subtitles are.
 */
export function findBurnedSubtitles(frames: GreyFrame[]): FoundSubtitles | null {
	if (frames.length < 4) return null;
	const { width: W, height: H } = frames[0];
	const usable = frames.filter((f) => f.width === W && f.height === H);
	const maps = usable.map(edges);
	// How often each row is texty.
	const often = new Float32Array(H);
	for (const m of maps) for (let y = 0; y < H; y++) if (m.rows[y] >= TEXTY_ROW) often[y] += 1 / maps.length;

	// The best strip: high inside, clearly lower in the margins just above and below.
	const minH = Math.max(3, Math.round(H * 0.03));
	const maxH = Math.round(H * 0.18);
	const top = Math.round(H * 0.55);
	const bottom = Math.round(H * 0.99);
	const mean = (a: number, b: number) => {
		let s = 0;
		const lo = Math.max(0, a);
		const hi = Math.min(H, b);
		for (let y = lo; y < hi; y++) s += often[y];
		return hi > lo ? s / (hi - lo) : 0;
	};
	let best: { y: number; h: number; inside: number; score: number } | null = null;
	for (let h = minH; h <= maxH; h++) {
		for (let y = top; y + h <= bottom; y++) {
			const inside = mean(y, y + h);
			const margin = Math.max(2, Math.round(h * 0.6));
			const around = Math.max(mean(y - margin, y), mean(y + h, y + h + margin));
			// Prefer clear strips; a little bonus for the taller of two equally clear ones (two-line subtitles).
			const score = inside - around + h / H / 10;
			if (inside >= 0.2 && inside - around >= 0.12 && (!best || score > best.score)) best = { y, h, inside, score };
		}
	}
	if (!best) return null;

	// Its width: in each frame that has text in the strip, where the text runs (the busy run of columns around the
	// middle; a stray bit of background further out doesn't count). The widest lines decide, so long ones fit too.
	const lefts: number[] = [];
	const rights: number[] = [];
	let texty = 0;
	for (const m of maps) {
		let rowsWithText = 0;
		for (let y = best.y; y < best.y + best.h; y++) if (m.rows[y] >= TEXTY_ROW) rowsWithText++;
		if (rowsWithText < best.h * 0.3) continue;
		texty++;
		const span = textSpan(m.isEdge, W, best.y, best.h);
		if (span) {
			lefts.push(span[0]);
			rights.push(span[1]);
		}
	}
	if (!texty || !lefts.length) return null;
	lefts.sort((a, b) => a - b);
	rights.sort((a, b) => a - b);
	const x0 = lefts[Math.floor((lefts.length - 1) * 0.1)];
	const x1 = rights[Math.ceil((rights.length - 1) * 0.9)];
	if (x1 < x0) return null;
	// Room around the text: its outline, and longer lines than the ones sampled.
	const padX = W * 0.04;
	const padY = best.h * 0.35;
	const x = Math.max(0, x0 - padX);
	const y = Math.max(0, best.y - padY);
	return {
		x: x / W,
		y: y / H,
		w: (Math.min(W, x1 + 1 + padX) - x) / W,
		h: (Math.min(H, best.y + best.h + padY) - y) / H,
		score: Math.min(1, texty / maps.length),
	};
}

/**
 * Where the text runs in one frame's strip: columns with letter strokes (smoothed over the gaps between letters),
 * grown out from the busiest part while the gaps stay short. Null when the strip has no clear text.
 */
function textSpan(isEdge: Uint8Array, W: number, top: number, height: number): [number, number] | null {
	const count = new Float32Array(W);
	for (let x = 0; x < W; x++) for (let y = top; y < top + height; y++) if (isEdge[y * W + x]) count[x]++;
	const smooth = new Float32Array(W);
	for (let x = 0; x < W; x++) {
		let sum = 0;
		for (let k = -4; k <= 4; k++) sum += count[Math.min(W - 1, Math.max(0, x + k))];
		smooth[x] = sum / 9 / height;
	}
	const on = (x: number) => smooth[x] >= 0.15;
	// Start from the busiest column near the middle (subtitles are centred).
	let start = -1;
	for (let d = 0; d < W / 2; d++) {
		if (on(Math.floor(W / 2) - d)) {
			start = Math.floor(W / 2) - d;
			break;
		}
		if (on(Math.floor(W / 2) + d)) {
			start = Math.floor(W / 2) + d;
			break;
		}
	}
	if (start < 0) return null;
	const gap = Math.round(W * 0.04);
	let left = start;
	let right = start;
	for (let x = start, miss = 0; x >= 0 && miss <= gap; x--) {
		if (on(x)) {
			left = x;
			miss = 0;
		} else miss++;
	}
	for (let x = start, miss = 0; x < W && miss <= gap; x++) {
		if (on(x)) {
			right = x;
			miss = 0;
		} else miss++;
	}
	return right - left >= W * 0.05 ? [left, right] : null;
}
