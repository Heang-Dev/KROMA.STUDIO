// Reads the releases and the star count from GitHub once, before the site is built, into .github-data.json.
// Every page reads that file, so the build makes two requests instead of two per page (GitHub allows 60 an hour
// without a login). Uses GITHUB_TOKEN, or the gh CLI's login, when there is one. If GitHub can't be reached, the
// last good copy is kept; with no copy at all the build stops rather than publish an empty changelog.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const FILE = ".github-data.json";
const APP = "Heang-Dev/KROMA.STUDIO";
const RELEASES = process.env.NEXT_PUBLIC_RELEASES_REPO || "Heang-Dev/kroma";

let token = process.env.GITHUB_TOKEN || "";
if (!token) {
	try {
		token = execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
	} catch {}
}
const headers = { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
const get = async (path) => {
	const r = await fetch(`https://api.github.com/${path}`, { headers });
	if (!r.ok) throw new Error(`GitHub ${path}: ${r.status} ${r.statusText}`);
	return r.json();
};

try {
	const [list, repo] = await Promise.all([get(`repos/${RELEASES}/releases?per_page=100`), get(`repos/${APP}`).catch(() => null)]);
	const releases = list
		.filter((x) => !x.draft)
		.map((x) => ({ tag: x.tag_name, name: x.name || x.tag_name, date: x.published_at, url: x.html_url, body: x.body ?? "" }));
	writeFileSync(FILE, JSON.stringify({ fetched: new Date().toISOString(), stars: repo?.stargazers_count ?? null, releases }, null, 1) + "\n");
	console.log(`GitHub: ${releases.length} releases (latest ${releases[0]?.tag ?? "none"}), ${repo?.stargazers_count ?? "?"} stars`);
} catch (e) {
	if (!existsSync(FILE)) {
		console.error(`Couldn't read the releases from GitHub, and there's no saved copy: ${e.message}`);
		process.exit(1);
	}
	const old = JSON.parse(readFileSync(FILE, "utf8"));
	console.warn(`Couldn't reach GitHub (${e.message}); using the copy from ${old.fetched}.`);
}
