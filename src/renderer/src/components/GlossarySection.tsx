import { useEffect, useState } from "react";
import { BookA, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import type { GlossaryTerm } from "@shared/glossary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findGlossaryNames } from "@/lib/actions";
import { useGlossary } from "@/state/glossary";
import { useEditor } from "@/state/store";
import { Section } from "./common";
import { EmptyState } from "./empty/EmptyState";
import { t } from "@shared/i18n";

/**
 * The series glossary in the Translate panel: names and terms with the one spelling every episode in this folder uses.
 * Filled in by "Find names" (and on its own after a series' first translation); every row can be fixed or removed.
 */
export function GlossarySection() {
	const projectPath = useEditor((s) => s.projectPath);
	const terms = useGlossary((s) => s.terms);
	const load = useGlossary((s) => s.load);
	const save = useGlossary((s) => s.save);
	const [finding, setFinding] = useState(false);
	const [draft, setDraft] = useState<GlossaryTerm>({ source: "", target: "" });
	useEffect(() => void load(projectPath), [projectPath, load]);

	const folder = projectPath?.split(/[\\/]/).slice(-2, -1)[0];
	const hint = projectPath
		? t(`Names and terms translated the same way in every project in "{folder}". Filled in after the first translation; fix any spelling here.`, { folder: folder ?? "" })
		: t("Names and terms translated the same way in every episode. Save the project in its series folder to start one.");

	if (!projectPath)
		return (
			<Section title={t("Series glossary")} hint={hint}>
				<EmptyState compact fill={false} className="rounded-lg border border-dashed" scene="folder" title={t("Save the project first")} description={t("The glossary is kept in the project's folder and shared by every episode there.")} />
			</Section>
		);

	const update = (i: number, patch: Partial<GlossaryTerm>) => void save(terms.map((term, k) => (k === i ? { ...term, ...patch } : term)));
	const add = () => {
		if (!draft.source.trim() || !draft.target.trim()) return;
		void save([...terms, draft]);
		setDraft({ source: "", target: "" });
	};
	const find = async () => {
		setFinding(true);
		try {
			await findGlossaryNames();
		} finally {
			setFinding(false);
		}
	};

	return (
		<Section
			title={t("Series glossary")}
			hint={hint}
			action={
				<Button variant="outline" size="xs" disabled={finding} onClick={() => void find()} title={t("Find the names and terms in this episode's translation")}>
					{finding ? <Loader2 className="animate-spin" /> : <Sparkles />} {t("Find names")}
				</Button>
			}
		>
			{terms.length === 0 ? (
				<EmptyState compact fill={false} className="rounded-lg border border-dashed" scene="people" title={t("No names yet")} description={t("Translate an episode, or press Find names. Kroma lists the characters, places and titles with the spelling to keep.")} />
			) : (
				<ul className="divide-y rounded-lg border" aria-label={t("Glossary")}>
					{terms.map((term, i) => (
						<li key={`${term.source}-${i}`} className="flex items-center gap-1.5 px-2 py-1.5">
							<Input aria-label={t("Original")} defaultValue={term.source} title={term.note} onBlur={(e) => e.target.value.trim() !== term.source && update(i, { source: e.target.value })} className="h-control-xs min-w-0 flex-1 text-xs" />
							<span className="shrink-0 text-muted-foreground" aria-hidden>
								→
							</span>
							<Input aria-label={t("Translation")} lang="km" defaultValue={term.target} onBlur={(e) => e.target.value.trim() !== term.target && update(i, { target: e.target.value })} className="h-control-xs min-w-0 flex-1 text-xs" />
							<Button variant="ghost" size="icon-xs" aria-label={t("Remove {name}", { name: term.source })} onClick={() => void save(terms.filter((_, k) => k !== i))}>
								<Trash2 />
							</Button>
						</li>
					))}
				</ul>
			)}
			<form
				className="flex items-center gap-1.5"
				onSubmit={(e) => {
					e.preventDefault();
					add();
				}}
			>
				<BookA className="size-4 shrink-0 text-muted-foreground" aria-hidden />
				<Input aria-label={t("New name, as in the original")} placeholder={t("Original (林风)")} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className="min-w-0 flex-1 text-xs" />
				<Input aria-label={t("Its translation")} lang="km" placeholder={t("Translation")} value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} className="min-w-0 flex-1 text-xs" />
				<Button type="submit" variant="outline" size="sm" disabled={!draft.source.trim() || !draft.target.trim()} aria-label={t("Add to the glossary")}>
					<Plus />
				</Button>
			</form>
		</Section>
	);
}
