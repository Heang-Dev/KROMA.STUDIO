// System notifications (Notification Center on the Mac, the Action Center on Windows). The renderer keeps the
// history and asks for one through notify:system; work that finishes in the main process (the Download Center,
// updates) comes through notifyFromMain. Clicking one brings Kroma forward and runs the entry's action.

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { BrowserWindow, Notification, shell } from "electron";
import { MAC_SOUNDS, type MainNotice, type NoticeKind, type NoticeTone, type StoredAction, type SystemNotice, noticePlan, soundFor } from "@shared/notify";
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
	// On the Mac the notification plays the chosen system sound; elsewhere the system's own notification sound.
	const sound = process.platform === "darwin" && !plan.silent ? macSound(soundFor(settings, notice.tone)) : undefined;
	const n = new Notification({ title: notice.title, body, silent: plan.silent, ...(sound ? { sound } : {}) });
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

/** A Mac system sound's name, if it's one of the known ones and on this Mac. */
function macSound(name: string): string | undefined {
	return (MAC_SOUNDS as readonly string[]).includes(name) && existsSync(`/System/Library/Sounds/${name}.aiff`) ? name : undefined;
}

/**
 * Plays a notification sound in Kroma itself (a notice while Kroma is in front, or the Settings preview). On the Mac
 * it plays the system sound; elsewhere it returns false and the window plays its own chime.
 */
export function playNoticeSound(name: string): boolean {
	const sound = process.platform === "darwin" ? macSound(name) : undefined;
	if (!sound) return false;
	spawn("afplay", [`/System/Library/Sounds/${sound}.aiff`], { stdio: "ignore", detached: false }).on("error", () => undefined);
	return true;
}

/** Opens the system's notification settings, where Kroma can be allowed to show notifications. */
export function openNotificationSettings(): void {
	const url =
		process.platform === "darwin"
			? "x-apple.systempreferences:com.apple.Notifications-Settings.extension"
			: process.platform === "win32"
				? "ms-settings:notifications"
				: "";
	if (url) void shell.openExternal(url);
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
