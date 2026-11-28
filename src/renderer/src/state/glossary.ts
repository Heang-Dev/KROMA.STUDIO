import { create } from "zustand";
import { type GlossaryTerm, mergeGlossary } from "@shared/glossary";
import { t } from "@shared/i18n";

// The open project's series glossary (shared by the projects in its folder; see main/glossary.ts).
interface GlossaryState {
	/** The project it belongs to (null: an unsaved project, which has none). */
	path: string | null;
	terms: GlossaryTerm[];
	load: (path: string | null) => Promise<GlossaryTerm[]>;
	save: (terms: GlossaryTerm[]) => Promise<void>;
	/** Adds found terms; the person's spellings stay. Returns how many were new. */
	merge: (path: string, found: GlossaryTerm[]) => Promise<number>;
}

export const useGlossary = create<GlossaryState>((set, get) => ({
	path: null,
	terms: [],
	load: async (path) => {
		const terms = path ? ((await window.kroma.glossary(path).catch(() => [])) ?? []) : [];
		set({ path, terms });
		return terms;
	},
	save: async (terms) => {
		const { path } = get();
		if (!path) throw new Error(t("Save the project first: the glossary is shared by the projects in its folder."));
		set({ terms: await window.kroma.setGlossary(path, terms) });
	},
	merge: async (path, found) => {
		// Read and write that project's glossary (another project may be open by now, e.g. in a batch).
		const current = (await window.kroma.glossary(path).catch(() => [])) ?? [];
		const { terms, added } = mergeGlossary(current, found);
		if (!added) return 0;
		const saved = await window.kroma.setGlossary(path, terms);
		if (get().path === path) set({ terms: saved });
		return added;
	},
}));
