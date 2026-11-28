import type { CoverSettings } from "@shared/cover";
import { fontStack, wrapText } from "./subtitleRender";

// Draws an episode cover: the frame filling the picture, a soft dark gradient where text goes, then the design's
// episode label and title in Kroma's Khmer display fonts. Used for the preview and for the saved JPEG alike.

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const DISPLAY = fontStack({ font: "koulen" });

export interface CoverText {
	/** "ភាគ ៥", "EP 5"… (empty: no episode number). */
	label: string;
	/** The number alone, as shown ("៥" or "5"), for the Big number design. */
	number: string;
	/** The word before it ("ភាគ", "EP"…). */
	word: string;
	title: string;
}

/** The label split for the Big number design: "ភាគ ១៥" → word "ភាគ", number "១៥". */
export function splitLabel(label: string): { word: string; number: string } {
	const m = label.match(/^(.*?)\s*([0-9០-៩]+)$/);
	return m ? { word: m[1], number: m[2] } : { word: "", number: label };
}

/**
 * Where the picture goes. A frame much wider than the cover (16:9 on a 9:16 cover) is shown whole, a little above
 * the middle, over a blurred, zoomed copy of itself, so nobody is cut out; otherwise it fills the cover.
 */
function placement(image: { width: number; height: number }, W: number, H: number): { x: number; y: number; w: number; h: number; backdrop: boolean } {
	const backdrop = image.width / image.height > (W / H) * 1.4;
	const scale = backdrop ? W / image.width : Math.max(W / image.width, H / image.height);
	const w = image.width * scale;
	const h = image.height * scale;
	return { x: (W - w) / 2, y: backdrop ? H * 0.42 - h / 2 : (H - h) / 2, w, h, backdrop };
}

function cover(ctx: Ctx, image: CanvasImageSource & { width: number; height: number }, W: number, H: number): void {
	const p = placement(image, W, H);
	if (p.backdrop) {
		const scale = Math.max(W / image.width, H / image.height) * 1.1;
		ctx.save();
		ctx.filter = `blur(${Math.round(W / 25)}px) brightness(0.7)`;
		ctx.drawImage(image, (W - image.width * scale) / 2, (H - image.height * scale) / 2, image.width * scale, image.height * scale);
		ctx.restore();
	}
	ctx.drawImage(image, p.x, p.y, p.w, p.h);
}

function shade(ctx: Ctx, W: number, H: number, from: number, alpha: number): void {
	const g = ctx.createLinearGradient(0, H * from, 0, H);
	g.addColorStop(0, "rgba(0,0,0,0)");
	g.addColorStop(1, `rgba(0,0,0,${alpha})`);
	ctx.fillStyle = g;
	ctx.fillRect(0, H * from, W, H * (1 - from));
}

/** Text with a thick dark outline and a soft shadow, so it reads on any picture. */
function bold(ctx: Ctx, text: string, x: number, y: number, size: number, fill = "#ffffff", outline = "#000000"): void {
	ctx.font = `400 ${size}px ${DISPLAY}`;
	ctx.lineJoin = "round";
	ctx.shadowColor = "rgba(0,0,0,0.6)";
	ctx.shadowBlur = size * 0.25;
	ctx.shadowOffsetY = size * 0.06;
	ctx.strokeStyle = outline;
	ctx.lineWidth = size * 0.16;
	ctx.strokeText(text, x, y);
	ctx.shadowColor = "transparent";
	ctx.fillStyle = fill;
	ctx.fillText(text, x, y);
}

function pill(ctx: Ctx, text: string, x: number, y: number, size: number, color: string, align: "left" | "right" = "left"): { w: number; h: number } {
	ctx.font = `400 ${size}px ${DISPLAY}`;
	const w = ctx.measureText(text).width + size * 0.9;
	const h = size * 1.55;
	const left = align === "left" ? x : x - w;
	ctx.shadowColor = "rgba(0,0,0,0.45)";
	ctx.shadowBlur = size * 0.4;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.roundRect(left, y, w, h, size * 0.28);
	ctx.fill();
	ctx.shadowColor = "transparent";
	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, left + w / 2, y + h / 2 + size * 0.04);
	return { w, h };
}

