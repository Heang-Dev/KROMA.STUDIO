import type { Cue, SubtitleStyle } from "@shared/types";

// One renderer for both the preview and the export, so what you see is what gets burned in.
// Chromium shapes Khmer correctly; Intl.Segmenter knows Khmer word boundaries (Khmer has no spaces).

export const SUBTITLE_FONT = '"Kantumruy Pro Variable", "Khmer Sangam MN", "PingFang SC", sans-serif';
const LINE_HEIGHT = 1.55;
const MAX_WIDTH = 0.88;

const segmenters = new Map<string, Intl.Segmenter>();
function segmenter(text: string): Intl.Segmenter {
	const locale = /[ក-៿]/.test(text) ? "km" : /[㐀-鿿]/.test(text) ? "zh" : "en";
	let s = segmenters.get(locale);
	if (!s) {
		s = new Intl.Segmenter(locale, { granularity: "word" });
		segmenters.set(locale, s);
	}
	return s;
}

/** Wraps text to lines no wider than maxWidth, breaking only between words (or graphemes for a too-long word). */
export function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
	const lines = wrapRaw(ctx, text, maxWidth);
	// Two uneven lines read better evened out ("long long long / x" -> "long long / long x").
	if (lines.length !== 2) return lines;
	const total = ctx.measureText(text.trim()).width;
	if (ctx.measureText(lines[1]).width > total * 0.3) return lines;
	const even = wrapRaw(ctx, text, total * 0.6);
	return even.length === 2 ? even : lines;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function wrapRaw(ctx: Ctx, text: string, maxWidth: number): string[] {
	const segments = Array.from(segmenter(text).segment(text.trim()));
	const lines: string[] = [];
	let line = "";
	for (const { segment: word, isWordLike } of segments) {
		const candidate = line + word;
		// Punctuation (，。! ។) never starts a line: it stays with the word before it.
		const punctuation = !isWordLike && word.trim().length > 0;
		if (ctx.measureText(candidate).width <= maxWidth || !line.trim() || punctuation) {
			line = candidate;
			if (ctx.measureText(line).width > maxWidth) {
				// A single word wider than the line: break it by grapheme.
				const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(line), (g) => g.segment);
				let part = "";
				for (const g of graphemes) {
					if (ctx.measureText(part + g).width > maxWidth && part) {
						lines.push(part);
						part = g;
					} else part += g;
				}
				line = part;
			}
		} else {
			lines.push(line.trim());
			line = word.trimStart();
		}
	}
	if (line.trim()) lines.push(line.trim());
	return lines;
}

interface Layout {
	width: number;
	height: number;
}

/**
 * Draws the cue into ctx, whose coordinate space is the full output frame (width x height).
 * Returns nothing; callers translate/scale the context for previews or export bands.
 */
export function drawCue(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, cue: Pick<Cue, "text" | "source">, style: SubtitleStyle, frame: Layout): void {
	// Sized against the short side, so 9:16 text matches 16:9 text instead of doubling.
	const px = Math.round(style.size * Math.min(frame.width, frame.height));
	const maxWidth = frame.width * MAX_WIDTH;
	const blocks: { lines: string[]; size: number; color: string }[] = [];

	const main = cue.text.trim() || cue.source.trim();
	if (!main) return;
	if (style.showSource && cue.text.trim() && cue.source.trim()) {
		const size = Math.round(px * 0.72);
		ctx.font = `500 ${size}px ${SUBTITLE_FONT}`;
		blocks.push({ lines: wrapText(ctx, cue.source, maxWidth), size, color: "#f5d76e" });
	}
	ctx.font = `${style.bold ? 700 : 500} ${px}px ${SUBTITLE_FONT}`;
	blocks.push({ lines: wrapText(ctx, main, maxWidth), size: px, color: style.color });

	const rows = blocks.flatMap((b) => b.lines.map((line) => ({ line, size: b.size, color: b.color, weight: b === blocks[blocks.length - 1] && style.bold ? 700 : 500 })));
	const heights = rows.map((r) => r.size * LINE_HEIGHT);
	let y = style.position * frame.height - heights.reduce((a, b) => a + b, 0);

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.lineJoin = "round";
	ctx.miterLimit = 2;
	rows.forEach((row, i) => {
		const h = heights[i];
		const cy = y + h / 2;
		ctx.font = `${row.weight} ${row.size}px ${SUBTITLE_FONT}`;
		if (style.box) {
			const w = ctx.measureText(row.line).width + row.size * 0.7;
			ctx.fillStyle = style.boxColor;
			roundRect(ctx, frame.width / 2 - w / 2, y + h * 0.04, w, h * 0.92, row.size * 0.22);
		}
		if (style.outline > 0) {
			ctx.strokeStyle = style.outlineColor;
			ctx.lineWidth = row.size * style.outline * 2;
			ctx.strokeText(row.line, frame.width / 2, cy);
		}
		ctx.fillStyle = row.color;
		ctx.fillText(row.line, frame.width / 2, cy);
		y += h;
	});
}

function roundRect(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fill();
}

/** The horizontal strip of the frame subtitles can occupy, used to keep export images small. */
export function subtitleBand(style: SubtitleStyle, frame: Layout): { top: number; height: number } {
	// Everything above the text's bottom edge: long bilingual lines grow upwards and must never be cut.
	// The transparent part costs almost nothing in a PNG.
	const bottom = Math.min(frame.height, Math.ceil(style.position * frame.height + style.size * Math.min(frame.width, frame.height) * 0.6));
	return { top: 0, height: bottom };
}

export async function ensureFonts(): Promise<void> {
	await Promise.all([document.fonts.load(`700 40px ${SUBTITLE_FONT}`, "ក"), document.fonts.load(`500 40px ${SUBTITLE_FONT}`, "ក")]);
}

/** Draws one cue into a transparent PNG covering the subtitle band of the output frame. */
export async function renderBandPng(cue: Pick<Cue, "text" | "source">, style: SubtitleStyle, frame: Layout, band: { top: number; height: number }): Promise<Uint8Array> {
	const canvas = new OffscreenCanvas(frame.width, band.height);
	const ctx = canvas.getContext("2d")!;
	ctx.translate(0, -band.top);
	drawCue(ctx, cue, style, frame);
	const blob = await canvas.convertToBlob({ type: "image/png" });
	return new Uint8Array(await blob.arrayBuffer());
}
