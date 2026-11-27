import { readFileSync } from "node:fs";
import { join } from "node:path";

// Server only (reads a file while the site is built).
// Releases and stars come from .github-data.json, written once before each build by scripts/fetch-github.mjs.
interface GithubData {
	stars: number | null;
	releases: Release[];
}
let data: GithubData | null = null;
function githubData(): GithubData {
	if (!data) data = JSON.parse(readFileSync(join(process.cwd(), ".github-data.json"), "utf8")) as GithubData;
	return data;
}

/** The repo's star count, read when the site is built (no rate limits for visitors). */
export async function githubStars(): Promise<number | null> {
	return githubData().stars;
}

export interface Release {
	tag: string;
	name: string;
	date: string;
	url: string;
	body: string;
}

/** Every release, newest first, for the changelog and the footer (read when the site is built). */
export async function releases(): Promise<Release[]> {
	return githubData().releases;
}
