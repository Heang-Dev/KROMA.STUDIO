// System notifications (Notification Center on the Mac, the Action Center on Windows). The renderer keeps the
// history and asks for one through notify:system; work that finishes in the main process (the Download Center,
// updates) comes through notifyFromMain. Clicking one brings Kroma forward and runs the entry's action.

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BrowserWindow, Notification, app, shell } from "electron";
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
	if (!Notification.isSupported()) {
		logNotice(`not supported here: ${notice.title}`);
		return false;
	}
	const body = notice.detail ?? "";
	console.log(`[notify] system: ${notice.tone} · ${notice.kind ?? "general"} · ${plan.silent ? "silent" : "sound"} · ${notice.title}${body ? ` · ${body}` : ""}`);
	if (process.env.KROMA_SMOKE === "1" || process.env.KROMA_E2E === "1") return true; // logged, not shown, in test runs
	// On the Mac, Kroma plays the chosen sound itself and the notification is silent: the sound then plays even when
	// macOS hides Kroma's banners or mutes its notification sound (Focus, alert style None), and never twice.
	// Elsewhere the system's own notification sound.
	const mac = process.platform === "darwin";
	const sound = mac && !plan.silent ? soundFor(settings, notice.tone) : undefined;
	const n = new Notification({ title: notice.title, body, silent: mac ? true : plan.silent });
	if (sound) logNotice(playNoticeSound(sound) ? `played sound ${sound}` : `couldn't play sound ${sound}`);
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
	// What macOS did with it, for "Not seeing them?": shown (a banner, or Notification Center only), or failed.
	let shown = false;
	n.on("show", () => {
		shown = true;
		logNotice(`shown by the system: ${notice.title}`);
	});
	n.on("failed", (_e, error) => logNotice(`failed: ${notice.title}: ${error}`));
	setTimeout(() => !shown && logNotice(`no confirmation from the system after 5 s: ${notice.title}`), 5000);
	logNotice(`asked the system to show: ${notice.title}`);
	n.show();
	// In the Dock: a failure while you're in another app makes Kroma's icon bounce once (works without banners).
	if (process.platform === "darwin" && notice.tone === "error" && inBackground()) app.dock?.bounce("informational");
	return true;
}

/** notify.log in Kroma's settings folder: the last notifications and what the system did with them. */
const logFile = () => join(app.getPath("userData"), "notify.log");

export function logNotice(line: string): void {
	try {
		const file = logFile();
		// Keep it small: when it passes 64 KB, keep the newer half.
		if (existsSync(file) && statSync(file).size > 64_000) writeFileSync(file, readFileSync(file, "utf8").slice(-32_000));
		appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
	} catch {
		/* logging must never break a notification */
	}
}

/** Shows notify.log in Finder (made empty if there's none yet). */
export function showNotifyLog(): void {
	const file = logFile();
	if (!existsSync(file)) logNotice("log started");
	shell.showItemInFolder(file);
}

/** The unread count on Kroma's Dock icon (and the Linux launcher), so missed work shows even without banners. */
export function setUnreadBadge(count: number): void {
	try {
		app.setBadgeCount(Math.max(0, Math.round(count)));
	} catch {
		/* not supported here */
	}
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
	// The full path: an app opened from the Dock doesn't have a shell's PATH.
	const player = spawn("/usr/bin/afplay", [`/System/Library/Sounds/${sound}.aiff`], { stdio: "ignore", detached: false });
	player.on("error", (err) => logNotice(`sound ${sound} failed: ${err.message}`));
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
