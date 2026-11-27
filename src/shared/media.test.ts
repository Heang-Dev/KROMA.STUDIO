import { describe, expect, it } from "vitest";
import { mediaPath, mediaUrl } from "./media";

const roundTrip = (path: string, platform: string) => mediaPath(new URL(mediaUrl(path)).pathname, platform);

describe("media links", () => {
	it("keeps Mac and Linux paths as they were", () => {
		expect(mediaUrl("/Users/me/Movies/a b.mp4")).toBe("kroma://media/Users/me/Movies/a%20b.mp4");
		expect(roundTrip("/home/me/Videos/ហាំប៊ឺហ្គឺ #1.mp4", "linux")).toBe("/home/me/Videos/ហាំប៊ឺហ្គឺ #1.mp4");
	});
	it("handles Windows paths with a drive letter and backslashes", () => {
		expect(roundTrip("C:\\Users\\me\\Videos\\Kroma Studio\\clip (2).mp4", "win32")).toBe("C:/Users/me/Videos/Kroma Studio/clip (2).mp4");
	});
});
