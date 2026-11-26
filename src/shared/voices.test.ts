import { describe, expect, it } from "vitest";
import { KVS_TEMPLATES, VOICE_GROUPS, groupTemplates } from "./types";

describe("preset voice groups", () => {
	it("puts every template in a named group, once", () => {
		const grouped = groupTemplates(KVS_TEMPLATES);
		expect(grouped.map((g) => g.title)).not.toContain("More");
		expect(grouped.flatMap((g) => g.items).length).toBe(KVS_TEMPLATES.length);
	});
	it("only names templates that exist", () => {
		const names = new Set(KVS_TEMPLATES.map((t) => t.name));
		expect(VOICE_GROUPS.flatMap((g) => g.names).filter((n) => !names.has(n))).toEqual([]);
	});
	it("keeps unknown engine presets under More", () => {
		expect(groupTemplates([{ name: "Robot" }]).map((g) => g.title)).toEqual(["More"]);
	});
});

import { estimateSize } from "./types";
describe("export size estimate", () => {
	it("matches measured sizes for 5 minutes of 1080p", () => {
		expect(estimateSize("small", 1920, 300)).toBe("about 75 MB"); // measured ~75 MB
		expect(estimateSize("standard", 1920, 300)).toBe("about 160 MB"); // measured ~150 MB
	});
	it("shows GB for long videos", () => {
		expect(estimateSize("high", 1920, 3 * 3600)).toMatch(/GB$/);
	});
});

import { TARGET_LANGUAGES, languageOf, languageOfVoice } from "./languages";
describe("target languages", () => {
	it("have unique codes and a female and a male instant voice each", () => {
		expect(new Set(TARGET_LANGUAGES.map((l) => l.code)).size).toBe(TARGET_LANGUAGES.length);
		for (const l of TARGET_LANGUAGES) expect(l.voices.map((v) => v.label.includes("female"))).toEqual([true, false]);
	});
	it("defaults to Khmer and finds a voice's language", () => {
		expect(languageOf(undefined).code).toBe("km");
		expect(languageOfVoice("th-TH-NiwatNeural")?.name).toBe("Thai");
		expect(languageOfVoice("kvs-design:King (majestic)")).toBeUndefined();
	});
});

import { hasWrongScript } from "./languages";
describe("wrong script check", () => {
	it("catches a Thai word inside a Khmer line (the real case)", () => {
		expect(hasWrongScript("ហាំប៊ឺហ្គឺខ្ញុំ ប្រញាប់តម្រៀបវាឱ្យដូចเดิมវិញមក!", "km")).toBe(true);
	});
	it("catches Chinese left untranslated", () => {
		expect(hasWrongScript("汉堡真的是垃圾食品吗?", "km")).toBe(true);
	});
	it("allows clean Khmer with digits and brand names", () => {
		expect(hasWrongScript("ហាំប៊ឺហ្គឺ McDonald's តម្លៃ ១៥ យ័ន", "km")).toBe(false);
	});
	it("allows Thai in Thai, and Latin languages without other scripts", () => {
		expect(hasWrongScript("เบอร์เกอร์เป็นอาหารขยะจริงหรือ?", "th")).toBe(false);
		expect(hasWrongScript("Xin chào, rất vui được gặp bạn", "vi")).toBe(false);
		expect(hasWrongScript("Bánh mì ហាំប៊ឺហ្គឺ", "vi")).toBe(true);
	});
});

describe("wrong script check, any script", () => {
	it("catches Hebrew letters inside Khmer (seen from Gemini)", () => {
		expect(hasWrongScript("ហាំប៊ឺហ្គឺតម្លៃ១៥យואានក្នុងមាត់អ្នកនេះ", "km")).toBe(true);
	});
	it("allows Vietnamese diacritics", () => {
		expect(hasWrongScript("Xin chào, rất vui được gặp bạn hôm nay", "vi")).toBe(false);
	});
});
