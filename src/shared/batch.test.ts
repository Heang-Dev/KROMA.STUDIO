import { describe, expect, it } from "vitest";
import {
	type BatchItem,
	DEFAULT_BATCH_OPTIONS,
	DEFAULT_PLATFORM_FORMAT,
	addItems,
	afterRestart,
	currentExport,
	EMPTY_BATCH,
	exportFileName,
	filterCounts,
	filterItems,
	groupByRun,
	pruneHistory,
	retryFrom,
	runText,
	stepStatus,
	exportPathFor,
	neededFormats,
	nextStep,
	nextToRun,
	planSteps,
	projectGroup,
	projectTitle,
	publishRequest,
	recordExport,
	retryItem,
	runSummary,
	stepText,
	uploadGroups,
} from "./batch";
import { DEFAULT_STYLE, type Project } from "./types";

const project = (patch: Partial<Project> = {}): Project => ({ version: 1, name: "EP1", aspect: "16:9", fit: "blur", media: [], clips: [], cues: [], style: { ...DEFAULT_STYLE }, context: "", ...patch });
const item = (patch: Partial<BatchItem>): BatchItem => ({ id: "a", projectPath: "/lib/projects/Show/01 - EP1.kroma", title: "01 - EP1", group: "Show", status: "waiting", steps: [], done: [], added: 1, ...patch });

describe("planSteps", () => {
	it("runs every chosen step in order, removing voices before the voice-over", () => {
		expect(planSteps({ ...DEFAULT_BATCH_OPTIONS, characters: true, voice: "cast", removeVoices: true, style: "tiktok" })).toEqual([
			"subtitles",
			"translate",
			"characters",
			"removeVoices",
			"voice",
			"style",
			"export-16:9",
			"export-9:16",
			"posts",
		]);
	});
	it("leaves out what's off", () => {
		expect(planSteps({ ...DEFAULT_BATCH_OPTIONS, subtitles: false, translate: false, writePosts: false, formats: ["9:16"] })).toEqual(["export-9:16"]);
	});
	it("removes voices only with a voice-over", () => {
		expect(planSteps({ ...DEFAULT_BATCH_OPTIONS, voice: "off", removeVoices: true })).not.toContain("removeVoices");
		expect(planSteps({ ...DEFAULT_BATCH_OPTIONS, voice: "one", removeVoices: false })).toEqual(["subtitles", "translate", "voice", "export-16:9", "export-9:16", "posts"]);
	});
	it("each character's voice without finding characters is one voice", () => {
		const steps = planSteps({ ...DEFAULT_BATCH_OPTIONS, voice: "cast", characters: false });
		expect(steps).toContain("voice");
		expect(steps).not.toContain("characters");
	});
	it("exports 16:9 before 9:16 whatever order they were ticked", () => {
		expect(planSteps({ ...DEFAULT_BATCH_OPTIONS, formats: ["9:16", "16:9"] }).filter((s) => s.startsWith("export"))).toEqual(["export-16:9", "export-9:16"]);
	});
	it("defaults: subtitles, translation, both formats", () => {
		expect(DEFAULT_BATCH_OPTIONS.formats).toEqual(["16:9", "9:16"]);
		expect(DEFAULT_BATCH_OPTIONS.language).toBe("km");
	});
});

