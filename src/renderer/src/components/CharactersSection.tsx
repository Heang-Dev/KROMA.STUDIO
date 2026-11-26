import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { KHMER_VOICES, KVS_TEMPLATES, type KvsVoice, groupTemplates } from "@shared/types";
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
			hint={cast.length ? "Each character speaks with their own voice. Change who says a line from the coloured name on it in the subtitles." : "A movie has many people talking. Find them, and each gets their own voice (the default voice below speaks the rest)."}
		>
			<Button variant={cast.length ? "outline" : "default"} className="h-auto min-h-9 w-full whitespace-normal py-2 leading-snug" disabled={!hasLines || busy} onClick={() => void findCharacters()}>
				{busy ? <Loader2 className="animate-spin" /> : <Users />} {cast.length ? "Find characters again" : "Find characters"}
			</Button>
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
							<div className="flex items-center gap-1 pl-[18px]">
								<VoiceSelect value={m.voice} clones={clones} onChange={(v) => setCharacterVoice(m.name, v)} label={`Voice for ${m.name}`} />
								{sample(m.voice)}
							</div>
						</div>
					))}
					<button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-muted-foreground hover:bg-accent/40 hover:text-foreground" onClick={() => addCharacter()}>
						<Plus className="size-3.5" /> Add a character
					</button>
				</Card>
			)}
			{cast.length > 0 && unassigned > 0 && <p className="text-xs text-muted-foreground">{unassigned} lines have no character: the default voice speaks them.</p>}
		</Section>
	);
}

export function VoiceSelect({ value, clones, onChange, label }: { value: string; clones: KvsVoice[]; onChange: (v: string) => void; label: string }) {
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
					<SelectLabel>Instant</SelectLabel>
					{KHMER_VOICES.map((v) => (
						<SelectItem key={v.id} value={v.id}>
							{v.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
