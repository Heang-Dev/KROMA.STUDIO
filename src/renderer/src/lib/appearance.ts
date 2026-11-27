import type { Appearance } from "@shared/types";

import { isMac } from "./platform";

// Same theme mechanism as SMS: a `dark` class on <html>. "system" follows the system's setting live.
let media: MediaQueryList | null = null;
let listener: (() => void) | null = null;

export function applyAppearance(appearance: Appearance): void {
	if (media && listener) media.removeEventListener("change", listener);
	media = window.matchMedia("(prefers-color-scheme: dark)");
	listener = () => {
		document.documentElement.classList.toggle("dark", appearance === "dark" || (appearance === "system" && media!.matches));
		syncTitleBar();
	};
	listener();
	if (appearance === "system") media.addEventListener("change", listener);
}

export const isDark = () => document.documentElement.classList.contains("dark");

/** Windows and Linux draw their window buttons over Kroma's title bar: give them its colours. */
function syncTitleBar(): void {
	if (isMac || !window.kroma?.setTitleBarColors) return;
	const style = getComputedStyle(document.documentElement);
	void window.kroma.setTitleBarColors(toHex(style.getPropertyValue("--sidebar")), toHex(style.getPropertyValue("--foreground")));
}

/** Any CSS colour (oklch, rgb…) as #rrggbb, which the window buttons need. */
function toHex(css: string): string {
	const ctx = document.createElement("canvas").getContext("2d");
	if (!ctx) return "#000000";
	ctx.fillStyle = css.trim() || "#000";
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
