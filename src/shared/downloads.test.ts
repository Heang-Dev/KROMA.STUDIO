import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProject, naturalCompare, sidecarSubtitles, isVideoFile, parseTitleLines, splitShares, videoIdOf, type DownloadItem, isArchiveSkip, isRateLimited, nextToStart, numbered, parseExtractors, parseListing, queueSummary, safeName, splitLinks } from "./downloads";
import { downloadErrorMessage } from "./links";
import type { MediaItem } from "./types";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("splitLinks", () => {
	it("finds one link per line, in share messages too, without repeats", () => {
		const text = [
			"https://www.youtube.com/playlist?list=PL1",
			"",
			"look 【Episode 1】 https://www.bilibili.com/video/BV1xx?p=2&spm_id_from=333 wow",
			"https://www.youtube.com/playlist?list=PL1",
			"not a link",
		].join("\n");
		expect(splitLinks(text)).toEqual(["https://www.youtube.com/playlist?list=PL1", "https://www.bilibili.com/video/BV1xx?p=2"]);
	});
	it("points a YouTube channel's home page at its Videos tab", () => {
		expect(splitLinks("https://www.youtube.com/@TechWithTim")).toEqual(["https://www.youtube.com/@TechWithTim/videos"]);
		expect(splitLinks("https://www.youtube.com/channel/UC4JX40jDee_tINbkjycV4Sg")).toEqual(["https://www.youtube.com/channel/UC4JX40jDee_tINbkjycV4Sg/videos"]);
		expect(splitLinks("https://www.youtube.com/@TechWithTim/shorts")).toEqual(["https://www.youtube.com/@TechWithTim/shorts"]);
	});
	it("keeps the titles of share messages", () => {
		const text = "【第1集 回家】 https://b23.tv/abc123\n7.43 复制打开抖音，看看【某某的作品】 https://v.douyin.com/iRNBho6/ 你好\nhttps://www.bilibili.com/video/BV1gd1Hz5EMf";
		expect(splitShares(text)).toEqual([
			{ url: "https://b23.tv/abc123", shareTitle: "第1集 回家" },
			{ url: "https://v.douyin.com/iRNBho6/", shareTitle: "某某的作品" },
			{ url: "https://www.bilibili.com/video/BV1gd1Hz5EMf" },
		]);
	});
	it("reads a video's id from its link", () => {
		expect(videoIdOf("https://www.bilibili.com/video/BV1gd1Hz5EMf")).toBe("BV1gd1Hz5EMf");
		expect(videoIdOf("https://www.bilibili.com/video/BV1gd1Hz5EMf?p=3")).toBe("BV1gd1Hz5EMf_p3");
		expect(videoIdOf("https://www.youtube.com/watch?v=MMxFDaIOHsE")).toBe("MMxFDaIOHsE");
	});
	it("finds nothing in plain text", () => {
		expect(splitLinks("hello there")).toEqual([]);
	});
});

