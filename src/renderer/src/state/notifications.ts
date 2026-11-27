import { create } from "zustand";
import { HISTORY_LIMIT, type NoticeEntry } from "@shared/notify";

// The notification history behind the bell in the title bar: finished and failed work, newest first, the last 100
// kept in localStorage (shared by every window, so each window's bell shows the same list).

export const STORAGE_KEY = "kroma.notifications";

export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export interface NotificationsState {
	entries: NoticeEntry[];
	/** Adds an entry on top (an entry with the same id, from another window or the main process, is kept once). */
	add: (entry: NoticeEntry) => void;
	markAllRead: () => void;
	clear: () => void;
	/** Reads the list again (another window changed it). */
	reload: () => void;
}

const isEntry = (e: unknown): e is NoticeEntry => {
	const x = e as NoticeEntry;
	return Boolean(x) && typeof x.id === "string" && typeof x.title === "string" && typeof x.time === "number" && (x.tone === "success" || x.tone === "error" || x.tone === "info");
};

/** The saved list, or [] when there's none, it's broken, or storage can't be read (private mode, tests). */
export function readEntries(storage: () => StorageLike | null): NoticeEntry[] {
	try {
		const raw = storage()?.getItem(STORAGE_KEY);
		if (!raw) return [];
		const list: unknown = JSON.parse(raw);
		return Array.isArray(list) ? list.filter(isEntry).map((e) => ({ ...e, read: Boolean(e.read) })).slice(0, HISTORY_LIMIT) : [];
	} catch {
		return [];
	}
}

function writeEntries(storage: () => StorageLike | null, entries: NoticeEntry[]): void {
	try {
		storage()?.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch {
		// Full or blocked storage: the list still works until Kroma closes.
	}
}

export function createNotifications(storage: () => StorageLike | null) {
	return create<NotificationsState>((set, get) => {
		const save = (entries: NoticeEntry[]) => {
			set({ entries });
			writeEntries(storage, entries);
		};
		return {
			entries: readEntries(storage),
			add: (entry) => {
				// Another window may have added entries since: start from the saved list, so none is lost.
				const current = merge(readEntries(storage), get().entries);
				if (current.some((e) => e.id === entry.id)) return set({ entries: current });
				save([entry, ...current].slice(0, HISTORY_LIMIT));
			},
			markAllRead: () => save(get().entries.map((e) => (e.read ? e : { ...e, read: true }))),
			clear: () => save([]),
			reload: () => set({ entries: readEntries(storage) }),
		};
	});
}

/** The saved list plus any of ours that isn't in it yet (storage that can't be written), newest first. */
function merge(saved: NoticeEntry[], mine: NoticeEntry[]): NoticeEntry[] {
	const ids = new Set(saved.map((e) => e.id));
	const extra = mine.filter((e) => !ids.has(e.id));
	return extra.length ? [...saved, ...extra].sort((a, b) => b.time - a.time).slice(0, HISTORY_LIMIT) : saved;
}

const browserStorage = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);

export const useNotifications = createNotifications(browserStorage);

export const unreadCount = (entries: NoticeEntry[]): number => entries.reduce((n, e) => n + (e.read ? 0 : 1), 0);
