import { describe, expect, it } from "vitest";
import type { PublishRequest } from "@shared/types";
import { normaliseResults, uploadFields } from "./publish";

const req: PublishRequest = {
	video: "/tmp/v.mp4",
	profile: "kroma",
	platforms: ["youtube", "facebook", "tiktok"],
	youtube: { title: "តើហាំប៊ឺហ្គឺជាអាហារឥតប្រយោជន៍មែនទេ?", description: "ពន្យល់អំពីហាំប៊ឺហ្គឺ", tags: ["ហាំប៊ឺហ្គឺ", "#food", "health tips"], privacy: "public" },
	facebook: { title: "FB title", description: "FB text", tags: ["food"], pageId: "123", mediaType: "REELS" },
	tiktok: { caption: "TikTok hook", tags: ["fyp", "food"], mode: "draft" },
	idempotencyKey: "abc",
};
const get = (f: [string, string][], name: string) => f.filter(([n]) => n === name).map(([, v]) => v);

describe("upload fields", () => {
	const f = uploadFields(req);
	it("names the profile, every platform and asks for async", () => {
		expect(get(f, "user")).toEqual(["kroma"]);
		expect(get(f, "platform[]")).toEqual(["youtube", "facebook", "tiktok"]);
		expect(get(f, "async_upload")).toEqual(["true"]);
	});
	it("gives each platform its own text, with hashtags", () => {
		expect(get(f, "youtube_title")[0]).toBe(req.youtube!.title);
		expect(get(f, "youtube_description")[0]).toBe("ពន្យល់អំពីហាំប៊ឺហ្គឺ\n\n#ហាំប៊ឺហ្គឺ #food #healthtips");
		expect(get(f, "tags[]")).toEqual(["ហាំប៊ឺហ្គឺ", "food", "health tips"]);
		expect(get(f, "facebook_description")[0]).toBe("FB text\n\n#food");
		expect(get(f, "facebook_page_id")).toEqual(["123"]);
		expect(get(f, "tiktok_title")[0]).toBe("TikTok hook\n\n#fyp #food");
		expect(get(f, "post_mode")).toEqual(["MEDIA_UPLOAD"]);
	});
	it("only sends the chosen platforms' fields", () => {
		const only = uploadFields({ ...req, platforms: ["youtube"] });
		expect(get(only, "tiktok_title")).toEqual([]);
		expect(get(only, "facebook_media_type")).toEqual([]);
	});
	it("keeps YouTube titles within 100 characters", () => {
		const long = uploadFields({ ...req, youtube: { ...req.youtube!, title: "x".repeat(150) } });
		expect(get(long, "youtube_title")[0].length).toBe(100);
	});
});

describe("results", () => {
	it("reads the keyed (sync) shape", () => {
		expect(normaliseResults({ youtube: { success: true, url: "https://youtu.be/x" }, tiktok: { success: false, error: "privacy" } })).toEqual([
			{ platform: "youtube", state: "done", url: "https://youtu.be/x", message: undefined },
			{ platform: "tiktok", state: "failed", url: undefined, message: "privacy" },
		]);
	});
	it("reads the list (async status) shape", () => {
		expect(normaliseResults([{ platform: "facebook", status: "processing" }, { platform: "tiktok", success: true, post_url: "https://tiktok.com/@a/1" }])).toEqual([
			{ platform: "facebook", state: "working", url: undefined, message: undefined },
			{ platform: "tiktok", state: "done", url: "https://tiktok.com/@a/1", message: undefined },
		]);
	});
});
