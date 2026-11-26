import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { languageOf } from "@shared/languages";
import { KVS_TEMPLATES, type KvsVoice, groupTemplates } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addCharacter, findCharacters, removeCharacter, renameCharacter, setCharacterVoice, voiceSettings } from "@/lib/actions";
import { castColor } from "@/lib/cast";
import { useEditor } from "@/state/store";
import { Card, Section, TaskProgress, useBusy } from "./common";

// Characters, like KVS's Story page: who speaks in the video, and the voice for each. The subtitles say who says each line.

export function CharactersSection({ clones, sample }: { clones: KvsVoice[]; sample: (voice: string) => React.ReactNode }) {
	const project = useEditor((s) => s.project);
	const cast = voiceSettings(project).cast ?? [];
	const busy = useBusy("characters");
	const hasLines = project.cues.some((c) => (c.source || c.text).trim());
	const count = (name: string) => project.cues.filter((c) => c.speaker === name).length;
	const unassigned = project.cues.filter((c) => c.text.trim() && !cast.some((m) => m.name === c.speaker)).length;

	return (
		<Section
			title="Characters"
			hint={
				cast.length
					? "Each character speaks with their own voice: pick it here. To change who says a line, click the coloured name on that line in the subtitles."
					: "A video with 3 people talking can have 3 voices. List the characters, pick a voice for each, and each line is spoken by its character."
			}
		>
			{cast.length === 0 && hasLines && (
				<div className="rounded-lg border border-dashed p-3">
					<p className="mb-2 text-[11px] text-muted-foreground">For example:</p>
					<div className="space-y-1.5 opacity-70" aria-hidden>
						{[
							["Narrator", "Narrator (deep male)"],
							["Hero", "Young man (hero)"],
							["Mother", "Mother (caring)"],
						].map(([who, voice], i) => (
							<div key={who} className="flex items-center gap-2 text-xs">
								<span className="size-2.5 shrink-0 rounded-full" style={{ background: castColor(i) }} />
								<span className="w-16 font-medium">{who}</span>
								<span className="text-muted-foreground">→</span>
								<span className="truncate rounded-md border bg-background px-2 py-0.5">{voice}</span>
							</div>
						))}
					</div>
				</div>
			)}
			<div className="grid grid-cols-1 gap-1.5 @[19rem]:grid-cols-2">
				<Button variant={cast.length ? "outline" : "default"} className="h-auto min-h-9 whitespace-normal py-2 leading-snug" disabled={!hasLines || busy} onClick={() => void findCharacters()}>
					{busy ? <Loader2 className="animate-spin" /> : <Users />} {cast.length ? "Find again" : "Find automatically"}
				</Button>
				<Button variant="outline" className="h-auto min-h-9 whitespace-normal py-2 leading-snug" disabled={!hasLines || busy} onClick={() => addCharacter()}>
					<Plus /> Add a character
				</Button>
			</div>
			{cast.length === 0 && hasLines && <p className="text-xs text-muted-foreground">"Find automatically" reads the dialogue (about 20 s) and suggests a voice for each person; you can change everything after.</p>}
			<TaskProgress prefix="characters" />
			{!hasLines && <p className="text-xs text-muted-foreground">Make the subtitles first.</p>}
			{cast.length > 0 && (
				<Card className="px-0">
					{cast.map((m, i) => (
						<div key={m.name} className="space-y-1.5 px-3 py-2.5">
							<div className="flex items-center gap-2">
								<span className="size-2.5 shrink-0 rounded-full" style={{ background: castColor(i) }} />
								<input
									defaultValue={m.name}
									key={m.name}
									aria-label="Character name"
									onBlur={(e) => renameCharacter(m.name, e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
									className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium hover:border-border focus:border-ring focus:outline-none"
								/>
								<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{count(m.name)} lines</span>
								<Button variant="ghost" size="icon-xs" aria-label={`Remove ${m.name}`} title="Remove (their lines use the default voice)" onClick={() => removeCharacter(m.name)}>
									<Trash2 />
								</Button>
							</div>
							{m.description && <p className="pl-[18px] text-[11px] leading-snug text-muted-foreground">{m.description}</p>}
							{count(m.name) === 0 && <p className="pl-[18px] text-[11px] leading-snug text-warning">No lines yet: click the coloured name on a line in the subtitles and choose {m.name}.</p>}
							<div className="flex items-center gap-1 pl-[18px]">
								<VoiceSelect value={m.voice} clones={clones} onChange={(v) => setCharacterVoice(m.name, v)} label={`Voice for ${m.name}`} />
								{sample(m.voice)}
							</div>
						</div>
					))}
				</Card>
			)}
			{cast.length > 0 && unassigned > 0 && <p className="text-xs text-muted-foreground">{unassigned} lines have no character: the default voice speaks them.</p>}
		</Section>
	);
}

export function VoiceSelect({ value, clones, onChange, label }: { value: string; clones: KvsVoice[]; onChange: (v: string) => void; label: string }) {
	const lang = languageOf(useEditor((s) => s.project.language));
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger size="sm" className="h-7 min-w-0 flex-1 text-xs" aria-label={label}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{groupTemplates(KVS_TEMPLATES).map((g) => (
					<SelectGroup key={g.title}>
						<SelectLabel>{g.title}</SelectLabel>
						{g.items.map((t) => (
							<SelectItem key={t.name} value={`kvs-design:${t.name}`}>
								{t.name}
							</SelectItem>
						))}
					</SelectGroup>
				))}
				{clones.length > 0 && (
					<SelectGroup>
						<SelectLabel>Your voices</SelectLabel>
						{clones.map((c) => (
							<SelectItem key={c.id} value={`kvs-clone:${c.id}`}>
								{c.name}
							</SelectItem>
						))}
					</SelectGroup>
				)}
				<SelectGroup>
					<SelectLabel>Instant · {lang.name}</SelectLabel>
					{lang.voices.map((v) => (
						<SelectItem key={v.id} value={v.id}>
							{v.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
