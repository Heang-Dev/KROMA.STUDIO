import { create } from "zustand";

// Panel sizes the user drags (left tools, right subtitles, timeline). A per-machine view preference, so it lives in
// localStorage; any storage error just means the default sizes.

export type PanelKey = "left" | "right" | "timeline";

export const PANEL_LIMITS: Record<PanelKey, { min: number; max: number; default: number }> = {
	left: { min: 240, max: 560, default: 320 },
	right: { min: 280, max: 680, default: 380 },
	timeline: { min: 140, max: 520, default: 210 },
};

const KEY = "kroma.layout";

function load(): Record<PanelKey, number> {
	const defaults = { left: PANEL_LIMITS.left.default, right: PANEL_LIMITS.right.default, timeline: PANEL_LIMITS.timeline.default };
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Record<PanelKey, number>>;
		for (const k of Object.keys(defaults) as PanelKey[]) if (typeof saved[k] === "number") defaults[k] = clamp(k, saved[k]);
	} catch {
		// unreadable: keep the defaults
	}
	return defaults;
}

const clamp = (key: PanelKey, value: number) => Math.round(Math.min(PANEL_LIMITS[key].max, Math.max(PANEL_LIMITS[key].min, value)));

interface LayoutState {
	sizes: Record<PanelKey, number>;
	resize: (key: PanelKey, value: number) => void;
	reset: (key: PanelKey) => void;
	persist: () => void;
}

export const useLayout = create<LayoutState>((set, get) => ({
	sizes: load(),
	resize: (key, value) => set((s) => ({ sizes: { ...s.sizes, [key]: clamp(key, value) } })),
	reset: (key) => {
		set((s) => ({ sizes: { ...s.sizes, [key]: PANEL_LIMITS[key].default } }));
		get().persist();
	},
	persist: () => {
		try {
			localStorage.setItem(KEY, JSON.stringify(get().sizes));
		} catch {
			// storage unavailable: the size lasts until the app closes
		}
	},
}));
