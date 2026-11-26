import { describe, expect, it } from "vitest";
import { MAX_TEMPO, voiceTempo } from "./voice";

describe("voiceTempo", () => {
	it("keeps natural speed when the line fits", () => expect(voiceTempo(2, 0, 3)).toBe(1));
	it("speeds up to fit the gap", () => expect(voiceTempo(3, 0, 2)).toBeCloseTo(1.5));
	it("never goes past the limit", () => expect(voiceTempo(10, 0, 2)).toBe(MAX_TEMPO));
});
