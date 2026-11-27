import { describe, expect, it } from "vitest";
import type { NoticeEntry } from "@shared/notify";
import { STORAGE_KEY, type StorageLike, createNotifications, readEntries, unreadCount } from "./notifications";

const memory = (): StorageLike & { data: Map<string, string> } => {
	const data = new Map<string, string>();
	return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};
const entry = (n: number, extra: Partial<NoticeEntry> = {}): NoticeEntry => ({ id: `e${n}`, time: 1000 + n, tone: "success", title: `Task ${n}`, read: false, ...extra });

describe("notification history", () => {
	it("adds newest first, once per id", () => {
		const storage = memory();
		const store = createNotifications(() => storage);
		store.getState().add(entry(1));
		store.getState().add(entry(2));
		store.getState().add(entry(2));
		expect(store.getState().entries.map((e) => e.id)).toEqual(["e2", "e1"]);
		expect(unreadCount(store.getState().entries)).toBe(2);
	});
	it("keeps the last 100", () => {
		const store = createNotifications(() => memory());
		for (let i = 0; i < 130; i++) store.getState().add(entry(i));
		const ids = store.getState().entries.map((e) => e.id);
		expect(ids).toHaveLength(100);
		expect(ids[0]).toBe("e129");
		expect(ids[99]).toBe("e30");
	});
	it("marks all read and clears", () => {
		const store = createNotifications(() => memory());
		store.getState().add(entry(1));
		store.getState().add(entry(2, { tone: "error" }));
		store.getState().markAllRead();
		expect(unreadCount(store.getState().entries)).toBe(0);
		store.getState().clear();
		expect(store.getState().entries).toEqual([]);
	});
	it("persists, and a new window reads the same list", () => {
		const storage = memory();
		const first = createNotifications(() => storage);
		first.getState().add(entry(1));
		first.getState().add(entry(2));
		first.getState().markAllRead();
		const second = createNotifications(() => storage);
		expect(second.getState().entries.map((e) => [e.id, e.read])).toEqual([["e2", true], ["e1", true]]);
		// Another window adds: this one's next add keeps it.
		second.getState().add(entry(3));
		first.getState().add(entry(4));
		expect(first.getState().entries.map((e) => e.id)).toEqual(["e4", "e3", "e2", "e1"]);
	});
	it("works with broken storage", () => {
		const throwing: StorageLike = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("full");
			},
		};
		const store = createNotifications(() => throwing);
		expect(store.getState().entries).toEqual([]);
		store.getState().add(entry(1));
		store.getState().add(entry(2));
		expect(store.getState().entries.map((e) => e.id)).toEqual(["e2", "e1"]);
		expect(createNotifications(() => null).getState().entries).toEqual([]);
	});
	it("ignores a damaged saved list", () => {
		const storage = memory();
		storage.setItem(STORAGE_KEY, "{not json");
		expect(readEntries(() => storage)).toEqual([]);
		storage.setItem(STORAGE_KEY, JSON.stringify([{ id: "x" }, entry(1), "junk"]));
		expect(readEntries(() => storage).map((e) => e.id)).toEqual(["e1"]);
	});
});
