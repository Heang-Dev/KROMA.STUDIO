import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { khmerDictionary, resolveUiLanguage, setUiLanguage, t } from "./index";

/** Every t("…") text in the source (the literal ones; t(variable) can't be checked here). */
function textsInSource(dir: string, found = new Map<string, string>()): Map<string, string> {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			if (name !== "node_modules" && name !== "i18n") textsInSource(path, found);
			continue;
		}
		if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
		const source = readFileSync(path, "utf8");
		for (const m of source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) found.set(JSON.parse(`"${m[1]}"`), path);
		for (const m of source.matchAll(/\bt\(\s*`((?:[^`\\$]|\\.)*)`/g)) found.set(m[1].replace(/\\`/g, "`"), path);
	}
	return found;
}

describe("interface languages", () => {
	it("fills in values and falls back to English", () => {
		setUiLanguage("en");
		expect(t("Translated {n} lines", { n: 12 })).toBe("Translated 12 lines");
		setUiLanguage("km");
		expect(t("A text no dictionary has")).toBe("A text no dictionary has");
		setUiLanguage("en");
	});

	it("follows the computer when automatic", () => {
		expect(resolveUiLanguage("auto", "km-KH")).toBe("km");
		expect(resolveUiLanguage("auto", "en-US")).toBe("en");
		expect(resolveUiLanguage("en", "km-KH")).toBe("en");
		expect(resolveUiLanguage(undefined, "km")).toBe("km");
	});

	it("has Khmer for every interface text in the code", () => {
		const km = khmerDictionary();
		const missing = [...textsInSource(join(__dirname, ".."))].concat([...textsInSource(join(__dirname, "../../main"))], [...textsInSource(join(__dirname, "../../renderer/src"))]).filter(([text]) => !km[text]);
		expect(missing.map(([text, file]) => `${file.split("/src/")[1]}: ${text}`)).toEqual([]);
	});

	it("keeps every {value} in the Khmer", () => {
		const wrong = Object.entries(khmerDictionary()).filter(([en, km]) => (en.match(/\{\w+\}/g) ?? []).sort().join() !== (km.match(/\{\w+\}/g) ?? []).sort().join());
		expect(wrong.map(([en]) => en)).toEqual([]);
	});
});
