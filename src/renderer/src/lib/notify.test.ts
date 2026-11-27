import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

// A window in the background: no focus, and the main process's notify:system recorded.
const notifySystem = vi.fn(async () => true);
const showInFolder = vi.fn(async () => undefined);
Object.assign(globalThis, { window: { kroma: { notifySystem, showInFolder } }, document: { hasFocus: () => false } });

const { runTask, useEditor } = await import("@/state/store");
const { canRun, notify, runAction, setNotifyPrefs } = await import("./notify");
const { DEFAULT_SETTINGS } = await import("@shared/types");
const { useNotifications } = await import("@/state/notifications");

beforeEach(() => {
	useNotifications.getState().clear();
	notifySystem.mockClear();
	toast.success.mockClear();
	toast.error.mockClear();
});

describe("runTask notifications", () => {
	it("notifies when the work is done", async () => {
		const result = await runTask("asr-1", "Speech to text", async () => 42);
		expect(result).toBe(42);
		const [entry] = useNotifications.getState().entries;
		expect(entry).toMatchObject({ tone: "success", title: "Speech to text done", read: false });
		expect(notifySystem).toHaveBeenCalledWith(expect.objectContaining({ id: entry.id, tone: "success", title: "Speech to text done" }));
		expect(useEditor.getState().tasks["asr-1"].status).toBe("done");
	});
	it("words the notice from the result, or leaves it to the caller", async () => {
		await runTask("x-1", "Export", async () => "/out/EP3.mp4", { done: (path) => ({ tone: "success", title: "Exported EP3 · 1080p", action: { kind: "showFile", path } }) });
		await runTask("x-2", "Export", async () => "/out/EP4.mp4", { done: false });
		const entries = useNotifications.getState().entries;
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ title: "Exported EP3 · 1080p", action: { kind: "showFile", path: "/out/EP3.mp4" } });
		await runAction(entries[0]);
		expect(window.kroma.showInFolder).toHaveBeenCalledWith("/out/EP3.mp4");
	});
	it("notifies a failure with the reason and a Retry", async () => {
		const retry = vi.fn();
		const result = await runTask(
			"translate-1",
			"Translate to Khmer",
			async () => {
				throw new Error("Error invoking remote method 'task:translate': Error: The Gemini key is wrong.");
			},
			{ failed: "Translation failed", retry },
		);
		expect(result).toBeNull();
		const [entry] = useNotifications.getState().entries;
		expect(entry).toMatchObject({ tone: "error", title: "Translation failed", detail: "The Gemini key is wrong.", action: { kind: "callback", label: "Retry" } });
		expect(canRun(entry)).toBe(true);
		await runAction(entry);
		expect(retry).toHaveBeenCalledOnce();
		expect(notifySystem).toHaveBeenCalledOnce();
		// One toast for it, not two.
		expect(toast.error).toHaveBeenCalledOnce();
	});
	it("stays quiet when cancelled", async () => {
		await runTask("export-9", "Export", async () => {
			throw new Error("Cancelled");
		});
		expect(useNotifications.getState().entries).toEqual([]);
		expect(notifySystem).not.toHaveBeenCalled();
	});
	it("asks for a system notification in the foreground only for failures", async () => {
		Object.assign(document, { hasFocus: () => true });
		notify({ tone: "success", title: "Posted" });
		expect(notifySystem).not.toHaveBeenCalled();
		notify({ tone: "error", title: "Posting failed" });
		expect(notifySystem).toHaveBeenCalledOnce();
		Object.assign(document, { hasFocus: () => false });
	});
	it("a kind switched off is kept in the history, without a toast or system notification when it worked", async () => {
		setNotifyPrefs({ ...DEFAULT_SETTINGS, notifyDownloads: false });
		await runTask("download-1", "Download", async () => 1, { kind: "downloads" });
		expect(useNotifications.getState().entries[0]).toMatchObject({ title: "Download done", kind: "downloads" });
		expect(toast.success).not.toHaveBeenCalled();
		expect(notifySystem).not.toHaveBeenCalled();
		await runTask("download-2", "Download", async () => {
			throw new Error("Video unavailable");
		}, { kind: "downloads" });
		expect(useNotifications.getState().entries).toHaveLength(2);
		expect(toast.error).toHaveBeenCalledOnce();
		expect(notifySystem).not.toHaveBeenCalled();
		setNotifyPrefs({ ...DEFAULT_SETTINGS });
	});
	it("the test notification asks for a system notification while Kroma is in front", () => {
		Object.assign(document, { hasFocus: () => true });
		notify({ tone: "success", title: "Notifications work", force: true });
		expect(notifySystem).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
		Object.assign(document, { hasFocus: () => false });
	});
	it("a Retry saved before a restart can't run", () => {
		expect(canRun({ id: "old", time: 0, tone: "error", title: "x", read: false, action: { kind: "callback", label: "Retry" } })).toBe(false);
		expect(canRun({ id: "old", time: 0, tone: "success", title: "x", read: false, action: { kind: "view", view: "story" } })).toBe(true);
	});
});