/** The title in up to two lines, as large as fits (shrinks for long titles). */
function title(ctx: Ctx, text: string, x: number, bottom: number, maxWidth: number, size: number, align: CanvasTextAlign): void {
	if (!text.trim()) return;
	let s = size;
	let lines: string[] = [];
	for (; s > size * 0.45; s *= 0.9) {
		ctx.font = `400 ${s}px ${DISPLAY}`;
		lines = wrapText(ctx, text, maxWidth);
		if (lines.length <= 2) break;
	}
	lines = lines.slice(0, 2);
	ctx.textAlign = align;
	ctx.textBaseline = "alphabetic";
	lines.forEach((line, i) => bold(ctx, line, x, bottom - (lines.length - 1 - i) * s * 1.35, s));
}

/**
 * `blur`: parts of the picture to blur (fractions of the video picture), e.g. its burned-in subtitles, as the project
 * hides them in the video.
 */
export function drawCover(ctx: Ctx, image: CanvasImageSource & { width: number; height: number }, W: number, H: number, settings: CoverSettings, text: CoverText, blur: { x: number; y: number; w: number; h: number }[] = []): void {
	ctx.save();
	cover(ctx, image, W, H);
	if (blur.length) {
		const p = placement(image, W, H);
		for (const r of blur) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(p.x + r.x * p.w, p.y + r.y * p.h, r.w * p.w, r.h * p.h);
			ctx.clip();
			ctx.filter = `blur(${Math.round(Math.min(W, H) / 40)}px)`;
			cover(ctx, image, W, H);
			ctx.restore();
		}
	}
	const unit = Math.min(W, H) / 100;
	const tall = H > W;
	const pad = unit * 5;
	if (settings.template === "banner") {
		const band = unit * (tall ? 26 : 22);
		shade(ctx, W, H, 0.45, 0.55);
		ctx.fillStyle = settings.color;
		ctx.fillRect(0, H - band, W, band);
		ctx.fillStyle = "rgba(0,0,0,0.18)";
		ctx.fillRect(0, H - band, W, unit * 0.8);
		if (text.label) pill(ctx, text.label, W - pad, H - band - unit * (tall ? 12 : 10), unit * (tall ? 7.5 : 6), "#111111", "right");
		title(ctx, text.title, pad, H - band / 2 + unit * 4, W - pad * 2, unit * (tall ? 11 : 10), "left");
	} else if (settings.template === "bigNumber") {
		shade(ctx, W, H, 0.35, 0.75);
		if (text.number) {
			const size = unit * (tall ? 42 : 48);
			ctx.textAlign = "right";
			ctx.textBaseline = "alphabetic";
			ctx.font = `400 ${size}px ${DISPLAY}`;
			const x = W - pad;
			const base = tall ? H * 0.62 : H - pad * 1.4;
			ctx.shadowColor = settings.color;
			ctx.shadowBlur = size * 0.25;
			bold(ctx, text.number, x, base, size, "#ffffff", settings.color);
			if (text.word) {
				ctx.font = `400 ${size}px ${DISPLAY}`;
				const numberWidth = ctx.measureText(text.number).width;
				ctx.textAlign = "right";
				bold(ctx, text.word, x - numberWidth * 0.05, base - size * 0.95, size * 0.28, settings.color, "#ffffff");
			}
		}
		title(ctx, text.title, pad, H - pad * 1.2, tall ? W - pad * 2 : W * 0.55, unit * (tall ? 12 : 10), "left");
	} else if (settings.template === "minimal") {
		shade(ctx, W, H, 0.6, 0.45);
		if (text.label) pill(ctx, text.label, W - pad, H - pad - unit * (tall ? 10 : 7.5), unit * (tall ? 6 : 4.5), settings.color, "right");
	} else {
		// Badge
		shade(ctx, W, H, 0.45, 0.7);
		if (text.label) pill(ctx, text.label, pad, pad * (tall ? 2 : 1), unit * (tall ? 10 : 8), settings.color);
		title(ctx, text.title, W / 2, H - pad * (tall ? 3 : 1.3), W - pad * 2, unit * (tall ? 14 : 11), "center");
	}
	ctx.restore();
}

/** Makes the label pieces for a cover from the settings and the episode number. */
export function coverText(settings: CoverSettings, label: string, titleText: string): CoverText {
	const { word, number } = splitLabel(label);
	return { label, word, number, title: titleText };
}

