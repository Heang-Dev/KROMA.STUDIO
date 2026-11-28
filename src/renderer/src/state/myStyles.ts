import { create } from "zustand";
import type { MyStyle, SubtitleStyle } from "@shared/types";

// My saved subtitle styles, loaded once and shared by the Style panel and Batch.
interface MyStylesState {
	list: MyStyle[];
	loaded: boolean;
	load: () => Promise<void>;
	add: (name: string, style: SubtitleStyle) => Promise<MyStyle>;
	remove: (id: string) => Promise<void>;
	rename: (id: string, name: string) => Promise<void>;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useMyStyles = create<MyStylesState>((set, get) => ({
	list: [],
	loaded: false,
	load: async () => {
		if (get().loaded) return;
		const list = (await window.kroma?.myStyles?.().catch(() => [])) ?? [];
		set({ list, loaded: true });
	},
	add: async (name, style) => {
		const entry: MyStyle = { id: newId(), name: name.trim() || "My style", style: { ...style } };
		set({ list: await window.kroma.setMyStyles([...get().list, entry]) });
		return entry;
	},
	remove: async (id) => set({ list: await window.kroma.setMyStyles(get().list.filter((s) => s.id !== id)) }),
	rename: async (id, name) => set({ list: await window.kroma.setMyStyles(get().list.map((s) => (s.id === id ? { ...s, name } : s))) }),
}));

/** The style a batch option means: one of my styles, by id. */
export function myStyleOf(option: string): MyStyle | undefined {
	return option.startsWith("my:") ? useMyStyles.getState().list.find((s) => `my:${s.id}` === option) : undefined;
}