describe("parseListing", () => {
	it("reads a playlist", () => {
		const url = "https://www.youtube.com/playlist?list=PLzMcBGfZo4-lwGZWXz5Qgta_YNX3_vLS2";
		const source = parseListing(fixture("youtube-playlist.json"), url);
		expect(source).toMatchObject({ title: "AI Plays Flappy Bird - NEAT Python", kind: "playlist", count: 7, hasMore: false });
		expect(source.items).toHaveLength(3);
		expect(source.items[0]).toEqual({ url: "https://www.youtube.com/watch?v=MMxFDaIOHsE", videoId: "MMxFDaIOHsE", title: "Python Flappy Bird AI Tutorial (with NEAT) - Creating the Bird", duration: 775, index: 1 });
	});
	it("reads a channel page by page", () => {
		const json = JSON.stringify({
			_type: "playlist",
			id: "UC4JX40jDee_tINbkjycV4Sg",
			title: "Tech With Tim - Videos",
			extractor: "youtube:tab",
			playlist_count: null,
			entries: [
				{ _type: "url", id: "aaaaaaaaaaa", url: "https://www.youtube.com/watch?v=aaaaaaaaaaa", title: "A", duration: 10 },
				{ _type: "url", id: "bbbbbbbbbbb", url: "https://www.youtube.com/watch?v=bbbbbbbbbbb", title: "B", duration: null },
			],
		});
		const source = parseListing(json, "https://www.youtube.com/@TechWithTim/videos", 201, 2);
		expect(source).toMatchObject({ title: "Tech With Tim", kind: "channel", hasMore: true });
		expect(source.items.map((i) => [i.index, i.duration])).toEqual([
			[201, 10],
			[202, undefined],
		]);
	});
	it("reads a single video", () => {
		const json = JSON.stringify({ _type: "video", id: "jNQXAC9IVRw", title: "Me at the zoo", duration: 19, webpage_url: "https://www.youtube.com/watch?v=jNQXAC9IVRw" });
		const source = parseListing(json, "https://youtu.be/jNQXAC9IVRw");
		expect(source).toMatchObject({ kind: "video", title: "Me at the zoo", hasMore: false });
		expect(source.items).toEqual([{ url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", videoId: "jNQXAC9IVRw", title: "Me at the zoo", duration: 19, index: 1 }]);
	});
	it("reads a Bilibili channel whose entries have no titles", () => {
		const json = JSON.stringify({ _type: "playlist", id: "1937207449", title: "1937207449", extractor: "BilibiliSpaceVideo", entries: [{ _type: "url", url: "https://www.bilibili.com/video/BV1gd1Hz5EMf" }] });
		const source = parseListing(json, "https://space.bilibili.com/1937207449/video");
		expect(source).toMatchObject({ kind: "channel", title: "Channel 1937207449", untitled: true });
		expect(source.items).toEqual([{ url: "https://www.bilibili.com/video/BV1gd1Hz5EMf", videoId: "BV1gd1Hz5EMf", title: "BV1gd1Hz5EMf", duration: undefined, index: 1, untitled: true }]);
	});
	it("skips tabs on a channel home page", () => {
		const json = JSON.stringify({ _type: "playlist", title: "X", entries: [{ _type: "url", url: "https://www.youtube.com/@x/videos", title: "X - Videos" }, null] });
		expect(parseListing(json, "https://www.youtube.com/@x/featured").items).toEqual([]);
	});
});

describe("project files", () => {
	const media: MediaItem = { id: "m1", path: "/v/a.mp4", name: "a.mp4", duration: 12.5, width: 1280, height: 720, hasAudio: true, sourceUrl: "https://www.youtube.com/watch?v=x", siteSubtitles: { en: "/v/a.en.srt" } };
	it("puts the video on the timeline and names the project after it", () => {
		const project = buildProject(media, "Creating the Bird", () => "c1");
		expect(project).toMatchObject({ version: 1, name: "Creating the Bird", aspect: "16:9", clips: [{ id: "c1", mediaId: "m1", in: 0, out: 12.5 }], cues: [] });
		expect(project.media[0]).toMatchObject({ name: "Creating the Bird", sourceUrl: "https://www.youtube.com/watch?v=x", siteSubtitles: { en: "/v/a.en.srt" } });
	});
	it("makes a portrait video a 9:16 project", () => {
		expect(buildProject({ ...media, width: 1080, height: 1920 }, "Short", () => "c").aspect).toBe("9:16");
	});
	it("numbers files by their place in the playlist", () => {
		expect(numbered(7, 12, "Moving Birds")).toBe("07 - Moving Birds");
		expect(numbered(7, 250, "Moving Birds")).toBe("007 - Moving Birds");
		expect(numbered(0, undefined, "Me at the zoo")).toBe("Me at the zoo");
		expect(numbered(3, 9, 'What/is: "this"?')).toBe("03 - What is this");
	});
	it("makes safe file names", () => {
		expect(safeName("  ..a<b>c|d  ")).toBe("a b c d");
		expect(safeName("???")).toBe("Untitled");
		expect(safeName("x".repeat(200)).length).toBe(80);
	});
});

describe("yt-dlp output", () => {
	it("spots videos the download archive already has", () => {
		expect(isArchiveSkip("[youtube] MMxFDaIOHsE: has already been recorded in the archive")).toBe(true);
		expect(isArchiveSkip("[download] 100% of 12.00MiB")).toBe(false);
	});
	it("spots Bilibili's 412 block and explains it", () => {
		const error = "ERROR: [BilibiliSpaceVideo] 1937207449: Request is blocked by server (412), please wait and try later.";
		expect(isRateLimited(error)).toBe(true);
		expect(downloadErrorMessage(error)).toMatch(/Bilibili is blocking/);
		expect(isRateLimited("ERROR: [BilibiliSpaceVideo] 1: Request is rejected by server (352)")).toBe(true);
	});
	it("reads filled-in titles", () => {
		const out = "KROMA_TITLE https://www.bilibili.com/video/BV1gd1Hz5EMf|BV1gd1Hz5EMf|21.408|某人|会六馍的男人最帅了\nWARNING: x\nKROMA_TITLE https://www.bilibili.com/video/BV1xx|BV1xx|NA|NA|a | b\n";
		expect(parseTitleLines(out)).toEqual([
			{ url: "https://www.bilibili.com/video/BV1gd1Hz5EMf", id: "BV1gd1Hz5EMf", duration: 21.408, uploader: "某人", title: "会六馍的男人最帅了" },
			{ url: "https://www.bilibili.com/video/BV1xx", id: "BV1xx", duration: undefined, uploader: undefined, title: "a | b" },
		]);
	});
	it("spots YouTube's bot check and explains it", () => {
		const error = "ERROR: [youtube] abc: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication.";
		expect(isRateLimited(error)).toBe(true);
		expect(downloadErrorMessage(error)).toMatch(/Wait a while/);
	});
	it("lists sites, folding sub-extractors and marking broken ones", () => {
		const sites = parseExtractors("youtube\nyoutube:tab\n20min (CURRENTLY BROKEN)\nBiliBili\nbilibili:audio (CURRENTLY BROKEN)\ngeneric\n");
		expect(sites).toEqual([
			{ name: "20min", broken: true },
			{ name: "BiliBili", broken: false },
			{ name: "youtube", broken: false },
		]);
	});
});

describe("queue", () => {
	const item = (id: string, status: DownloadItem["status"]): DownloadItem => ({ id, url: `https://x/${id}`, title: id, group: "G", index: 1, status, progress: 0, quality: "720", subtitles: true, makeProjects: true, added: 0 });
	it("starts waiting items in order, up to the limit", () => {
		const items = [item("a", "done"), item("b", "downloading"), item("c", "waiting"), item("d", "failed"), item("e", "waiting"), item("f", "waiting")];
		expect(nextToStart({ items, paused: false }, 2).map((i) => i.id)).toEqual(["c"]);
		expect(nextToStart({ items, paused: false }, 3).map((i) => i.id)).toEqual(["c", "e"]);
		expect(nextToStart({ items, paused: false }, 1)).toEqual([]);
	});
	it("starts nothing while paused", () => {
		expect(nextToStart({ items: [item("a", "waiting")], paused: true }, 2)).toEqual([]);
	});
	it("sums up the queue", () => {
		expect(queueSummary([item("a", "done"), item("b", "skipped"), item("c", "downloading"), item("d", "waiting"), item("e", "failed")])).toBe("2 done · 1 downloading · 1 waiting · 1 failed");
	});
});

describe("importing files", () => {
	it("orders episodes naturally", () => {
		expect(["EP10.mp4", "EP2.mp4", "EP1.mp4"].sort(naturalCompare)).toEqual(["EP1.mp4", "EP2.mp4", "EP10.mp4"]);
		expect(["第10集.mp4", "第2集.mp4", "第1集.mp4"].sort(naturalCompare)).toEqual(["第1集.mp4", "第2集.mp4", "第10集.mp4"]);
		expect(["10 - z.mp4", "2 - y.mp4", "01 - x.mp4"].sort(naturalCompare)).toEqual(["01 - x.mp4", "2 - y.mp4", "10 - z.mp4"]);
	});
	it("finds subtitle files next to a video", () => {
		const names = ["EP1.mp4", "EP1.srt", "EP1.zh.srt", "EP1.en-US.srt", "EP10.srt", "EP1 extra.srt", "EP1.txt"];
		expect(sidecarSubtitles("EP1.mp4", names)).toEqual({ und: "EP1.srt", zh: "EP1.zh.srt", "en-US": "EP1.en-US.srt" });
		expect(sidecarSubtitles("EP2.mp4", names)).toEqual({});
	});
	it("knows video files", () => {
		expect(["a.MP4", "b.mkv", "c.srt", "d"].map(isVideoFile)).toEqual([true, true, false, false]);
	});
	it("numbers imported episodes like downloaded ones", () => {
		expect(numbered(3, 3, "EP10")).toBe("03 - EP10");
	});
});
