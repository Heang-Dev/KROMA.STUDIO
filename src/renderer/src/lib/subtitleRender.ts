import { type CaptionMotion, ease } from "@shared/captionMotion";
import { type Cue, SUBTITLE_FONTS, type SubtitleStyle } from "@shared/types";

// One renderer for both the preview and the export, so what you see is what gets burned in.
// Chromium shapes Khmer correctly; Intl.Segmenter knows Khmer word boundaries (Khmer has no spaces).

// Kantumruy Pro comes with Kroma; the rest are each system's fallbacks (Khmer, Chinese, Thai, Lao).
export const SUBTITLE_FONT = '"Kantumruy Pro Variable", "Khmer Sangam MN", "Khmer UI", "Leelawadee UI", "Noto Sans Khmer", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans Thai", "Noto Sans Lao", sans-serif';
const LINE_HEIGHT = 1.55;

/** The style's font, then the usual fallbacks (the original Chinese line etc. still has a font). */
export function fontStack(style: Pick<SubtitleStyle, "font">): string {
	const font = style.font && style.font !== "kantumruy" ? SUBTITLE_FONTS[style.font] : null;
	return font ? `"${font.family}", ${SUBTITLE_FONT}` : SUBTITLE_FONT;
}

/** Bold only where the font has one; display fonts are heavy already, and a faked bold smudges Khmer. */
const weightOf = (style: Pick<SubtitleStyle, "font" | "bold">): number => (style.bold && SUBTITLE_FONTS[style.font ?? "kantumruy"].bold ? 700 : style.font && style.font !== "kantumruy" ? 400 : 500);
const MAX_WIDTH = 0.88;