describe("platform formats", () => {
	it("YouTube 16:9, Facebook and TikTok 9:16", () => {
		expect(DEFAULT_PLATFORM_FORMAT).toEqual({ youtube: "16:9", facebook: "9:16", tiktok: "9:16" });
	});
	it("needs each format once", () => {
		expect(neededFormats({ platforms: ["youtube", "facebook", "tiktok"], formats: DEFAULT_PLATFORM_FORMAT })).toEqual(["16:9", "9:16"]);
		expect(neededFormats({ platforms: ["tiktok", "facebook"], formats: DEFAULT_PLATFORM_FORMAT })).toEqual(["9:16"]);
		expect(neededFormats({ platforms: [], formats: DEFAULT_PLATFORM_FORMAT })).toEqual([]);
	});
	it("gives each platform its own file, and Facebook a Reel only when tall and short", () => {
		const base = { name: "EP1", posts: [], files: { "16:9": "/x/w.mp4", "9:16": "/x/t.mp4" }, profile: "kroma", key: "k" };
		const req = publishRequest({ ...base, duration: 60, choice: { platforms: ["youtube", "facebook", "tiktok"], formats: DEFAULT_PLATFORM_FORMAT, youtubePrivacy: "public", tiktokMode: "post" } });
		expect(req.videos).toEqual({ youtube: "/x/w.mp4", facebook: "/x/t.mp4", tiktok: "/x/t.mp4" });
		expect(req.facebook?.mediaType).toBe("REELS");
		expect(publishRequest({ ...base, duration: 120, choice: { platforms: ["facebook"], formats: DEFAULT_PLATFORM_FORMAT, youtubePrivacy: "public", tiktokMode: "post" } }).facebook?.mediaType).toBe("VIDEO");
		expect(publishRequest({ ...base, duration: 30, choice: { platforms: ["facebook"], formats: { ...DEFAULT_PLATFORM_FORMAT, facebook: "16:9" }, youtubePrivacy: "public", tiktokMode: "post" } }).facebook?.mediaType).toBe("VIDEO");
	});
	it("uploads once per file", () => {
		expect(uploadGroups({ video: "/w.mp4", videos: { youtube: "/w.mp4", facebook: "/t.mp4", tiktok: "/t.mp4" }, platforms: ["youtube", "facebook", "tiktok"] })).toEqual([
			{ video: "/w.mp4", platforms: ["youtube"] },
			{ video: "/t.mp4", platforms: ["facebook", "tiktok"] },
		]);
		// Older requests (one file for all) stay one upload.
		expect(uploadGroups({ video: "/a.mp4", platforms: ["youtube", "tiktok"] })).toEqual([{ video: "/a.mp4", platforms: ["youtube", "tiktok"] }]);
	});
});

describe("resume and retry", () => {
	const steps = planSteps(DEFAULT_BATCH_OPTIONS);
	it("carries on from the first step not done", () => {
		expect(nextStep({ steps, done: [] })).toBe("subtitles");
		expect(nextStep({ steps, done: ["subtitles"] })).toBe("translate");
		expect(nextStep({ steps, done: steps })).toBeNull();
	});
	it("a retry keeps the finished steps and clears the error", () => {
		const failed = item({ status: "failed", steps, done: ["subtitles"], error: "Gemini is busy", current: "translate" });
		const again = retryItem(failed);
		expect(again).toMatchObject({ status: "waiting", done: ["subtitles"], error: undefined, current: undefined });
		expect(nextStep(again)).toBe("translate");
		expect(stepText(again)).toBe("2/5 · Translating");
	});
	it("after a restart a running project is stopped, where it was", () => {
		const state = afterRestart({ ...EMPTY_BATCH, items: [item({ status: "running", steps, done: ["subtitles"], current: "translate" }), item({ id: "b", status: "done" })] });
		expect(state.items.map((i) => i.status)).toEqual(["stopped", "done"]);
		expect(nextStep(state.items[0])).toBe("translate");
	});
});

describe("queue order", () => {
	it("one project at a time, first waiting first", () => {
		const items = [item({ id: "1", status: "done" }), item({ id: "2", status: "failed" }), item({ id: "3" }), item({ id: "4" })];
		expect(nextToRun(items)?.id).toBe("3");
		expect(nextToRun(items.map((i) => (i.id === "3" ? { ...i, status: "running" as const } : i)))).toBeNull();
		expect(nextToRun([item({ status: "done" })])).toBeNull();
	});
	it("adds projects once, at the end", () => {
		const first = addItems(EMPTY_BATCH, ["/p/Show/01 - EP1.kroma", "/p/Show/02 - EP2.kroma", "/p/Show/01 - EP1.kroma"], 100);
		expect(first.added).toBe(2);
		const second = addItems(first.state, ["/p/Show/02 - EP2.kroma", "/p/Other/EP9.kroma"], 200);
		expect(second.added).toBe(1);
		expect(second.state.items.map((i) => [i.title, i.group, i.status])).toEqual([
			["01 - EP1", "Show", "waiting"],
			["02 - EP2", "Show", "waiting"],
			["EP9", "Other", "waiting"],
		]);
	});
	it("sums up a run", () => {
		expect(runSummary(5, 1)).toBe("5 processed · 1 failed");
		expect(runSummary(2, 0, 1)).toBe("2 processed · 1 stopped");
	});
});

