import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Lang } from "@/lib/i18n";

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

/**
 * Every release, newest first, for the changelog and the footer (read when the site is built). In Khmer, each
 * release's notes come from CHANGELOG.km.md (the Khmer translation of CHANGELOG.md, at the repo root) when it has
 * that version, else the English notes from GitHub.
 */
export async function releases(lang: Lang = "en"): Promise<Release[]> {
	const list = githubData().releases;
	if (lang !== "km") return list;
	const km = khmerNotes();
	return list.map((r) => ({ ...r, body: km.get(r.tag.replace(/^v/, "")) ?? r.body }));
}

/** CHANGELOG.km.md's sections by version: "## 0.2.2 — 2026-11-28" → the text under it. */
let khmer: Map<string, string> | null = null;
function khmerNotes(): Map<string, string> {
	if (khmer) return khmer;
	khmer = new Map();
	const file = join(process.cwd(), "..", "CHANGELOG.km.md");
	if (!existsSync(file)) return khmer;
	for (const part of readFileSync(file, "utf8").split(/^## /m).slice(1)) {
		const version = part.match(/^(\d+\.\d+\.\d+)/)?.[1];
		if (version) khmer.set(version, part.slice(part.indexOf("\n") + 1).trim());
	}
	return khmer;
}