const segmenters = new Map<string, Intl.Segmenter>();
function segmenter(text: string): Intl.Segmenter {
	// Khmer, Thai and Lao have no spaces between words, so the segmenter finds where a line may break.
	const locale = /[ក-៿]/.test(text) ? "km" : /[฀-๿]/.test(text) ? "th" : /[຀-໿]/.test(text) ? "lo" : /[㐀-鿿]/.test(text) ? "zh" : "en";
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
 * The rows a cue is drawn in, with the main (translated) text split into its words: the same layout drawCue uses,
 * so the word count for timing always matches what's drawn.
 */
function layoutCue(ctx: Ctx, cue: Pick<Cue, "text" | "source">, style: SubtitleStyle, frame: Layout) {
	// Sized against the short side, so 9:16 text matches 16:9 text instead of doubling.
	const px = Math.round(style.size * Math.min(frame.width, frame.height));
	const maxWidth = frame.width * MAX_WIDTH;
	const main = cue.text.trim() || cue.source.trim();
	const rows: { line: string; size: number; color: string; weight: number; font: string; main: boolean; pieces: { text: string; word: number }[] }[] = [];
	if (!main) return { rows, words: [] as string[], px };
	if (style.showSource && cue.text.trim() && cue.source.trim()) {
		const size = Math.round(px * 0.72);
		ctx.font = `500 ${size}px ${SUBTITLE_FONT}`;
		for (const line of wrapText(ctx, cue.source, maxWidth)) rows.push({ line, size, color: "#f5d76e", weight: 500, font: SUBTITLE_FONT, main: false, pieces: [] });
	}
	const mainFont = fontStack(style);
	ctx.font = `${weightOf(style)} ${px}px ${mainFont}`;
	const words: string[] = [];
	for (const line of wrapText(ctx, main, maxWidth)) {
		// Each word-like piece is a word; spaces and punctuation belong to the word before them.
		const pieces: { text: string; word: number }[] = [];
		for (const { segment, isWordLike } of segmenter(line).segment(line)) {
			if (isWordLike || !words.length) words.push(segment);
			else words[words.length - 1] += segment;
			pieces.push({ text: segment, word: words.length - 1 });
		}
		rows.push({ line, size: px, color: style.color, weight: weightOf(style), font: mainFont, main: true, pieces });
	}
	return { rows, words, px };
}

/** The words of a cue's main line, as drawn (for the timing of word-by-word captions). */
export function captionWords(cue: Pick<Cue, "text" | "source">, style: SubtitleStyle, frame: Layout): string[] {
	const ctx = new OffscreenCanvas(8, 8).getContext("2d")!;
	return layoutCue(ctx, cue, style, frame).words;
}

/**
 * Draws the cue into ctx, whose coordinate space is the full output frame (width x height). `motion` is a moment of an
 * animated caption (see shared/captionMotion): how far it has come in, or the word being said.
 */
export function drawCue(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, cue: Pick<Cue, "text" | "source">, style: SubtitleStyle, frame: Layout, motion?: CaptionMotion): void {
	const { rows, px } = layoutCue(ctx, cue, style, frame);
	if (!rows.length) return;
	const heights = rows.map((r) => r.size * LINE_HEIGHT);
	const blockHeight = heights.reduce((a, b) => a + b, 0);
	let y = style.position * frame.height - blockHeight;
	const centre = { x: frame.width / 2, y: y + blockHeight / 2 };

	ctx.save();
	// Coming in: fade, pop (a little past full size, then settle) or slide up.
	if (motion?.enter !== undefined && motion.enter < 1) {
		const t = motion.enter;
		ctx.globalAlpha = ease(Math.min(1, t * (motion.animation === "pop" ? 1.6 : 1)));
		if (motion.animation === "pop") {
			const scale = t < 0.7 ? 0.82 + 0.24 * (t / 0.7) : 1.06 - 0.06 * ((t - 0.7) / 0.3);
			ctx.translate(centre.x, centre.y);
			ctx.scale(scale, scale);
			ctx.translate(-centre.x, -centre.y);
		} else if (motion.animation === "slide") ctx.translate(0, (1 - ease(t)) * px * 0.8);
	}
	const spoken = motion?.word;
	const highlight = style.highlightColor || "#ffe14d";

	ctx.textBaseline = "middle";
	ctx.lineJoin = "round";
	ctx.miterLimit = 2;
	rows.forEach((row, i) => {
		const h = heights[i];
		const cy = y + h / 2;
		ctx.font = `${row.weight} ${row.size}px ${row.font}`;
		const lineWidth = ctx.measureText(row.line).width;
		if (style.box) {
			const w = lineWidth + row.size * 0.7;
			ctx.fillStyle = style.boxColor;
			roundRect(ctx, frame.width / 2 - w / 2, y + h * 0.04, w, h * 0.92, row.size * 0.22);
		}
		// A soft shadow lies under the outline (or under the letters when there's no outline), never over them.
		const shadow = style.shadow ?? 0;
		// A coloured shadow is a glow: all around the letters, not dropped below them.
		const glow = Boolean(style.shadowColor);
		const shadowColor = style.shadowColor || "rgba(0,0,0,0.75)";
		const setShadow = (on: boolean) => {
			ctx.shadowColor = on ? shadowColor : "transparent";
			ctx.shadowBlur = on ? row.size * shadow : 0;
			ctx.shadowOffsetY = on && !glow ? row.size * shadow * 0.25 : 0;
		};
		// Word by word: the line is drawn piece by piece (each where it sits in the whole line), the spoken word in
		// its colour, or words not said yet left out. Otherwise the whole line as one piece.
		const byWord = row.main && spoken !== undefined;
		const pieces: { text: string; x: number; color: string }[] = [];
		let x = frame.width / 2 - lineWidth / 2;
		for (const piece of byWord ? row.pieces : [{ text: row.line, word: -1 }]) {
			const shown = !byWord || motion?.animation !== "build" || piece.word <= spoken;
			if (shown) pieces.push({ text: piece.text, x, color: byWord && motion?.animation === "words" && piece.word === spoken ? highlight : row.color });
			x += byWord ? ctx.measureText(piece.text).width : 0;
		}
		ctx.textAlign = "left";
		if (style.outline > 0) {
			setShadow(shadow > 0);
			ctx.strokeStyle = style.outlineColor;
			ctx.lineWidth = row.size * style.outline * 2;
			pieces.forEach((piece) => ctx.strokeText(piece.text, piece.x, cy));
			setShadow(false);
		} else setShadow(shadow > 0);
		pieces.forEach((piece) => {
			ctx.fillStyle = piece.color;
			ctx.fillText(piece.text, piece.x, cy);
		});
		setShadow(false);
		y += h;
	});
	ctx.restore();
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

/** Loads every subtitle font (Khmer and Latin), so the canvas never draws before a font has arrived. */
export async function ensureFonts(): Promise<void> {
	const loads = [document.fonts.load(`700 40px ${SUBTITLE_FONT}`, "ក"), document.fonts.load(`500 40px ${SUBTITLE_FONT}`, "ក")];
	for (const font of Object.values(SUBTITLE_FONTS)) for (const weight of font.bold ? [400, 700] : [400]) loads.push(document.fonts.load(`${weight} 40px "${font.family}"`, "កA"));
	await Promise.all(loads);
}

/** Draws one cue into a transparent PNG covering the subtitle band of the output frame. */
export async function renderBandPng(cue: Pick<Cue, "text" | "source">, style: SubtitleStyle, frame: Layout, band: { top: number; height: number }, motion?: CaptionMotion): Promise<Uint8Array> {
	const canvas = new OffscreenCanvas(frame.width, band.height);
	const ctx = canvas.getContext("2d")!;
	ctx.translate(0, -band.top);
	drawCue(ctx, cue, style, frame, motion);
	const blob = await canvas.convertToBlob({ type: "image/png" });
	return new Uint8Array(await blob.arrayBuffer());
}
