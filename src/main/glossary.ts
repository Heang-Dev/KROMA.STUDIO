import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { GLOSSARY_FILE, type GlossaryTerm, cleanGlossary } from "@shared/glossary";
import { t } from "@shared/i18n";

// The series glossary lives next to the projects: every .kroma project in the same folder shares it.

/** The glossary file for a project, or null for a project that isn't saved yet (nowhere to share it). */
function fileFor(projectPath: string | null | undefined): string | null {
	if (!projectPath || !projectPath.toLowerCase().endsWith(".kroma")) return null;
	return join(dirname(projectPath), GLOSSARY_FILE);
}

export function loadGlossary(projectPath: string | null | undefined): GlossaryTerm[] {
	const file = fileFor(projectPath);
	if (!file || !existsSync(file)) return [];
	try {
		const data = JSON.parse(readFileSync(file, "utf8")) as { terms?: GlossaryTerm[] };
		return cleanGlossary(Array.isArray(data.terms) ? data.terms : []);
	} catch {
		return [];
	}
}

export function saveGlossary(projectPath: string, terms: GlossaryTerm[]): GlossaryTerm[] {
	const file = fileFor(projectPath);
	if (!file) throw new Error(t("Save the project first: the glossary is shared by the projects in its folder."));
	const clean = cleanGlossary(terms);
	writeFileSync(file, JSON.stringify({ series: basename(dirname(projectPath)), terms: clean }, null, "\t"));
	return clean;
}
