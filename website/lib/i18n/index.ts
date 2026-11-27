import { en, type Messages } from "./en";
import { km } from "./km";

// English at /, Khmer under /km/ (same pages, same anchors).

export type Lang = "en" | "km";
export const LANGS: { code: Lang; label: string; short: string }[] = [
	{ code: "en", label: "English", short: "EN" },
	{ code: "km", label: "ខ្មែរ", short: "ខ្មែរ" },
];

export const messages: Record<Lang, Messages> = { en, km };

/** The page's language, from its path (without the site's base path). */
export const langOf = (pathname: string): Lang => (/^\/km(\/|$)/.test(pathname) ? "km" : "en");

/** A site link in a language: "/docs/" → "/km/docs/", "/#faq" → "/km/#faq". Outside links stay as they are. */
export function localize(href: string, lang: Lang): string {
	if (lang === "en" || !href.startsWith("/")) return href;
	if (href === "/") return "/km/";
	return href.startsWith("/#") ? `/km/${href.slice(1)}` : `/km${href}`;
}

/** The same page in the other language. */
export function switchPath(pathname: string, to: Lang): string {
	const bare = pathname.replace(/^\/km(?=\/|$)/, "") || "/";
	return localize(bare, to);
}

export type { Messages };
