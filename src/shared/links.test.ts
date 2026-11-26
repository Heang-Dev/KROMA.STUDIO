import { describe, expect, it } from "vitest";
import { downloadErrorMessage, extractLink, extractShareTitle, normalizeLink } from "./links";

describe("normalizeLink", () => {
	it("drops Bilibili's language path and share tracking", () => {
		expect(normalizeLink("https://www.bilibili.com/en/video/BV1HUyGzPEVU/?share_source=copy_web&vd_source=abc")).toBe("https://www.bilibili.com/video/BV1HUyGzPEVU/");
	});
	it("keeps the part number of a multi-part Bilibili video", () => {
		expect(normalizeLink("https://m.bilibili.com/video/BV1xx?p=3&spm_id_from=333")).toBe("https://www.bilibili.com/video/BV1xx?p=3");
	});
	it("pulls the link out of a Douyin share message", () => {
		expect(normalizeLink("7.43 复制打开抖音，看看【某某的作品】 https://v.douyin.com/iRNBho6/ 你好")).toBe("https://v.douyin.com/iRNBho6/");
	});
	it("leaves ordinary links alone", () => {
		expect(normalizeLink("https://www.youtube.com/watch?v=jNQXAC9IVRw")).toBe("https://www.youtube.com/watch?v=jNQXAC9IVRw");
	});
	it("finds no link in plain text", () => {
		expect(extractLink("no link here")).toBeNull();
	});
});

describe("downloadErrorMessage", () => {
	it("explains an unsupported page", () => {
		expect(downloadErrorMessage("WARNING: [generic] Falling back on generic information extractor\nERROR: The extracted extension ('html') is unusual and will be skipped")).toMatch(/isn't a video page/);
	});
	it("explains a login wall", () => {
		expect(downloadErrorMessage("ERROR: Private video. Sign in if you've been granted access")).toMatch(/signed in/);
	});
	it("explains encryption", () => {
		expect(downloadErrorMessage("ERROR: This video is DRM protected")).toMatch(/protected/);
	});
});

describe("extractShareTitle", () => {
	it("reads Bilibili's bracketed title", () => {
		expect(extractShareTitle("【Is hamburger really junk food?】 https://www.bilibili.com/en/video/BV19EsE6uETv/?share_source=copy_web")).toBe("Is hamburger really junk food?");
	});
	it("reads a Chinese bracketed title", () => {
		expect(extractShareTitle("【汉堡真的是垃圾食品吗？】 https://b23.tv/abc")).toBe("汉堡真的是垃圾食品吗？");
	});
	it("uses the words before a link", () => {
		expect(extractShareTitle("My favourite drama ep 3 https://youtu.be/x")).toBe("My favourite drama ep 3");
	});
	it("has no title for a bare link", () => {
		expect(extractShareTitle("https://www.bilibili.com/video/BV19EsE6uETv/")).toBeNull();
	});
});
