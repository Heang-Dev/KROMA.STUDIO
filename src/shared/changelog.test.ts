import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The changelog comes first at every release (CLAUDE.md, step 0): the version's section in CHANGELOG.md and its
// Khmer translation in CHANGELOG.km.md. The site's Khmer pages show the Khmer one, so a missing section shows
// English there. CI runs this on every tag, so a release without both sections fails before anything ships.

const read = (name: string) => readFileSync(resolve(__dirname, "../..", name), "utf8");

/** "## 0.2.3 — 2026-11-28" headings → version and the text under it. */
function sections(text: string): { version: string; body: string }[] {
	return text
		.split(/^## /m)
		.slice(1)
		.map((part) => ({ version: part.match(/^(\d+\.\d+\.\d+) — \d{4}-\d{2}-\d{2}/)?.[1] ?? `bad heading: ${part.split("\n")[0]}`, body: part.slice(part.indexOf("\n") + 1).trim() }));
}

const english = sections(read("CHANGELOG.md"));
const khmer = sections(read("CHANGELOG.km.md"));
const version = (JSON.parse(read("package.json")) as { version: string }).version;

describe("changelog", () => {
	it("has a section for this version in English and in Khmer", () => {
		expect(english.map((s) => s.version)).toContain(version);
		expect(khmer.map((s) => s.version)).toContain(version);
	});

	it("has every version in Khmer too, in the same order", () => {
		expect(khmer.map((s) => s.version)).toEqual(english.map((s) => s.version));
	});

	it("writes every Khmer section in Khmer", () => {
		const notKhmer = khmer.filter((s) => (s.body.match(/[ក-៿]/g) ?? []).length < 20).map((s) => s.version);
		expect(notKhmer).toEqual([]);
	});

	it("has no empty sections", () => {
		expect([...english, ...khmer].filter((s) => !s.body).map((s) => s.version)).toEqual([]);
	});
});
