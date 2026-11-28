import { describe, expect, it } from "vitest";
import { ENTER_SECONDS, motionAt, motionFrames, wordAt, wordShares } from "./captionMotion";

describe("animated captions", () => {
	it("gives each word time by its length", () => {
		const shares = wordShares(["Hi", "everyone"]);
		expect(shares[0]).toBeCloseTo(0.2);
		expect(shares[1]).toBeCloseTo(0.8);
		expect(wordShares(["សួស្ដី", "បង"]).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
	});

	it("finds the word being said", () => {
		const shares = [0.25, 0.25, 0.5];
		expect([wordAt(shares, 4, 0), wordAt(shares, 4, 1.1), wordAt(shares, 4, 2.5), wordAt(shares, 4, 9)]).toEqual([0, 1, 2, 2]);
	});

	it("covers the whole line with frames, in order, without gaps", () => {
		for (const animation of ["none", "fade", "pop", "slide", "words", "build"] as const) {
			const frames = motionFrames(animation, [0.5, 0.3, 0.2], 10, 12);
			expect(frames[0].start).toBe(10);
			expect(frames[frames.length - 1].end).toBeCloseTo(12);
			for (let i = 1; i < frames.length; i++) expect(frames[i].start).toBeCloseTo(frames[i - 1].end);
		}
	});

	it("makes one image per word, and a few for coming in", () => {
		expect(motionFrames("words", [0.5, 0.3, 0.2], 0, 2).map((f) => f.motion?.word)).toEqual([0, 1, 2]);
		const pop = motionFrames("pop", [1], 0, 2);
		expect(pop.length).toBeGreaterThan(3);
		expect(pop[pop.length - 1]).toEqual({ start: ENTER_SECONDS, end: 2 });
		expect(motionFrames("none", [1], 0, 2)).toEqual([{ start: 0, end: 2 }]);
	});

	it("keeps a very short line whole", () => {
		const frames = motionFrames("fade", [1], 0, 0.1);
		expect(frames[frames.length - 1].end).toBeCloseTo(0.1);
	});

	it("tells the preview how far a line has come in", () => {
		expect(motionAt("pop", [1], 2, 0)?.enter).toBe(0);
		expect(motionAt("pop", [1], 2, 1)?.enter).toBe(1);
		expect(motionAt("none", [1], 2, 1)).toBeUndefined();
		expect(motionAt("words", [0.5, 0.5], 2, 1.5)?.word).toBe(1);
	});
});
