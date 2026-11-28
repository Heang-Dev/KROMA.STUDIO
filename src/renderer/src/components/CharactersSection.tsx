import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { languageOf } from "@shared/languages";
import { KVS_TEMPLATES, type KvsVoice, groupTemplates } from "@shared/types";
import { Button } from "@/components/ui/button";
import { addCharacter, findCharacters, removeCharacter, renameCharacter, setCharacterVoice, voiceSettings } from "@/lib/actions";
import { castColor } from "@/lib/cast";
import { useEditor } from "@/state/store";
import { SearchSelect, type SearchSelectOption } from "./SearchSelect";
import { Card, Section, TaskProgress, useBusy } from "./common";
import { t } from "@shared/i18n";

// Characters: who speaks in the video, and the voice for each. The subtitles say who says each line.

export function CharactersSection({ clones, sample }: { clones: KvsVoice[]; sample: (voice: string) => React.ReactNode }) {
	const project = useEditor((s) => s.project);
	const cast = voiceSettings(project).cast ?? [];
	const busy = useBusy("characters");
	const hasLines = project.cues.some((c) => (c.source || c.text).trim());
	const count = (name: string) => project.cues.filter((c) => c.speaker === name).length;
	const unassigned = project.cues.filter((c) => c.text.trim() && !cast.some((m) => m.name === c.speaker)).length;

	return (
		<Section
			title={t("Characters")}
			hint={
				cast.length
					? t("Each character speaks with their own voice: pick it here. To change who says a line, click the coloured name on that line in the subtitles.")
					: t("A video with 3 people talking can have 3 voices. List the characters, pick a voice for each, and each line is spoken by its character.")
			}
		>
			{cast.length === 0 && hasLines && (
				<div className="rounded-lg border border-dashed p-3">
					<p className="mb-2 text-[11px] text-muted-foreground">{t("For example:")}</p>
					<div className="space-y-1.5 opacity-70" aria-hidden>
						{[
							["Narrator", "Narrator (deep male)"],
							["Hero", "Young man (hero)"],
							["Mother", "Mother (caring)"],
						].map(([who, voice], i) => (
							<div key={who} className="flex items-center gap-2 text-xs">
								<span className="size-2.5 shrink-0 rounded-full" style={{ background: castColor(i) }} />
								<span className="w-16 truncate font-medium">{t(who)}</span>
								<span className="text-muted-foreground">→</span>
								<span className="truncate rounded-md border bg-background px-2 py-0.5">{voice}</span>
							</div>
						))}
					</div>
				</div>
			)}
			<div className="grid grid-cols-1 gap-1.5 @[17rem]:grid-cols-2">
				<Button variant={cast.length ? "outline" : "default"} disabled={!hasLines || busy} onClick={() => void findCharacters()}>
					{busy ? <Loader2 className="animate-spin" /> : <Users />} {cast.length ? t("Find again") : t("Find characters")}
				</Button>
				<Button variant="outline" disabled={!hasLines || busy} onClick={() => addCharacter()}>
					<Plus /> {t("Add manually")}
				</Button>
			</div>
			{cast.length === 0 && hasLines && <p className="text-xs text-muted-foreground">{t(`"Find characters" reads the dialogue (about 20 s) and suggests a voice for each person; you can change everything after.`)}</p>}
			<TaskProgress prefix="characters" />
			{!hasLines && <p className="text-xs text-muted-foreground">{t("Make the subtitles first.")}</p>}
			{cast.length > 0 && (
				<Card className="px-0">
					{cast.map((m, i) => (
						<div key={m.name} className="space-y-1.5 px-3 py-2.5">
							<div className="flex items-center gap-2">
								<span className="size-2.5 shrink-0 rounded-full" style={{ background: castColor(i) }} />
								<input
									defaultValue={m.name}
									key={m.name}
									aria-label={t("Character name")}
									title={m.name}
									onBlur={(e) => renameCharacter(m.name, e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
									className="min-w-0 flex-1 truncate rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium hover:border-border focus:border-ring focus:outline-none"
								/>
								<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{t("{n} lines", { n: count(m.name) })}</span>
								<Button variant="ghost" size="icon-xs" aria-label={t("Remove {name}", { name: m.name })} title={t("Remove (their lines use the default voice)")} onClick={() => removeCharacter(m.name)}>
									<Trash2 />
								</Button>
							</div>
							{m.description && <p className="pl-[18px] text-[11px] leading-snug text-muted-foreground">{m.description}</p>}
							{count(m.name) === 0 && <p className="pl-[18px] text-[11px] leading-snug text-warning">{t("No lines yet: click the coloured name on a line in the subtitles and choose {name}.", { name: m.name })}</p>}
							<div className="flex items-center gap-1 pl-[18px]">
								<VoiceSelect value={m.voice} clones={clones} onChange={(v) => setCharacterVoice(m.name, v)} label={t("Voice for {name}", { name: m.name })} />
								{sample(m.voice)}
							</div>
						</div>
					))}
				</Card>
			)}
			{cast.length > 0 && unassigned > 0 && <p className="text-xs text-muted-foreground">{t("{n} lines have no character: the default voice speaks them.", { n: unassigned })}</p>}
		</Section>
	);
}

export function VoiceSelect({ value, clones, onChange, label }: { value: string; clones: KvsVoice[]; onChange: (v: string) => void; label: string }) {
	const lang = languageOf(useEditor((s) => s.project.language));
	return <SearchSelect label={label} value={value} onChange={onChange} options={voiceChoices(clones, lang)} searchPlaceholder={t("Find a voice (king, girl, narrator…)")} className="min-w-0 flex-1" />;
}

/** Every voice to pick from, grouped: your cloned voices, the preset groups (with what each sounds like), instant voices. */
export function voiceChoices(clones: KvsVoice[], lang: ReturnType<typeof languageOf>, templates: { name: string; description: string }[] = KVS_TEMPLATES): SearchSelectOption[] {
	return [
		...clones.map((c) => ({ value: `kvs-clone:${c.id}`, label: c.name, description: t("Your cloned voice"), group: t("Your voices") })),
		...groupTemplates(templates).flatMap((g) => g.items.map((tpl) => ({ value: `kvs-design:${tpl.name}`, label: tpl.name, description: tpl.description, group: t(g.title) }))),
		...lang.voices.map((v) => ({ value: v.id, label: v.label, description: t("Instant · ready in seconds"), group: t("Instant · {language}", { language: t(lang.name) }) })),
	];
}
