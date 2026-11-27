import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./types";
import { actionLabel, batchSummary, createBatchTracker, kindOn, noticePlan, relativeTime, systemAllowed } from "./notify";

describe("relative time", () => {
	const now = new Date(2026, 10, 27, 12, 0, 0).getTime();
	it("reads like a person would say it", () => {
		expect(relativeTime(now, now)).toBe("just now");
		expect(relativeTime(now - 30_000, now)).toBe("just now");
		expect(relativeTime(now - 2 * 60_000, now)).toBe("2 min ago");
		expect(relativeTime(now - 59 * 60_000, now)).toBe("59 min ago");
		expect(relativeTime(now - 3 * 3600_000, now)).toBe("3 h ago");
		expect(relativeTime(now - 26 * 3600_000, now)).toBe("yesterday");
		expect(relativeTime(now - 4 * 86400_000, now)).toBe("4 days ago");
	});
	it("shows the date after a week, and never the future", () => {
		expect(relativeTime(now - 30 * 86400_000, now)).not.toMatch(/ago/);
		expect(relativeTime(now + 60_000, now)).toBe("just now");
	});
});

describe("download runs", () => {
	it("shows system notifications for the first three in a row only, then a summary", () => {
		const batch = createBatchTracker(3);
		const shown = Array.from({ length: 12 }, (_, i) => batch.item(i !== 5).system);
		expect(shown).toEqual([true, true, true, false, false, false, false, false, false, false, false, false]);
		expect(batch.finish()).toEqual({ title: "11 videos downloaded · 1 failed", tone: "error" });
	});
	it("needs no summary for a small run, and starts over after one", () => {
		const batch = createBatchTracker(3);
		batch.item(true);
		batch.item(true);
		expect(batch.finish()).toBeNull();
		expect(batch.count).toBe(0);
		expect(batch.item(true).system).toBe(true);
		for (let i = 0; i < 4; i++) batch.item(true);
		expect(batch.finish()).toEqual({ title: "5 videos downloaded", tone: "success" });
	});
	it("words the summary", () => {
		expect(batchSummary(1, 0)).toBe("1 video downloaded");
		expect(batchSummary(0, 2)).toBe("2 failed");
		expect(batchSummary(12, 1)).toBe("12 videos downloaded · 1 failed");
	});
});

describe("notification settings", () => {
	it("follows on/off and only-failures", () => {
		expect(systemAllowed({ notifySystem: true, notifyOnlyErrors: false }, "success")).toBe(true);
		expect(systemAllowed({ notifySystem: false, notifyOnlyErrors: false }, "error")).toBe(false);
		expect(systemAllowed({ notifySystem: true, notifyOnlyErrors: true }, "success")).toBe(false);
		expect(systemAllowed({ notifySystem: true, notifyOnlyErrors: true }, "error")).toBe(true);
	});
	it("labels the buttons", () => {
		expect(actionLabel({ kind: "showFile", path: "/a.mp4" }, "darwin")).toBe("Show in Finder");
		expect(actionLabel({ kind: "showFile", path: "/a.mp4" }, "win32")).toBe("Show in folder");
		expect(actionLabel({ kind: "view", view: "downloads" })).toBe("Open Downloads");
		expect(actionLabel({ kind: "callback", label: "Retry" })).toBe("Retry");
	});
});

describe("notice plan", () => {
	const prefs = { ...DEFAULT_SETTINGS };
	it("by default: system notification in the background, or for a failure; always a toast", () => {
		expect(noticePlan(prefs, { tone: "success", kind: "export", background: true })).toEqual({ toast: true, system: true, silent: false });
		expect(noticePlan(prefs, { tone: "success", kind: "export", background: false })).toMatchObject({ toast: true, system: false });
		expect(noticePlan(prefs, { tone: "error", kind: "export", background: false })).toMatchObject({ toast: true, system: true });
	});
	it("a kind switched off: no system notification, no toast for success, a toast for failure", () => {
		const off = { ...prefs, notifyDownloads: false };
		expect(kindOn(off, "downloads")).toBe(false);
		expect(kindOn(off, "export")).toBe(true);
		expect(kindOn(off, "general")).toBe(true);
		expect(noticePlan(off, { tone: "success", kind: "downloads", background: true })).toMatchObject({ toast: false, system: false });
		expect(noticePlan(off, { tone: "error", kind: "downloads", background: true })).toMatchObject({ toast: true, system: false });
		expect(noticePlan(off, { tone: "success", kind: "export", background: true })).toMatchObject({ toast: true, system: true });
	});
	it("only failures", () => {
		const errorsOnly = { ...prefs, notifyOnlyErrors: true };
		expect(noticePlan(errorsOnly, { tone: "success", kind: "subtitles", background: true })).toMatchObject({ toast: true, system: false });
		expect(noticePlan(errorsOnly, { tone: "error", kind: "subtitles", background: true })).toMatchObject({ system: true });
	});
	it("system notifications off, and the sound", () => {
		expect(noticePlan({ ...prefs, notifySystem: false }, { tone: "error", background: true })).toMatchObject({ toast: true, system: false });
		expect(noticePlan({ ...prefs, notifySound: false }, { tone: "success", background: true })).toMatchObject({ system: true, silent: true });
	});
	it("the test notification shows even while Kroma is in front, but not when switched off", () => {
		expect(noticePlan(prefs, { tone: "success", background: false, force: true }).system).toBe(true);
		expect(noticePlan({ ...prefs, notifySystem: false }, { tone: "success", background: false, force: true }).system).toBe(false);
	});
});
