import { describe, expect, it } from "vitest";
import type { Clip, Cue } from "@shared/types";
import { clipAt, cueAt, deleteClip, moveClip, placeSourceCues, rippleRemove, splitAt, totalDuration, trimClip } from "./timeline";

const clip = (id: string, inn: number, out: number, mediaId = "m"): Clip => ({ id, mediaId, in: inn, out });
const cue = (id: string, start: number, end: number): Cue => ({ id, start, end, source: id, text: "" });

describe("clips", () => {
	it("finds the clip under a time", () => {
		const clips = [clip("a", 0, 10), clip("b", 20, 25)];
		expect(clipAt(clips, 12)?.id).toBe("b");
		expect(clipAt(clips, 12)?.start).toBe(10);
		expect(totalDuration(clips)).toBe(15);
	});

	it("splits a clip at the playhead", () => {
		const out = splitAt([clip("a", 5, 15)], 4);
		expect(out.map((c) => [c.in, c.out])).toEqual([
			[5, 9],
			[9, 15],
		]);
	});

	it("deleting a clip removes and shifts the subtitles", () => {
		const res = deleteClip([clip("a", 0, 10), clip("b", 0, 10)], [cue("1", 2, 4), cue("2", 12, 14)], "a");
		expect(res.clips.map((c) => c.id)).toEqual(["b"]);
		expect(res.cues).toEqual([cue("2", 2, 4)]);
	});

	it("moving a clip carries its subtitles", () => {
		const res = moveClip([clip("a", 0, 10), clip("b", 0, 5)], [cue("1", 2, 3), cue("2", 11, 12)], "b", 0);
		expect(res.clips.map((c) => c.id)).toEqual(["b", "a"]);
		expect(res.cues).toEqual([cue("2", 1, 2), cue("1", 7, 8)]);
	});

	it("trimming the start ripples later cues", () => {
		const res = trimClip([clip("a", 0, 10)], [cue("1", 1, 2), cue("2", 5, 6)], "a", "in", 3, 10);
		expect(res.clips[0].in).toBe(3);
		expect(res.cues).toEqual([cue("2", 2, 3)]);
	});
});

describe("cues", () => {
	it("keeps the outside part of a cue that overlaps a cut", () => {
		expect(rippleRemove([cue("1", 1, 5)], 3, 10)).toEqual([cue("1", 1, 3)]);
	});

	it("places source cues on each clip of that media", () => {
		const clips = [clip("x", 0, 5, "other"), clip("a", 10, 20)];
		const placed = placeSourceCues([{ start: 12, end: 14, text: "你好" }], "m", clips);
		expect(placed).toHaveLength(1);
		expect(placed[0]).toMatchObject({ start: 7, end: 9, source: "你好", text: "" });
	});

	it("finds the cue at a time", () => {
		const cues = [cue("1", 0, 1), cue("2", 2, 3), cue("3", 3, 4)];
		expect(cueAt(cues, 2.5)).toBe(1);
		expect(cueAt(cues, 1.5)).toBe(-1);
		expect(cueAt(cues, 3)).toBe(2);
	});
});
