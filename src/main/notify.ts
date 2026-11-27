// System notifications (Notification Center on the Mac, the Action Center on Windows). The renderer keeps the
// history and asks for one through notify:system; work that finishes in the main process (the Download Center,
// updates) comes through notifyFromMain. Clicking one brings Kroma forward and runs the entry's action.

import { randomUUID } from "node:crypto";
import { BrowserWindow, Notification } from "electron";
import { type MainNotice, type NoticeKind, type NoticeTone, type StoredAction, type SystemNotice, noticePlan } from "@shared/notify";
import { loadSettings } from "./settings";

/** Kept until clicked or closed: a notification that's garbage-collected loses its click handler. */
const live = new Set<Notification>();

/**
 * Shows a system notification, if the settings allow it. `target` is the window whose history holds the entry
 * (it runs the action on click); without one, the first window.
 */
export function showSystemNotice(notice: SystemNotice, target?: BrowserWindow | null): boolean {
	const settings = loadSettings();
	// The window has checked focus; the settings are checked here, where they're always current.
	const plan = noticePlan(settings, { tone: notice.tone, kind: notice.kind, background: true });
	if (!plan.system) return false;
	if (!Notification.isSupported()) return false;
	const body = notice.detail ?? "";
	console.log(`[notify] system: ${notice.tone} · ${notice.kind ?? "general"} · ${plan.silent ? "silent" : "sound"} · ${notice.title}${body ? ` · ${body}` : ""}`);
	if (process.env.KROMA_SMOKE === "1" || process.env.KROMA_E2E === "1") return true; // logged, not shown, in test runs
	const n = new Notification({ title: notice.title, body, silent: plan.silent });
	live.add(n);
	n.on("click", () => {
		live.delete(n);
		const win = (target && !target.isDestroyed() ? target : null) ?? BrowserWindow.getAllWindows()[0];
		if (!win) return;
		if (win.isMinimized()) win.restore();
		win.show();
		win.focus();
		win.webContents.send("notify:clicked", notice.id);
	});
	n.on("close", () => live.delete(n));
	n.show();
	return true;
}

/** True when none of Kroma's windows has the focus (the person is in another app). */
export const inBackground = (): boolean => !BrowserWindow.getFocusedWindow();

/**
 * Work that finished in the main process: every window adds it to its history (the same id, so it's there once),
 * and a system notification shows when Kroma is in the background (always for a failure), unless `system` is false.
 */
export function notifyFromMain(input: { tone: NoticeTone; kind: NoticeKind; title: string; detail?: string; action?: StoredAction; system?: boolean }): MainNotice {
	const notice: MainNotice = { id: randomUUID(), time: Date.now(), tone: input.tone, kind: input.kind, title: input.title, detail: input.detail, action: input.action };
	for (const w of BrowserWindow.getAllWindows()) w.webContents.send("notify:entry", notice);
	if (input.system !== false && (inBackground() || input.tone === "error")) showSystemNotice(notice);
	return notice;
}
