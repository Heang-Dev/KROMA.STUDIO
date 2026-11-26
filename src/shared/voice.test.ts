import { describe, expect, it } from "vitest";
import { MAX_CATCH_UP_TEMPO, MAX_TEMPO, planVoice, voiceTempo } from "./voice";

describe("voiceTempo", () => {
	it("keeps natural speed when the line fits", () => expect(voiceTempo(2, 0, 3)).toBe(1));
	it("speeds up to fit the gap", () => expect(voiceTempo(3, 0, 2)).toBeCloseTo(1.5));
	it("never goes past the limit", () => expect(voiceTempo(10, 0, 2)).toBe(MAX_TEMPO));
});

describe("planVoice", () => {
	it("leaves lines that fit untouched", () => {
		const plan = planVoice([
			{ start: 0, slotEnd: 3, duration: 2 },
			{ start: 3, slotEnd: 6, duration: 2.5 },
		]);
		expect(plan.map((p) => [p.start, p.tempo])).toEqual([
			[0, 1],
			[3, 1],
		]);
	});

	it("never cuts a long line: the next one starts a little later instead", () => {
		const plan = planVoice([
			{ start: 0, slotEnd: 1, duration: 2 }, // 2 s of speech in a 1 s slot
			{ start: 1, slotEnd: 5, duration: 1 },
		]);
		// First line plays fully (sped up to the limit), second waits for it.
		expect(plan[0].end - plan[0].start).toBeCloseTo(2 / plan[0].tempo);
		expect(plan[1].start).toBeGreaterThanOrEqual(plan[0].end);
		expect(plan[1].start - 1).toBeLessThanOrEqual(1.25);
	});

	it("catches up harder only when it would fall far behind", () => {
		const plan = planVoice([{ start: 0, slotEnd: 1, duration: 6 }]);
		expect(plan[0].tempo).toBeLessThanOrEqual(MAX_CATCH_UP_TEMPO);
		expect(plan[0].tempo).toBeGreaterThan(MAX_TEMPO);
	});

	it("recovers the lag in a pause", () => {
		const plan = planVoice([
			{ start: 0, slotEnd: 1, duration: 2 },
			{ start: 5, slotEnd: 8, duration: 1 },
		]);
		expect(plan[1].start).toBe(5);
		expect(plan[1].tempo).toBe(1);
	});
});
