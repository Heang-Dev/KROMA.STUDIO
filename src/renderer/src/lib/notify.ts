import { DEFAULT_SETTINGS } from "@shared/types";
import { type MainNotice, type NoticeEntry, type NoticeKind, type NoticeTone, type NotifyPrefs, type StoredAction, actionLabel, noticePlan, soundFor } from "@shared/notify";
import { unreadCount, useNotifications } from "@/state/notifications";
import { useEditor } from "@/state/store";
import { batchMode, noteBatchMessage } from "./batchMode";
import { platform } from "./platform";

// The one way to say long work finished or failed: it goes into the history (the bell in the title bar), shows the
// usual toast, and shows a system notification when Kroma is in the background (always for a failure), as the
// settings allow. Quick confirmations ("Saved", the zoom level) stay toast-only: call showToast for those.

export type NotifyAction =
	| { kind: "openProject"; path: string }
	| { kind: "showFile"; path: string }
	| { kind: "view"; view: "story" | "downloads" | "voices" | "settings" | "batch"; section?: string }
	| { kind: "installUpdate" }
	| { kind: "retry"; run: () => unknown }
	| { label: string; run: () => unknown };

export interface NotifyInput {
	tone: NoticeTone;
	/** What it's about, for Settings → Notifications → What to notify about. Default "general" (always on). */
	kind?: NoticeKind;
	title: string;
	detail?: string;
	action?: NotifyAction;
	/** The batch's own notice: shown while a batch runs (the steps' notices aren't, see batchMode). */
	batch?: boolean;
}

/** The notification settings, kept current by the Settings page and when a window comes forward. */
let prefs: NotifyPrefs = { ...DEFAULT_SETTINGS };
export function setNotifyPrefs(next: NotifyPrefs): void {
	prefs = next;
}
const refreshPrefs = () =>
	void window.kroma
		?.getSettings()
		.then(setNotifyPrefs)
		.catch(() => undefined);

/** Buttons that run a function (Retry): they work until Kroma restarts. */
const callbacks = new Map<string, () => unknown>();

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function stored(id: string, action: NotifyAction | undefined): StoredAction | undefined {
	if (!action) return undefined;
	if ("run" in action) {
		callbacks.set(id, action.run);
		return { kind: "callback", label: "label" in action ? action.label : "Retry" };
	}
	return action;
}

/** Notifies; returns the entry's id. `force` (the test notification) shows the system one even while Kroma is in front. */
export function notify(input: NotifyInput & { force?: boolean }): string {
	if (batchMode.on && !input.batch) {
		if (input.tone === "error") batchMode.lastError ??= input.detail ? `${input.title}: ${input.detail}` : input.title;
		else noteBatchMessage(input.title);
		return "";
	}
	const id = newId();
	const action = stored(id, input.action);
	const entry: NoticeEntry = { id, time: Date.now(), tone: input.tone, kind: input.kind, title: input.title, detail: input.detail, action, read: false };
	useNotifications.getState().add(entry);
	const background = typeof document !== "undefined" && !document.hasFocus();
	const plan = noticePlan(prefs, { tone: input.tone, kind: input.kind, background, force: input.force });
	if (plan.toast) toastFor(entry);
	// A system notification plays its own sound; a notice shown only in Kroma plays it here.
	if (plan.toast && !plan.system && !plan.silent && input.tone !== "info") playSound(soundFor(prefs, input.tone), input.tone);
	if (plan.system) void window.kroma?.notifySystem({ id, tone: input.tone, kind: input.kind, title: input.title, detail: input.detail, force: input.force }).catch(() => undefined);
	return id;
}

/** Plays a notification sound: the Mac's system sound, or a short chime elsewhere. */
export function playSound(name: string, tone: NoticeTone): void {
	void (window.kroma?.notifySound?.(name) ?? Promise.resolve(false)).then((played) => played || chime(tone)).catch(() => chime(tone));
}

/** Two soft rising notes when work is done, one low note when it failed. */
function chime(tone: NoticeTone): void {
	try {
		const ctx = new AudioContext();
		const notes = tone === "error" ? [220] : [660, 880];
		notes.forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			const start = ctx.currentTime + i * 0.12;
			osc.type = "sine";
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
			osc.connect(gain).connect(ctx.destination);
			osc.start(start);
			osc.stop(start + 0.4);
		});
		setTimeout(() => void ctx.close(), 1200);
	} catch {
		/* no audio: stay quiet */
	}
}

function toastFor(entry: NoticeEntry): void {
	const button = entry.action && canRun(entry) ? { label: actionLabel(entry.action, platform), onClick: () => void runAction(entry) } : undefined;
	useEditor.getState().showToast(entry.title, entry.tone === "error" ? "error" : "info", entry.detail, button);
}

/** Whether an entry's button can still work (a Retry from before a restart can't). */
export function canRun(entry: NoticeEntry): boolean {
	if (!entry.action) return false;
	return entry.action.kind !== "callback" || callbacks.has(entry.id);
}

/** Runs an entry's button: open the project, show the file, open a page, retry. */
export async function runAction(entry: NoticeEntry): Promise<void> {
	const action = entry.action;
	if (!action) return;
	const editor = useEditor.getState();
	switch (action.kind) {
		case "callback":
			await callbacks.get(entry.id)?.();
			return;
		case "showFile":
			return window.kroma.showInFolder(action.path);
		case "installUpdate":
			return window.kroma.installUpdate();
		case "openProject": {
			// Loaded when needed: actions.ts depends on the store, which depends on this file.
			const { openProjectAt } = await import("./actions");
			await openProjectAt(action.path);
			return;
		}
		case "view":
			if (action.view === "story") editor.openStory();
			else if (action.view === "downloads") editor.openDownloads();
			else if (action.view === "voices") editor.openVoices();
			else if (action.view === "batch") editor.openBatch(action.section === "ready" ? "ready" : "process");
			else editor.openSettings(action.section);
	}
}

/** Listens for entries from the main process, clicks on system notifications, and other windows' changes. */
export function startNotifications(): () => void {
	const stops = [
		window.kroma.onNotice((notice: MainNotice) => {
			const entry: NoticeEntry = { ...notice, read: false };
			useNotifications.getState().add(entry);
			// The main process showed the system notification already, when it should; here it's the toast.
			const plan = noticePlan(prefs, { tone: notice.tone, kind: notice.kind, background: false });
			if (document.hasFocus() && plan.toast) {
				toastFor(entry);
				// A failure also got a system notification (with its sound); finished work sounds here.
				if (notice.tone === "success" && !plan.silent) playSound(soundFor(prefs, notice.tone), notice.tone);
			}
		}),
		window.kroma.onNoticeClicked((id) => {
			const entry = useNotifications.getState().entries.find((e) => e.id === id);
			if (entry) void runAction(entry);
		}),
	];
	// The unread count on the Dock icon, so finished or failed work shows even when banners are off.
	let lastBadge = -1;
	const badge = () => {
		const n = unreadCount(useNotifications.getState().entries);
		if (n !== lastBadge) void window.kroma.setBadge?.((lastBadge = n)).catch(() => undefined);
	};
	badge();
	stops.push(useNotifications.subscribe(badge));
	const onStorage = (e: StorageEvent) => {
		if (e.key === null || e.key === "kroma.notifications") useNotifications.getState().reload();
	};
	window.addEventListener("storage", onStorage);
	// Another window may have changed the settings.
	refreshPrefs();
	window.addEventListener("focus", refreshPrefs);
	return () => {
		stops.forEach((stop) => stop());
		window.removeEventListener("storage", onStorage);
		window.removeEventListener("focus", refreshPrefs);
	};
}
