import type { Metadata } from "next";
import { Geist_Mono, Kantumruy_Pro } from "next/font/google";
import { Footer, Header } from "@/components/site/chrome";
import { asset } from "@/lib/site";
import { SHARE_DESCRIPTION, share } from "@/lib/share";
import "./globals.css";

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const kantumruy = Kantumruy_Pro({ subsets: ["khmer", "latin"], variable: "--font-kantumruy" });

export const metadata: Metadata = {
	// The address the site is published at (for link previews on Facebook, Telegram, X…).
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://heang-dev.github.io/kroma/"),
	title: "Kroma Studio · Turn any video into a Khmer video",
	description:
		"Download videos from YouTube, Bilibili, Douyin and 1,000+ sites, translate the subtitles to Khmer, give every character a voice, and post to YouTube, Facebook and TikTok. A free desktop app for macOS, Windows and Linux.",
	icons: { icon: asset("/assets/kroma-favicon.png") },
	// Link previews: lib/share.ts. Khmer pages and the docs set their own (app/km/layout.tsx, the docs layouts).
	...share("en", "home", "Kroma Studio", SHARE_DESCRIPTION.en),
};

// The theme before the page draws (no flash): the visitor's choice, else the system's.
/**
 * Runs before the page paints (inline in <head>):
 * - the theme you chose (saved as kroma-theme), or your system's when you haven't chosen;
 * - the language you chose (saved as kroma-lang): coming into the site from outside (a bookmark, a search, a link in
 *   a chat), you land on the same page in your language. Moving around inside the site never redirects, so a link
 *   to the other language still works.
 * Written as a real function (not a string) so nothing in it needs escaping.
 */
function boot(base: string) {
	try {
		const root = document.documentElement;
		const path = location.pathname.slice(base.length) || "/";
		const km = path === "/km" || path.startsWith("/km/");
		root.lang = km ? "km" : "en";
		const theme = localStorage.getItem("kroma-theme");
		root.classList.toggle("dark", theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);

		const lang = localStorage.getItem("kroma-lang");
		let inside = false;
		try {
			const from = new URL(document.referrer);
			inside = from.origin === location.origin && (from.pathname + "/").startsWith(base + "/");
		} catch {}
		if (!lang || inside) return;
		const rest = location.search + location.hash;
		if (lang === "km" && !km) location.replace(base + "/km" + (path === "/" ? "/" : path) + rest);
		else if (lang === "en" && km) location.replace(base + (path.slice(3) || "/") + rest);
	} catch {}
}
const themeScript = `(${boot.toString()})(${JSON.stringify(process.env.NEXT_PUBLIC_BASE_PATH ?? "")})`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${geistMono.variable} ${kantumruy.variable}`} suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			{/* At least a full screen tall, so the footer sits at the bottom even on a short page. */}
			<body className="flex min-h-svh flex-col">
				<Header />
				<div className="flex-1">{children}</div>
				<Footer />
			</body>
		</html>
	);
}
