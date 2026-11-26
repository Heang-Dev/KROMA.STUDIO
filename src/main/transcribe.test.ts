import { describe, expect, it } from "vitest";
import { clean, splitLong } from "./transcribe";

describe("transcription cleanup", () => {
	it("drops known Whisper inventions and repeats", () => {
		const out = clean([
			{ start: 0, end: 2, text: "你好" },
			{ start: 2, end: 3, text: "你好" },
			{ start: 5, end: 8, text: "请不吝点赞 订阅 转发" },
			{ start: 9, end: 10, text: "走吧", no_speech_prob: 0.95 },
		]);
		expect(out).toEqual([{ start: 0, end: 2, text: "你好" }]);
	});
	it("splits long lines at punctuation by length", () => {
		const out = splitLong({ start: 0, end: 10, text: "我们走吧，天快黑了。" });
		expect(out.map((c) => c.text)).toEqual(["我们走吧，", "天快黑了。"]);
		expect(out[1].end).toBe(10);
	});
});
