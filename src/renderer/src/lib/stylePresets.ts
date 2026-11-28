import { STYLE_PRESETS, type StylePreset } from "@shared/batch";
import type { SubtitleFont, SubtitleStyle } from "@shared/types";

export type Preset = StylePreset;

/** The parts of the style a preset sets: the whole look. Size, position and Bilingual stay as you set them. */
type Look = Pick<SubtitleStyle, "color" | "outlineColor" | "outline" | "box" | "boxColor" | "bold"> & { shadow: number; shadowColor: string; font: SubtitleFont };

type Group = "Outlined" | "Glow" | "Khmer fonts" | "On a box";

const DARK_BOX = "rgba(0,0,0,0.6)";
const BASE: Look = { color: "#ffffff", outlineColor: "#000000", outline: 0.12, box: false, boxColor: DARK_BOX, bold: true, shadow: 0, shadowColor: "", font: "kantumruy" };
const outlined = (look: Partial<Look>): Look => ({ ...BASE, ...look });
const boxed = (look: Partial<Look>): Look => ({ ...BASE, outline: 0, box: true, ...look });

// Subtitle colours are part of the video picture, not the app theme, so they are plain colour values.
export const PRESETS: Record<Preset, Look & { label: string; group: Group }> = {
	classic: { ...outlined({}), label: "Classic", group: "Outlined" },
	yellow: { ...outlined({ color: "#ffe14d" }), label: "Yellow", group: "Outlined" },
	tiktok: { ...outlined({ outline: 0.18, shadow: 0.12 }), label: "TikTok", group: "Outlined" },
	minimal: { ...outlined({ outline: 0.04, bold: false, shadow: 0.15 }), label: "Minimal", group: "Outlined" },
	shadow: { ...outlined({ outline: 0, shadow: 0.35 }), label: "Soft shadow", group: "Outlined" },
	cinema: { ...outlined({ color: "#f4f1ea", outline: 0.05, bold: false, shadow: 0.25 }), label: "Cinema", group: "Outlined" },
	neon: { ...outlined({ color: "#5ef2ff", outlineColor: "#06204a", outline: 0.14, shadow: 0.3 }), label: "Neon", group: "Outlined" },
	pink: { ...outlined({ color: "#ff5fae", outlineColor: "#ffffff", shadow: 0.15 }), label: "Pink pop", group: "Outlined" },
	lime: { ...outlined({ color: "#b8ff3c", outline: 0.14 }), label: "Lime", group: "Outlined" },
	orange: { ...outlined({ color: "#ff9f1c", outline: 0.14, shadow: 0.1 }), label: "Orange", group: "Outlined" },

	goldGlow: { ...outlined({ color: "#fff4c2", outline: 0, shadow: 0.6, shadowColor: "#ffb300" }), label: "Gold glow", group: "Glow" },
	fire: { ...outlined({ color: "#fff1a8", outlineColor: "#c2410c", outline: 0.1, shadow: 0.55, shadowColor: "#ff3d00" }), label: "Fire", group: "Glow" },
	ice: { ...outlined({ color: "#e0f7ff", outlineColor: "#0369a1", outline: 0.1, shadow: 0.5, shadowColor: "#38bdf8" }), label: "Ice", group: "Glow" },
	magic: { ...outlined({ color: "#ffffff", outlineColor: "#5b21b6", outline: 0.1, shadow: 0.55, shadowColor: "#a855f7" }), label: "Magic", group: "Glow" },

	koulen: { ...outlined({ font: "koulen", outline: 0.1, shadow: 0.2 }), label: "Koulen", group: "Khmer fonts" },
	poster: { ...outlined({ font: "koulen", color: "#ffe14d", outline: 0.16, shadow: 0.15 }), label: "Poster", group: "Khmer fonts" },
	moulGold: { ...outlined({ font: "moul", color: "#ffd86b", outlineColor: "#3a1d00", outline: 0.1, shadow: 0.2 }), label: "Moul gold", group: "Khmer fonts" },
	moulRed: { ...outlined({ font: "moul", color: "#ffffff", outlineColor: "#9f1239", outline: 0.14 }), label: "Moul red", group: "Khmer fonts" },
	comic: { ...outlined({ font: "bayon", color: "#ffe14d", outline: 0.2 }), label: "Comic", group: "Khmer fonts" },
	battambang: { ...outlined({ font: "battambang", outline: 0.1 }), label: "Battambang", group: "Khmer fonts" },
	serif: { ...outlined({ font: "hanuman", color: "#f4f1ea", outline: 0.06, shadow: 0.2 }), label: "Serif", group: "Khmer fonts" },
	rounded: { ...outlined({ font: "dangrek", outline: 0, shadow: 0.35 }), label: "Rounded", group: "Khmer fonts" },
	handwritten: { ...outlined({ font: "fasthand", outline: 0.06, shadow: 0.3 }), label: "Handwritten", group: "Khmer fonts" },
	karaoke: { ...outlined({ font: "koulen", color: "#ffffff", outlineColor: "#1d4ed8", outline: 0.16, shadow: 0.2 }), label: "Karaoke", group: "Khmer fonts" },

	box: { ...boxed({}), label: "Dark box", group: "On a box" },
	softBox: { ...boxed({ boxColor: "rgba(0,0,0,0.35)", bold: false }), label: "Light box", group: "On a box" },
	whiteBox: { ...boxed({ color: "#111111", boxColor: "rgba(255,255,255,0.94)" }), label: "White box", group: "On a box" },
	highlight: { ...boxed({ color: "#111111", boxColor: "#ffe14d" }), label: "Highlight", group: "On a box" },
	violetBox: { ...boxed({ boxColor: "#7f22fe" }), label: "Violet box", group: "On a box" },
	redBox: { ...boxed({ boxColor: "#e11d48" }), label: "Red box", group: "On a box" },
	news: { ...boxed({ font: "koulen", boxColor: "#b91c1c" }), label: "News", group: "On a box" },
	blueBox: { ...boxed({ boxColor: "#1d4ed8" }), label: "Blue box", group: "On a box" },
	greenBox: { ...boxed({ color: "#052e16", boxColor: "#4ade80" }), label: "Green box", group: "On a box" },
};

/** A preset's look alone (what gets applied), without its label and group. */
export function lookOf(preset: Preset): Look {
	const { label: _label, group: _group, ...look } = PRESETS[preset];
	return look;
}

export const PRESET_OPTIONS: { value: Preset; label: string; group: Group }[] = STYLE_PRESETS.map((value) => ({ value, label: PRESETS[value].label, group: PRESETS[value].group }));

/** Missing in projects from before these existed: they mean "none" / the default font. */
const MISSING: Partial<Record<keyof Look, unknown>> = { shadow: 0, shadowColor: "", font: "kantumruy" };

/** The preset the style looks like now, or "" when changed by hand. */
export function currentPreset(style: SubtitleStyle): Preset | "" {
	const match = STYLE_PRESETS.find((key) => {
		const look = lookOf(key);
		// Without a box its colour isn't seen, so it doesn't count; likewise the outline colour without an outline.
		return Object.entries(look).every(([k, v]) => (k === "boxColor" && !look.box) || (k === "outlineColor" && !look.outline) || (style[k as keyof SubtitleStyle] ?? MISSING[k as keyof Look]) === v);
	});
	return match ?? "";
}
