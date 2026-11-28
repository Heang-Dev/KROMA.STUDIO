import { describe, expect, it } from "vitest";
import { STYLE_PRESETS } from "@shared/batch";
import { DEFAULT_STYLE, SUBTITLE_FONTS } from "@shared/types";
import { PRESETS, PRESET_OPTIONS, currentPreset, lookOf } from "./stylePresets";

describe("subtitle style presets", () => {
	it("recognises each preset once it's applied, and no two presets look the same", () => {
		const looks = new Set<string>();
		for (const preset of STYLE_PRESETS) {
			expect(currentPreset({ ...DEFAULT_STYLE, ...lookOf(preset) })).toBe(preset);
			looks.add(JSON.stringify(lookOf(preset)));
		}
		expect(looks.size).toBe(STYLE_PRESETS.length);
	});

	it("reads a project saved before shadows and fonts as Classic", () => {
		expect(currentPreset({ ...DEFAULT_STYLE })).toBe("classic");
	});

	it("keeps size, position and Bilingual out of the look", () => {
		for (const preset of STYLE_PRESETS) expect(Object.keys(lookOf(preset))).not.toEqual(expect.arrayContaining(["size"]));
		expect(lookOf("news")).not.toHaveProperty("position");
	});

	it("only uses fonts Kroma ships, and lists every preset once with a label", () => {
		for (const preset of STYLE_PRESETS) expect(SUBTITLE_FONTS[PRESETS[preset].font]).toBeDefined();
		expect(PRESET_OPTIONS.map((o) => o.value)).toEqual([...STYLE_PRESETS]);
		expect(PRESET_OPTIONS.every((o) => o.label)).toBe(true);
	});
});
