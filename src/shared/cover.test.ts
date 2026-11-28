import { describe, expect, it } from "vitest";
import { defaultCoverTitle, episodeLabel, episodeNumber, toKhmerDigits } from "./cover";

describe("episode covers", () => {
	it("reads the episode number from the usual names", () => {
		expect(episodeNumber("/x/My Drama/05 - The return.kroma")).toBe(5);
		expect(episodeNumber("Love story EP12")).toBe(12);
		expect(episodeNumber("Ep. 3 finale")).toBe(3);
		expect(episodeNumber("霸道总裁 第27集")).toBe(27);
		expect(episodeNumber("រឿង ភាគ ១៤")).toBe(14);
		expect(episodeNumber("Part 2")).toBe(2);
		expect(episodeNumber("Trailer", null, "#7 behind the scenes")).toBe(7);
		expect(episodeNumber("A day in 2024")).toBeNull();
	});

	it("words the label", () => {
		expect(episodeLabel(15, "khmer")).toBe("ភាគ ១៥");
		expect(episodeLabel(5, "ep")).toBe("EP 5");
		expect(episodeLabel(5, "part")).toBe("Part 5");
		expect(episodeLabel(5, "custom", "វគ្គ")).toBe("វគ្គ ៥");
		expect(episodeLabel(5, "custom", "Episode")).toBe("Episode 5");
		expect(toKhmerDigits(2026)).toBe("២០២៦");
	});

	it("titles the cover with the series folder", () => {
		expect(defaultCoverTitle("/Lib/projects/CEO Drama/03 - Meeting.kroma", "Meeting")).toBe("CEO Drama");
		expect(defaultCoverTitle("/Lib/projects/03 - Meeting.kroma", "03 - Meeting")).toBe("Meeting");
		expect(defaultCoverTitle(null, "My video")).toBe("My video");
	});
});
