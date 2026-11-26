import type { Appearance } from "@shared/types";

// Same theme mechanism as SMS: a `dark` class on <html>. "system" follows the Mac's setting live.
let media: MediaQueryList | null = null;
let listener: (() => void) | null = null;

export function applyAppearance(appearance: Appearance): void {
	if (media && listener) media.removeEventListener("change", listener);
	media = window.matchMedia("(prefers-color-scheme: dark)");
	listener = () => document.documentElement.classList.toggle("dark", appearance === "dark" || (appearance === "system" && media!.matches));
	listener();
	if (appearance === "system") media.addEventListener("change", listener);
}

export const isDark = () => document.documentElement.classList.contains("dark");
