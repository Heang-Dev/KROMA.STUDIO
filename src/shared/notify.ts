import { t } from "./i18n";

// Notifications: the history entries both processes agree on, and the small rules they share.
// The renderer keeps the history (src/renderer/src/state/notifications.ts); the main process shows the system
// notifications (src/main/notify.ts) and reports work that finishes there (the Download Center, updates).

export type NoticeTone = "success" | "error" | "info";

/** What the work was about: each kind can be switched off in Settings → Notifications ("general" can't). */
export type NoticeKind = "downloads" | "subtitles" | "voices" | "export" | "updates" | "general";

/** The notification settings (a slice of Settings). */
export interface NotifyPrefs {
	notifySystem: boolean;
	notifyOnlyErrors: boolean;
	notifySound: boolean;
	notifySoundDone: string;
	notifySoundFailed: string;
	notifyDownloads: boolean;
	notifySubtitles: boolean;
	notifyVoices: boolean;
	notifyExport: boolean;
	notifyUpdates: boolean;
}

export const KIND_SETTING: Record<Exclude<NoticeKind, "general">, keyof NotifyPrefs> = {
	downloads: "notifyDownloads",
	subtitles: "notifySubtitles",
	voices: "notifyVoices",
	export: "notifyExport",
	updates: "notifyUpdates",
};

/** Whether a kind is switched on. */
export const kindOn = (prefs: NotifyPrefs, kind: NoticeKind = "general"): boolean => kind === "general" || prefs[KIND_SETTING[kind]] !== false;

/**
 * How one notice shows. It always goes into the history. A kind that's switched off shows no system notification
 * and no toast for success (a failure still toasts). A system notification needs the settings to allow it and Kroma
 * in the background, except for failures and the test notification (`force`).
 */
/** The Mac's own notification sounds (/System/Library/Sounds), offered in Settings → Notifications. */
export const MAC_SOUNDS = ["Glass", "Ping", "Pop", "Tink", "Hero", "Purr", "Blow", "Bottle", "Frog", "Funk", "Morse", "Submarine", "Sosumi", "Basso"] as const;

/** The sound a notice of this tone plays (info plays the "done" one). */
export const soundFor = (prefs: Pick<NotifyPrefs, "notifySoundDone" | "notifySoundFailed">, tone: NoticeTone): string =>
	(tone === "error" ? prefs.notifySoundFailed : prefs.notifySoundDone) || (tone === "error" ? "Basso" : "Glass");

export function noticePlan(prefs: NotifyPrefs, notice: { tone: NoticeTone; kind?: NoticeKind; background: boolean; force?: boolean }): { toast: boolean; system: boolean; silent: boolean } {
	const on = kindOn(prefs, notice.kind);
	return {
		toast: on || notice.tone === "error",
		system: on && systemAllowed(prefs, notice.tone) && (notice.background || notice.tone === "error" || Boolean(notice.force)),
		silent: !prefs.notifySound,
	};
}

/** What a notification's button does. Serializable, so it survives a restart (a `callback` only lives until then). */
export type StoredAction =
	| { kind: "openProject"; path: string }
	| { kind: "showFile"; path: string }
	| { kind: "view"; view: "story" | "downloads" | "voices" | "settings" | "batch"; section?: string }
	| { kind: "installUpdate" }
	/** Retry, or another function the caller gave: works until Kroma restarts. */
	| { kind: "callback"; label: string };

export interface NoticeEntry {
	id: string;
	time: number;
	tone: NoticeTone;
	kind?: NoticeKind;
	title: string;
	detail?: string;
	action?: StoredAction;
	read: boolean;
}

/** What the main process sends a window: a finished entry for the history (the system notification is already shown). */
export interface MainNotice {
	id: string;
	time: number;
	tone: NoticeTone;
	kind?: NoticeKind;
	title: string;
	detail?: string;
	action?: StoredAction;
}

/** What a window asks the main process to show as a system notification. */
export interface SystemNotice {
	id: string;
	tone: NoticeTone;
	kind?: NoticeKind;
	/** The test notification: shows even while Kroma is in front. */
	force?: boolean;
	title: string;
	detail?: string;
}

export const HISTORY_LIMIT = 100;

/** "just now", "2 min ago", "3 h ago", "yesterday", "4 days ago", then the date. */
export function relativeTime(time: number, now = Date.now()): string {
	const seconds = Math.max(0, Math.round((now - time) / 1000));
	if (seconds < 45) return t("just now");
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return t("{n} min ago", { n: minutes });
	const hours = Math.round(minutes / 60);
	if (hours < 24) return t("{n} h ago", { n: hours });
	const days = Math.round(hours / 24);
	if (days === 1) return t("yesterday");
	if (days < 7) return t("{n} days ago", { n: days });
	return new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short", year: new Date(time).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}

/** The label a stored action's button shows. */
export function actionLabel(action: StoredAction, platform = "darwin"): string {
	switch (action.kind) {
		case "openProject":
			return t("Open project");
		case "showFile":
			return platform === "darwin" ? t("Show in Finder") : t("Show in folder");
		case "installUpdate":
			return t("Restart");
		case "callback":
			return t(action.label);
		case "view":
			return t({ story: "Open Story", downloads: "Open Downloads", voices: "Open Voices", settings: "Open Settings", batch: "Open Batch" }[action.view]);
	}
}

/** "12 videos downloaded · 1 failed". */
export function batchSummary(done: number, failed: number): string {
	const parts = [];
	if (done) parts.push(done === 1 ? t("1 video downloaded") : t("{n} videos downloaded", { n: done }));
	if (failed) parts.push(t("{n} failed", { n: failed }));
	return parts.join(" · ") || t("Nothing downloaded");
}

/**
 * A run of Download Center videos, from the first finishing to the queue running dry. Every video goes into the
 * history, but only the first `maxSystem` show a system notification; a bigger run ends with one summary instead.
 */
export function createBatchTracker(maxSystem = 3) {
	let done = 0;
	let failed = 0;
	let shown = 0;
	return {
		/** A video finished (or failed): whether it may show a system notification. */
		item(ok: boolean): { system: boolean } {
			if (ok) done++;
			else failed++;
			const system = shown < maxSystem;
			if (system) shown++;
			return { system };
		},
		/** The queue is empty (or paused): the summary to show, if the run was big enough to need one. Starts a new run. */
		finish(): { title: string; tone: NoticeTone } | null {
			const total = done + failed;
			const summary = total > maxSystem ? { title: batchSummary(done, failed), tone: (failed ? "error" : "success") as NoticeTone } : null;
			done = 0;
			failed = 0;
			shown = 0;
			return summary;
		},
		get count() {
			return done + failed;
		},
	};
}

/** Whether the settings allow a system notification of this tone. */
export function systemAllowed(settings: { notifySystem: boolean; notifyOnlyErrors: boolean }, tone: NoticeTone): boolean {
	if (!settings.notifySystem) return false;
	return !settings.notifyOnlyErrors || tone === "error";
}
