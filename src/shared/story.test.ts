import { describe, expect, it } from "vitest";
import { detectSpeakers, parseStory, spokenText, splitPauses } from "./story";

describe("story scripts", () => {
	it("reads pauses in seconds and milliseconds, kept between 0.1 and 10 s", () => {
		expect(splitPauses("Hi [pause 0.5s] there [PAUSE]")).toEqual(["Hi", 0.5, "there", 1]);
		expect([splitPauses("[pause 500ms]"), splitPauses("[pause 99s]"), splitPauses("[pause 0s]")]).toEqual([[0.5], [10], [0.1]]);
	});

	it("reads Khmer digits like the engine does", () => {
		expect(splitPauses("[pause ២s]")).toEqual([2]);
	});

	it("reads speakers, one-line styles and own-line pauses", () => {
		expect(parseStory("Narrator: Once.\n[pause 2s]\nSokha (whisper): Grandpa?\nplain")).toEqual([
			{ type: "line", speaker: "Narrator", text: "Once.", style: null },
			{ type: "pause", seconds: 2 },
			{ type: "line", speaker: "Sokha", text: "Grandpa?", style: "whisper" },
			{ type: "line", speaker: "Narrator", text: "plain", style: null },
		]);
	});

	it("treats a line that is only pauses as a pause, and reads Khmer ៖", () => {
		expect(parseStory("Sokha: [pause 2s]")).toEqual([{ type: "pause", seconds: 2 }]);
		expect(parseStory("សុខា (ខ្សឹប)៖ លោកតា!")).toEqual([{ type: "line", speaker: "សុខា", text: "លោកតា!", style: "ខ្សឹប" }]);
	});

	it("keeps a link as the Narrator's line", () => {
		expect(parseStory("https://example.com")[0]).toMatchObject({ speaker: "Narrator" });
	});

	it("lists each speaker once, whatever the line's style", () => {
		expect(detectSpeakers("Sokha: a\nSokha (sad): b\nGrandpa: c")).toEqual(["Sokha", "Grandpa"]);
	});

	it("shows a line's words without its pauses", () => {
		expect(spokenText("x [pause 1s] y")).toBe("x y");
	});
});
