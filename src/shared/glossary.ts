// A series glossary: names and terms (people, places, titles) with the one translation every episode uses. It's kept
// next to the projects (every project in the same folder shares it), so EP1 and EP7 spell a character the same way.

export interface GlossaryTerm {
	/** As written in the original subtitles (e.g. 林风). */
	source: string;
	/** As it must be written in the translation (e.g. លីនហ្វេង). */
	target: string;
	/** Who or what it is, for the translator (optional): "the hero", "a city". */
	note?: string;
}

export const GLOSSARY_FILE = "kroma-glossary.json";

/** Cleans a list: trims, drops empty and repeated sources (the first one wins), at most 300. */
export function cleanGlossary(terms: GlossaryTerm[]): GlossaryTerm[] {
	const seen = new Set<string>();
	const out: GlossaryTerm[] = [];
	for (const t of terms) {
		const source = (t.source ?? "").trim();
		const target = (t.target ?? "").trim();
		if (!source || !target || seen.has(source.toLowerCase())) continue;
		seen.add(source.toLowerCase());
		out.push({ source, target, ...(t.note?.trim() ? { note: t.note.trim() } : {}) });
	}
	return out.slice(0, 300);
}

/** The terms that appear in these lines (so each request stays short), longest first. */
export function termsIn(terms: GlossaryTerm[], text: string): GlossaryTerm[] {
	const lower = text.toLowerCase();
	return terms.filter((t) => lower.includes(t.source.toLowerCase())).sort((a, b) => b.source.length - a.source.length);
}

/** The glossary part of a translation request, or "" when none of its terms are in the lines. */
export function glossaryPrompt(terms: GlossaryTerm[], text: string): string {
	const used = termsIn(terms, text);
	if (!used.length) return "";
	return `Glossary (always translate these exactly like this):\n${used.map((t) => `${t.source} → ${t.target}${t.note ? ` (${t.note})` : ""}`).join("\n")}\n`;
}

/**
 * For a translator that can't follow instructions (Google Translate): the terms are swapped for their translation
 * before translating, so the name comes out as the glossary spells it. Longest terms first, so "林风哥" wins over "林风".
 */
export function applyGlossary(text: string, terms: GlossaryTerm[]): string {
	let out = text;
	for (const t of termsIn(terms, text)) out = out.split(t.source).join(t.target);
	return out;
}

/** Merges found terms into a glossary: terms already there keep their spelling (the person may have fixed it). */
export function mergeGlossary(current: GlossaryTerm[], found: GlossaryTerm[]): { terms: GlossaryTerm[]; added: number } {
	const terms = cleanGlossary([...current, ...found]);
	return { terms, added: terms.length - cleanGlossary(current).length };
}
