import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Marked } from "marked";
import { type Lang, localize } from "./i18n";
import { releases } from "./github";

// Versioned docs, like Laravel's: content/docs/<version>/<lang>/<page>.md, read when the site is built.
// Each page has a small header (title, group, section, order); links between pages are written as the page's file
// name ("installation") and stay inside the same version and language.

const ROOT = join(process.cwd(), "content", "docs");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface DocsVersion {
	version: string;
	label: string;
	released: string;
}

export interface DocPageInfo {
	slug: string;
	title: string;
	group: string;
	section: number;
	order: number;
}

export interface DocPage extends DocPageInfo {
	html: string;
	toc: { depth: number; id: string; text: string }[];
}

/** Every docs version, newest first. */
export function docsVersions(): DocsVersion[] {
	return (JSON.parse(readFileSync(join(ROOT, "versions.json"), "utf8")) as { versions: DocsVersion[] }).versions;
}

export const latestVersion = (): string => docsVersions()[0].version;

function parse(file: string): { meta: Record<string, string>; body: string } {
	const raw = readFileSync(file, "utf8");
	const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) return { meta: {}, body: raw };
	const meta = Object.fromEntries(
		m[1]
			.split("\n")
			.map((l) => l.match(/^(\w+):\s*(.*)$/))
			.filter((x): x is RegExpMatchArray => Boolean(x))
			.map((x) => [x[1], x[2].trim()]),
	);
	return { meta, body: m[2] };
}

/** The pages of a version in one language, in reading order. */
export function docPages(version: string, lang: Lang): DocPageInfo[] {
	const dir = join(ROOT, version, lang);
	return readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => {
			const { meta } = parse(join(dir, f));
			return { slug: f.replace(/\.md$/, ""), title: meta.title ?? f, group: meta.group ?? "", section: Number(meta.section ?? 99), order: Number(meta.order ?? 99) };
		})
		.sort((a, b) => a.section - b.section || a.order - b.order);
}

/** Pages grouped for the sidebar, in order. */
export function docGroups(version: string, lang: Lang): { group: string; pages: DocPageInfo[] }[] {
	const groups: { group: string; pages: DocPageInfo[] }[] = [];
	for (const p of docPages(version, lang)) {
		const last = groups[groups.length - 1];
		if (last && last.group === p.group) last.pages.push(p);
		else groups.push({ group: p.group, pages: [p] });
	}
	return groups;
}

/** A link inside the docs: a page name stays in this version and language; site links follow the language. */
export function docHref(href: string, version: string, lang: Lang): string {
	if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return href;
	if (href.startsWith("/")) return BASE + localize(href, lang);
	const [slug, hash] = href.split("#");
	return BASE + localize(`/docs/${version}/${slug}/`, lang) + (hash ? `#${hash}` : "");
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Turns the HTML escapes marked writes (&quot; &#39; …) back into characters, for "On this page" and ids. */
const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/<[^>]+>/g, "")
		.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
		.replace(/^-+|-+$/g, "") || "section";

/** One page, rendered: HTML plus its headings for "On this page". */
export async function docPage(version: string, lang: Lang, slug: string): Promise<DocPage> {
	const info = docPages(version, lang).find((p) => p.slug === slug);
	if (!info) throw new Error(`No docs page ${version}/${lang}/${slug}`);
	let { body } = parse(join(ROOT, version, lang, `${slug}.md`));

	// {{releases}}: this version's releases from GitHub (0.1 → v0.1.0, v0.1.1 …).
	if (body.includes("{{releases}}")) {
		const list = (await releases(lang)).filter((r) => r.tag.replace(/^v/, "").startsWith(`${version}.`));
		const date = (d: string) => new Date(d).toLocaleDateString(lang === "km" ? "km-KH" : "en", { year: "numeric", month: "long", day: "numeric" });
		const md = list.map((r) => `## ${r.tag.replace(/^v/, "")}\n\n_${date(r.date)}_ · [GitHub](${r.url})\n\n${r.body.trim()}`).join("\n\n");
		body = body.replace("{{releases}}", md || (lang === "km" ? "_មិនទាន់មានកំណែនៅឡើយទេ។_" : "_No releases yet._"));
	}

	const toc: DocPage["toc"] = [];
	const used = new Map<string, number>();
	const marked = new Marked({
		gfm: true,
		renderer: {
			heading({ tokens, depth }) {
				const text = this.parser.parseInline(tokens);
				const plain = unescape(text.replace(/<[^>]+>/g, ""));
				let id = slugify(plain);
				const n = used.get(id) ?? 0;
				used.set(id, n + 1);
				if (n) id = `${id}-${n}`;
				if (depth === 2 || depth === 3) toc.push({ depth, id, text: plain });
				return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${depth}>`;
			},
			link({ href, tokens }) {
				const text = this.parser.parseInline(tokens);
				const to = docHref(href, version, lang);
				const external = /^https?:/i.test(to);
				return `<a href="${escape(to)}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${text}</a>`;
			},
			code({ text, lang: language }) {
				return `<div class="code-block"><pre><code${language ? ` class="language-${escape(language)}"` : ""}>${escape(text)}</code></pre></div>`;
			},
		},
	});
	const html = (await marked.parse(body)).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
	return { ...info, html, toc };
}
