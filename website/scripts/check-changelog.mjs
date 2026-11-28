// Before publishing: every release on GitHub (.github-data.json, written by fetch-github.mjs) must have its notes in
// Khmer in CHANGELOG.km.md, or the site's Khmer pages would show English for it. Exits 1 and names the versions.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const releases = JSON.parse(readFileSync(".github-data.json", "utf8")).releases.map((r) => r.tag.replace(/^v/, ""));
const khmer = new Set([...readFileSync(join("..", "CHANGELOG.km.md"), "utf8").matchAll(/^## (\d+\.\d+\.\d+) /gm)].map((m) => m[1]));
const missing = releases.filter((v) => !khmer.has(v));
if (missing.length) {
	console.error(`Not publishing: no Khmer notes in CHANGELOG.km.md for ${missing.join(", ")}.`);
	console.error("Add the version's section in Khmer (same heading as CHANGELOG.md), then publish again.");
	process.exit(1);
}
console.log(`changelog: all ${releases.length} releases have Khmer notes`);
