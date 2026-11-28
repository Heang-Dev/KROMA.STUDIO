import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";

// Link previews (Telegram, Facebook, X…): a 1200×630 picture of the page, in the page's language.
// The pictures are in public/assets/:
// - og-home*.png: screenshots of the live home page (1200×630 window, dark mode).
// - og-docs*.png: screenshots of the live docs home page, same size, with the sidebar hidden and the section cards in
//   a 3×2 grid showing three pages each, so the whole page fits.
// Retake them when the pages they show change a lot.
// Give a changed picture a new file name: apps cache previews by image URL.
//
// Image URLs are relative to metadataBase (set in app/layout.tsx): "assets/…", never asset("/assets/…"), which would
// put the /kroma base path in twice.
const IMAGES = {
	home: { en: "assets/og-home.png", km: "assets/og-home-km.png" },
	docs: { en: "assets/og-docs.png", km: "assets/og-docs-km.png" },
} as const;

const ALT = {
	home: { en: "Kroma Studio: turn any video into a Khmer video", km: "Kroma Studio៖ ប្តូរវីដេអូណាក៏បាន ទៅជាវីដេអូខ្មែរ" },
	docs: { en: "The Kroma Studio docs", km: "ឯកសារណែនាំ Kroma Studio" },
} as const;

/** Open Graph and X card tags for a page. Pages that set their own openGraph must use this: Next replaces it whole. */
export function share(lang: Lang, picture: keyof typeof IMAGES, title: string, description: string): Pick<Metadata, "openGraph" | "twitter"> {
	const images = [{ url: IMAGES[picture][lang], width: 1200, height: 630, alt: ALT[picture][lang] }];
	return {
		openGraph: { type: "website", siteName: "Kroma Studio", locale: lang === "km" ? "km_KH" : "en_US", title, description, images },
		twitter: { card: "summary_large_image", title, description, images },
	};
}

/** The short line under the title in a link preview. */
export const SHARE_DESCRIPTION: Record<Lang, string> = {
	en: "Turn any video into a Khmer video: subtitles, voices and one-click posting, in one desktop app.",
	km: "ប្តូរវីដេអូណាក៏បាន ទៅជាវីដេអូខ្មែរ៖ អក្សររត់ សំឡេង និងការបង្ហោះដោយចុចតែម្តង ក្នុងកម្មវិធីកុំព្យូទ័រតែមួយ។",
};