describe("export files", () => {
	it("names exports after the project and format, in the playlist's folder", () => {
		expect(projectTitle("/lib/projects/My Show/07 - The end.kroma")).toBe("07 - The end");
		expect(projectGroup("/lib/projects/My Show/07 - The end.kroma")).toBe("My Show");
		expect(exportFileName("/lib/projects/My Show/07 - The end.kroma", "9:16")).toBe("07 - The end (9x16).mp4");
		expect(exportPathFor("/lib/Exports/", "/lib/projects/My Show/07 - The end.kroma", "16:9")).toBe("/lib/Exports/My Show/07 - The end (16x9).mp4");
		expect(exportPathFor("C:\\Videos\\Exports", "C:\\Videos\\projects\\Show\\01 - EP1.kroma", "9:16")).toBe("C:\\Videos\\Exports\\Show\\01 - EP1 (9x16).mp4");
	});
	it("keeps one export per format", () => {
		let p = recordExport(project(), "16:9", "/e/a (16x9).mp4", "fp-wide");
		p = recordExport(p, "9:16", "/e/a (9x16).mp4", "fp-tall");
		p = recordExport(p, "9:16", "/e/a (9x16) 2.mp4", "fp-tall-2");
		expect(p.exports).toEqual({ "16:9": { path: "/e/a (16x9).mp4", fingerprint: "fp-wide" }, "9:16": { path: "/e/a (9x16) 2.mp4", fingerprint: "fp-tall-2" } });
		expect(p.lastExport).toEqual({ path: "/e/a (9x16) 2.mp4", fingerprint: "fp-tall-2" });
	});
	it("reuses an export only while it matches the project", () => {
		const p = recordExport(project(), "9:16", "/e/t.mp4", "fp1");
		expect(currentExport(p, "9:16", "fp1")).toBe("/e/t.mp4");
		expect(currentExport(p, "9:16", "fp2")).toBeNull();
		expect(currentExport(p, "16:9", "fp1")).toBeNull();
		// A project from before formats were kept: its last export counts for its own format.
		const old = project({ aspect: "16:9", lastExport: { path: "/e/old.mp4", fingerprint: "fp" } });
		expect(currentExport(old, "16:9", "fp")).toBe("/e/old.mp4");
		expect(currentExport(old, "9:16", "fp")).toBeNull();
	});
});

