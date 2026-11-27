import type { Metadata } from "next";
import { Geist_Mono, Kantumruy_Pro } from "next/font/google";
import { asset } from "@/lib/site";
import "./globals.css";

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const kantumruy = Kantumruy_Pro({ subsets: ["khmer", "latin"], variable: "--font-kantumruy" });

export const metadata: Metadata = {
	// The address the site is published at (for link previews on Facebook, Telegram, X…).
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://heang-dev.github.io/kroma/"),
	title: "Kroma Studio · Turn any video into a Khmer video",
	description:
		"Download videos from YouTube, Bilibili, Douyin and 1,000+ sites, translate the subtitles to Khmer, give every character a voice, and post to YouTube, Facebook and TikTok. A free desktop app for macOS, Windows and Linux.",
	icons: { icon: asset("/assets/favicon.png") },
	openGraph: { title: "Kroma Studio", description: "Turn any video into a Khmer video: subtitles, voices and one-click posting, in one desktop app.", images: [asset("/assets/editor-dark.jpg")] },
};

// The theme before the page draws (no flash): the visitor's choice, else the system's.
const themeScript = `try{var t=localStorage.getItem("kroma-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${geistMono.variable} ${kantumruy.variable}`} suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body>{children}</body>
		</html>
	);
}
