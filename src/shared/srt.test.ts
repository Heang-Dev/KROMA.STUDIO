import { describe, expect, it } from "vitest";
import { formatTimestamp, parseSubtitles, parseTimestamp, toSrt } from "./srt";

describe("timestamps", () => {
	it("parses SRT and VTT forms", () => {
		expect(parseTimestamp("00:01:02,345")).toBeCloseTo(62.345);
		expect(parseTimestamp("01:02.5")).toBeCloseTo(62.5);
	});
	it("formats back to SRT", () => {
		expect(formatTimestamp(3723.004)).toBe("01:02:03,004");
	});
});

describe("parseSubtitles", () => {
	it("reads SRT blocks and strips tags", () => {
		const cues = parseSubtitles("1\n00:00:01,000 --> 00:00:02,500\n<i>你好</i>\n\n2\n00:00:03,000 --> 00:00:04,000\n世界\n");
		expect(cues).toEqual([
			{ start: 1, end: 2.5, text: "你好" },
			{ start: 3, end: 4, text: "世界" },
		]);
	});
	it("reads WebVTT with cue settings", () => {
		const cues = parseSubtitles("WEBVTT\n\n00:00:01.000 --> 00:00:02.000 align:start\nHello\n");
		expect(cues).toEqual([{ start: 1, end: 2, text: "Hello" }]);
	});
	it("merges repeated rolling captions", () => {
		const cues = parseSubtitles("00:00:01.000 --> 00:00:02.000\nA\n\n00:00:02.000 --> 00:00:03.000\nA\n");
		expect(cues).toEqual([{ start: 1, end: 3, text: "A" }]);
	});
	it("round-trips through toSrt", () => {
		const srt = toSrt([{ start: 1, end: 2, text: "សួស្តី" }]);
		expect(parseSubtitles(srt)).toEqual([{ start: 1, end: 2, text: "សួស្តី" }]);
	});
});
