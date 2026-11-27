import { create } from "zustand";

// Panel sizes the user drags (left tools, right subtitles, timeline). A per-machine view preference, so it lives in
// localStorage; any storage error just means the default sizes.

export type PanelKey = "left" | "right" | "timeline";

/** A size that fits the window: `share` of its width, kept between `low` and `high`. */
const fit = (share: number, low: number, high: number) => {
	const width = typeof window === "undefined" ? 1440 : window.innerWidth;
	return Math.round(Math.min(high, Math.max(low, width * share)));
};

// The tools panel opens wide enough for its buttons and rows to sit on one line (about a quarter of the window), so
// nobody has to drag it wider first; the subtitles panel likewise.
export const PANEL_LIMITS: Record<PanelKey, { min: number; max: number; default: number }> = {
	left: { min: 300, max: 600, default: fit(0.25, 360, 440) },
	right: { min: 300, max: 680, default: fit(0.24, 360, 440) },
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
