import { describe, expect, it } from "vitest";
import { type GreyFrame, findBurnedSubtitles } from "./hardsubs";

const W = 320;
const H = 180;

/** A frame of smooth "picture" (a gradient that changes per frame), with optional text strokes in a strip. */
function frame(seed: number, text?: { y: number; h: number; x0: number; x1: number }): GreyFrame {
	const data = new Uint8Array(W * H);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = (40 + ((x + y + seed * 13) % 120)) & 255;
	if (text) {
		// Letter strokes: alternating white and black columns, like outlined text.
		for (let y = text.y; y < text.y + text.h; y++) for (let x = text.x0; x < text.x1; x++) data[y * W + x] = (x + seed) % 4 < 2 ? 250 : 10;
	}
	return { width: W, height: H, data };
}

describe("finding burned-in subtitles", () => {
	it("finds the strip that keeps having text, and its width", () => {
		const frames = Array.from({ length: 24 }, (_, i) => frame(i, i % 4 === 3 ? undefined : { y: 150, h: 12, x0: 90 + (i % 3) * 10, x1: 230 - (i % 3) * 10 }));
		const found = findBurnedSubtitles(frames);
		expect(found).not.toBeNull();
		expect(found!.y).toBeLessThan(150 / H);
		expect(found!.y + found!.h).toBeGreaterThan(162 / H);
		expect(found!.y + found!.h).toBeLessThan(175 / H);
		expect(found!.x).toBeLessThan(90 / W);
		expect(found!.x + found!.w).toBeGreaterThan(230 / W);
		expect(found!.score).toBeGreaterThan(0.6);
	});

	it("finds nothing in a video without subtitles", () => {
		expect(findBurnedSubtitles(Array.from({ length: 24 }, (_, i) => frame(i)))).toBeNull();
	});

	it("ignores text that only shows up once (a sign in one shot)", () => {
		const frames = Array.from({ length: 24 }, (_, i) => frame(i, i === 5 ? { y: 140, h: 12, x0: 60, x1: 260 } : undefined));
		expect(findBurnedSubtitles(frames)).toBeNull();
	});

	it("doesn't look in the top half", () => {
		const frames = Array.from({ length: 24 }, (_, i) => frame(i, { y: 20, h: 12, x0: 60, x1: 260 }));
		expect(findBurnedSubtitles(frames)).toBeNull();
	});
});