describe("step checklist", () => {
	const steps = planSteps({ ...DEFAULT_BATCH_OPTIONS, voice: "one", removeVoices: false });
	it("shows done, running, waiting and not-chosen steps", () => {
		const running = item({ status: "running", steps, done: ["subtitles"], current: "translate" });
		expect(stepStatus(running, "subtitles")).toBe("done");
		expect(stepStatus(running, "translate")).toBe("running");
		expect(stepStatus(running, "voice")).toBe("waiting");
		expect(stepStatus(running, "characters")).toBe("skipped");
		expect(stepStatus(running, "removeVoices")).toBe("skipped");
	});
	it("marks the step that failed, and the later ones waiting", () => {
		const failed = item({ status: "failed", steps, done: ["subtitles"], error: "No translator" });
		expect(stepStatus(failed, "translate")).toBe("failed");
		expect(stepStatus(failed, "voice")).toBe("waiting");
	});
	it("a project not started yet shows the plan it would run", () => {
		const fresh = item({});
		expect(stepStatus(fresh, "subtitles", steps)).toBe("waiting");
		expect(stepStatus(fresh, "characters", steps)).toBe("skipped");
		expect(stepStatus(fresh, "subtitles", [])).toBe("skipped");
	});
	it("retry from a step resets it and every later step to waiting, keeps the earlier ones", () => {
		const done = item({ status: "done", steps, done: [...steps], log: { subtitles: { status: "done", start: 1, end: 2 }, translate: { status: "done", start: 2, end: 3 }, voice: { status: "done", start: 3, end: 4 } } });
		const again = retryFrom(done, "translate");
		expect(again.status).toBe("waiting");
		expect(again.done).toEqual(["subtitles"]);
		expect(Object.keys(again.log ?? {})).toEqual(["subtitles"]);
		expect(steps.map((s) => stepStatus(again, s))).toEqual(["done", "waiting", "waiting", "waiting", "waiting", "waiting"]);
		expect(nextStep(again)).toBe("translate");
	});
	it("retrying a failed project from its failed step clears the error", () => {
		const failed = item({ status: "failed", steps, done: ["subtitles"], error: "x" });
		expect(retryFrom(failed, "translate")).toMatchObject({ status: "waiting", error: undefined, done: ["subtitles"] });
	});
});

describe("filters and history", () => {
	const items = [
		item({ id: "1", title: "EP1 Palace", status: "running", runId: "r2" }),
		item({ id: "2", title: "EP2 Palace", status: "waiting" }),
		item({ id: "3", title: "EP3", status: "stopped", runId: "r1" }),
		item({ id: "4", title: "EP4", status: "failed", runId: "r2" }),
		item({ id: "5", title: "EP5", status: "done", runId: "r1" }),
		item({ id: "6", title: "EP6", status: "done", runId: "r1", posted: { at: 1, results: [] } }),
	];
	it("counts each filter", () => {
		expect(filterCounts(items)).toEqual({ all: 6, running: 1, waiting: 2, failed: 1, ready: 1, posted: 1 });
	});
	it("filters and searches by title", () => {
		expect(filterItems(items, "waiting", "").map((i) => i.id)).toEqual(["2", "3"]);
		expect(filterItems(items, "all", "palace ep2").map((i) => i.id)).toEqual(["2"]);
		expect(filterItems(items, "posted", "").map((i) => i.id)).toEqual(["6"]);
	});
	it("groups by run, newest first, not started on top", () => {
		const groups = groupByRun(items, [{ id: "r1", at: 100 }, { id: "r2", at: 200 }]);
		expect(groups.map((g) => [g.run?.id ?? null, g.items.map((i) => i.id)])).toEqual([
			[null, ["2"]],
			["r2", ["1", "4"]],
			["r1", ["3", "5", "6"]],
		]);
		expect(runText(groups[2].items)).toBe("3 videos · 1 waiting · 2 ready · 1 posted");
		expect(runText(groups[1].items)).toBe("2 videos · 1 running · 1 failed");
	});
	it("keeps the last 20 runs and 500 videos, never unfinished ones", () => {
		const runs = Array.from({ length: 22 }, (_, k) => ({ id: `r${k}`, at: k }));
		const many = runs.flatMap((r) => [item({ id: `${r.id}-a`, runId: r.id, status: "done" }), item({ id: `${r.id}-b`, runId: r.id, status: "stopped" })]);
		const kept = pruneHistory({ ...EMPTY_BATCH, items: many, runs });
		expect(kept.items.some((i) => i.id === "r0-a")).toBe(false);
		expect(kept.items.some((i) => i.id === "r0-b")).toBe(true);
		expect(kept.items.some((i) => i.id === "r2-a")).toBe(true);
		const capped = pruneHistory({ ...EMPTY_BATCH, items: Array.from({ length: 510 }, (_, k) => item({ id: String(k), status: k < 505 ? "done" : "waiting" })) });
		expect(capped.items).toHaveLength(500);
		expect(capped.items[0].id).toBe("10");
	});
});
