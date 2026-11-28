import { create } from "zustand";
import { type UiLanguage, setUiLanguage } from "@shared/i18n";

// The window's interface language. Components call t() from @shared/i18n; when the language changes, the app is
// drawn again from the root (main.tsx keys it by language), so every text switches at once without a restart.

const first: UiLanguage = typeof window !== "undefined" && window.kromaLanguage === "km" ? "km" : "en";
setUiLanguage(first);
if (typeof document !== "undefined") document.documentElement.lang = first;

export const useUiLanguage = create<{ language: UiLanguage }>(() => ({ language: first }));

export function switchUiLanguage(language: UiLanguage): void {
	if (language === useUiLanguage.getState().language) return;
	setUiLanguage(language);
	document.documentElement.lang = language;
	useUiLanguage.setState({ language });
}

/** Follows the language when it's changed (in this window's settings, or another window's). */
export function followUiLanguage(): () => void {
	return window.kroma?.onUiLanguage?.(switchUiLanguage) ?? (() => undefined);
}
