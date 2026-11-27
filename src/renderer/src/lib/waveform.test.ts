import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/Preview", () => ({ mediaUrl: (p: string) => p }));
const { barsFrom } = await import("@/components/WaveformPlayer");

describe("waveform bars", () => {
	it("makes as many bars as fit, each the loudest point of its stretch", () => {
		const detail = [0.1, 0.9, 0.2, 0.3, 0.5, 0.4, 0.1, 0.2];
		expect(barsFrom(detail, 4)).toEqual([0.9, 0.3, 0.5, 0.2]);
		expect(barsFrom(detail, 2)).toEqual([0.9, 0.5]);
	});
	it("can show more bars than the outline has points", () => {
		expect(barsFrom([0.5, 1], 4)).toEqual([0.5, 0.5, 1, 1]);
	});
	it("shows flat bars before the recording is read", () => {
		expect(barsFrom([], 3)).toEqual([0.08, 0.08, 0.08]);
	});
});
