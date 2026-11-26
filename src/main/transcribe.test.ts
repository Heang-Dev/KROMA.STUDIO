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
	it("splits a wordy multi-sentence line even when it is short in time", () => {
		const out = splitLong({ start: 0, end: 5.1, text: "我每天刷十几个小时手机,眼睛又干又涩,风一吹就直流眼泪,怎么办?" });
		expect(out.length).toBeGreaterThan(2);
		expect(out[0].text).toBe("我每天刷十几个小时手机,");
		expect(out[out.length - 1].end).toBeCloseTo(5.1);
	});
	it("keeps a short line whole", () => {
		expect(splitLong({ start: 0, end: 2, text: "你好,欢迎。" })).toHaveLength(1);
	});
	it("splits long lines at punctuation by length", () => {
		const out = splitLong({ start: 0, end: 10, text: "我们走吧，天快黑了。" });
		expect(out.map((c) => c.text)).toEqual(["我们走吧，", "天快黑了。"]);
		expect(out[1].end).toBe(10);
	});
});
