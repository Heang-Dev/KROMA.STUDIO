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

/** A file in public/, under the site's base path. */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

/** The repo's star count, read once when the site is built (no rate limits for visitors). */
export async function githubStars(): Promise<number | null> {
	try {
		const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers: { Accept: "application/vnd.github+json" } });
		if (!r.ok) return null;
		return ((await r.json()) as { stargazers_count?: number }).stargazers_count ?? null;
	} catch {
		return null;
	}
}

export interface Release {
	tag: string;
	name: string;
	date: string;
	url: string;
	body: string;
}

/** Every release, for the changelog (read when the site is built). */
export async function releases(): Promise<Release[]> {
	try {
		const r = await fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases?per_page=50`, { headers: { Accept: "application/vnd.github+json" } });
		if (!r.ok) return [];
		const list = (await r.json()) as { tag_name: string; name: string | null; published_at: string; html_url: string; body: string | null; draft: boolean }[];
		return list.filter((x) => !x.draft).map((x) => ({ tag: x.tag_name, name: x.name || x.tag_name, date: x.published_at, url: x.html_url, body: x.body ?? "" }));
	} catch {
		return [];
	}
}
