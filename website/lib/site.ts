// Links and paths for the site. Community links appear only when set (never a fake button).

/** The app's open-source code. */
export const GITHUB_REPO = "Heang-Dev/KROMA.STUDIO";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

/** The public repository whose Releases hold the installers. */
export const RELEASES_REPO = process.env.NEXT_PUBLIC_RELEASES_REPO || "Heang-Dev/kroma";
export const RELEASES_URL = `https://github.com/${RELEASES_REPO}/releases`;

/** Community channels: set the link to show the button (here or as NEXT_PUBLIC_DISCORD_URL etc. at build time). */
export const COMMUNITY = {
	discord: process.env.NEXT_PUBLIC_DISCORD_URL || "",
	telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || "",
	youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "",
};

/** Community channels that have a link (Discord, Telegram, YouTube). */
export function communityLinks(): { name: "discord" | "telegram" | "youtube"; label: string; href: string }[] {
	return (
		[
			{ name: "discord", label: "Discord", href: COMMUNITY.discord },
			{ name: "telegram", label: "Telegram", href: COMMUNITY.telegram },
			{ name: "youtube", label: "YouTube", href: COMMUNITY.youtube },
		] as const
	).filter((c) => c.href);
}

/** A file in public/, under the site's base path. */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
