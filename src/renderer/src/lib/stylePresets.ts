import type { StylePreset } from "@shared/batch";
import type { SubtitleStyle } from "@shared/types";

export type Preset = StylePreset;

// Subtitle colours are part of the video picture, not the app theme, so they are plain colour values.
export const PRESETS: Record<Preset, Partial<SubtitleStyle>> = {
	classic: { color: "#ffffff", outlineColor: "#000000", outline: 0.12, box: false },
	yellow: { color: "#ffe14d", outlineColor: "#000000", outline: 0.12, box: false },
	box: { color: "#ffffff", outline: 0, box: true, boxColor: "rgba(0,0,0,0.6)" },
	tiktok: { color: "#ffffff", outlineColor: "#000000", outline: 0.16, box: false, bold: true },
};

export const PRESET_OPTIONS: { value: Preset; label: string }[] = [
	{ value: "classic", label: "Classic" },
	{ value: "yellow", label: "Yellow" },
	{ value: "box", label: "Box" },
	{ value: "tiktok", label: "TikTok" },
];

export function currentPreset(style: SubtitleStyle): Preset | "" {
	const match = (Object.keys(PRESETS) as Preset[]).find((key) => Object.entries(PRESETS[key]).every(([k, v]) => style[k as keyof SubtitleStyle] === v));
	return match ?? "";
}
