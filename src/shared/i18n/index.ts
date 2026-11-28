import { km } from "./km";

// Kroma's interface languages. The English text is written in the code and is its own key: t("Export") shows
// "Export" in English and the Khmer from the dictionary (./km) in Khmer, or the English while a line isn't translated
// yet. Values go in as {name}: t("Translated {n} lines", { n: 12 }). Used by the main process and the window alike.

export type UiLanguage = "en" | "km";
/** The setting: a language, or "auto" (Khmer when the computer is set to Khmer, otherwise English). */
export type UiLanguageSetting = UiLanguage | "auto";

export const UI_LANGUAGES: { value: UiLanguageSetting; label: string; description: string }[] = [
	{ value: "auto", label: "Automatic", description: "Like your computer: ខ្មែរ if it's set to Khmer, otherwise English" },
	{ value: "en", label: "English", description: "English" },
	{ value: "km", label: "ខ្មែរ", description: "Khmer" },
];

const dictionaries: Record<UiLanguage, Record<string, string>> = { en: {}, km };

let current: UiLanguage = "en";

/** Turns the setting into a language, given the computer's locale ("km-KH", "en-US"…). */
export function resolveUiLanguage(setting: UiLanguageSetting | undefined, locale: string): UiLanguage {
	if (setting === "en" || setting === "km") return setting;
	return locale.toLowerCase().startsWith("km") ? "km" : "en";
}

export function setUiLanguage(language: UiLanguage): void {
	current = language;
}

export const uiLanguage = (): UiLanguage => current;

/** The interface text in the current language, with {values} filled in. */
export function t(text: string, values?: Record<string, string | number>): string {
	const out = current === "en" ? text : (dictionaries[current][text] ?? text);
	return values ? out.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)) : out;
}

/** The Khmer dictionary, for the completeness test. */
export const khmerDictionary = (): Record<string, string> => dictionaries.km;
