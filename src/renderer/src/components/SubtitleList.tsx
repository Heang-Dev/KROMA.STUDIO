import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Plus, Replace, Search, Trash2 } from "lucide-react";
import type { CastMember, Cue } from "@shared/types";
import { languageOf } from "@shared/languages";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { castColor } from "@/lib/cast";
import { addCharacter, importSrt, setSpeaker } from "@/lib/actions";
import { cueAt, formatTime, totalDuration, uid } from "@/lib/timeline";
import { useLayout } from "@/state/layout";
import { useEditor } from "@/state/store";
import { FindReplace } from "./FindReplace";
import { ResizeHandle } from "./ResizeHandle";
import { Input } from "@/components/ui/input";
import { IconButton } from "./common";
import { EmptyState } from "@/components/empty/EmptyState";
import { t } from "@shared/i18n";

export function SubtitleList() {
	const cues = useEditor((s) => s.project.cues);
	const cast = useEditor((s) => s.project.voice?.cast);
	const language = useEditor((s) => s.project.language);
	const width = useLayout((s) => s.sizes.right);
	const active = useEditor((s) => cueAt(s.project.cues, s.time));
	const playing = useEditor((s) => s.playing);
	const selectedId = useEditor((s) => (s.selection?.kind === "cue" ? s.selection.id : null));
	const [query, setQuery] = useState("");
	const [replacing, setReplacing] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);
	const translated = cues.filter((c) => c.text.trim()).length;

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		return q ? cues.filter((c) => c.text.toLowerCase().includes(q) || c.source.toLowerCase().includes(q)) : cues;
	}, [cues, query]);

	// Keep the playing line in view.
	useEffect(() => {
		if (!playing || active < 0) return;
		const el = listRef.current?.querySelector<HTMLElement>(`[data-cue="${cues[active]?.id}"]`);
		el?.scrollIntoView({ block: "nearest" });
	}, [active, playing, cues]);

	// Selecting a cue on the timeline scrolls it into view here.
	useEffect(() => {
		if (!selectedId) return;
		listRef.current?.querySelector<HTMLElement>(`[data-cue="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
	}, [selectedId]);

	const addLine = () => {
		const { time, update, select } = useEditor.getState();
		const id = uid();
		const end = Math.min(time + 2, totalDuration(useEditor.getState().project.clips));
		if (end - time < 0.3) return;
		update((p) => ({ ...p, cues: [...p.cues, { id, start: time, end, source: "", text: "" }] }));
		select({ kind: "cue", id });
	};

	return (
		<aside className="relative flex shrink-0 flex-col border-l border-border bg-card" style={{ width }}>
			<ResizeHandle panel="right" edge="left" label={t("Resize the subtitles panel")} />
			<header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
				<div>
					<h2 className="text-[13px] font-semibold">{t("Subtitles")}</h2>
					<p className="text-[11px] text-muted-foreground">{cues.length ? t("{n} lines · {translated} in {language}", { n: cues.length, translated, language: t(languageOf(language).name) }) : t("None yet")}</p>
				</div>
				<div className="flex">
					<IconButton label={t("Import an .srt file")} onClick={() => void importSrt()}>
						<FileUp className="size-4" />
					</IconButton>
					<IconButton label={t("Find and replace")} onClick={() => setReplacing(true)} disabled={!cues.length}>
						<Replace className="size-4" />
					</IconButton>
					<IconButton label={t("Add a line at the playhead")} onClick={addLine}>
						<Plus className="size-4" />
					</IconButton>
				</div>
			</header>
			{cues.length > 0 && (
				<div className="relative border-b border-border px-3 py-2">
					<Search className="absolute top-1/2 left-5.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input className="pl-8" aria-label={t("Find in subtitles")} placeholder={t("Find in subtitles")} value={query} onChange={(e) => setQuery(e.target.value)} />
				</div>
			)}
			<div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
				{visible.map((cue) => (
					<CueRow key={cue.id} cue={cue} cast={cast} active={cues[active]?.id === cue.id} selected={selectedId === cue.id} />
				))}
				{cues.length === 0 && <EmptyState compact fill={false} scene="subtitles" title={t("No subtitles yet")} description={t(`They appear here after "Make {language} subtitles". You can fix any line by typing in it.`, { language: t(languageOf(language).name) })} />}
			</div>
			<FindReplace open={replacing} onOpenChange={setReplacing} initial={query} />
		</aside>
	);
}

const CueRow = memo(function CueRow({ cue, cast, active, selected }: { cue: Cue; cast?: CastMember[]; active: boolean; selected: boolean }) {
	const update = useEditor((s) => s.update);
	const setText = (text: string) => update((p) => ({ ...p, cues: p.cues.map((c) => (c.id === cue.id ? { ...c, text } : c)) }), false);
	const focus = () => {
		const s = useEditor.getState();
		s.checkpoint();
		s.select({ kind: "cue", id: cue.id });
		if (!s.playing) s.seek(cue.start + 0.01);
	};

	return (
		<div
			data-cue={cue.id}
			className={`cue-row group border-b border-border/60 px-4 py-2.5 ${active ? "bg-primary/5" : ""} ${selected ? "shadow-[inset_3px_0_0_var(--primary)]" : ""}`}
		>
			<div className="mb-1 flex items-center gap-2">
				<button type="button" className="font-mono text-[11px] tabular-nums text-muted-foreground hover:text-primary" onClick={focus}>
					{formatTime(cue.start, true)} → {formatTime(cue.end, true)}
				</button>
				{cast && cast.length > 0 && <SpeakerChip cue={cue} cast={cast} />}
				<span className="flex-1" />
				<button
					type="button"
					aria-label={t("Delete line")}
					title={t("Delete line")}
					className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
					onClick={() => update((p) => ({ ...p, cues: p.cues.filter((c) => c.id !== cue.id) }))}
				>
					<Trash2 className="size-3.5" />
				</button>
			</div>
			{cue.source && <p className="mb-1 text-[12.5px] leading-snug text-muted-foreground select-text">{cue.source}</p>}
			<textarea
				rows={1}
				value={cue.text}
				placeholder={cue.source ? t("Not translated yet") : t("Type the translated line")}
				onFocus={focus}
				onChange={(e) => setText(e.target.value)}
				className="field-sizing-content w-full resize-none rounded-none border border-transparent bg-transparent px-1.5 py-1 font-khmer text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground hover:border-border focus:border-primary focus:bg-background focus:outline-none"
			/>
		</div>
	);
});

/** Who says the line; pick another character from the menu. */
function SpeakerChip({ cue, cast }: { cue: Cue; cast: CastMember[] }) {
	const index = cast.findIndex((m) => m.name === cue.speaker);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex max-w-36 items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
					aria-label={t("Who says this line: {name}", { name: index >= 0 ? (cue.speaker ?? "") : t("default voice") })}
				>
					<span className="size-2 shrink-0 rounded-full border" style={{ background: castColor(index), borderColor: index >= 0 ? castColor(index) : "var(--border)" }} />
					<span className="truncate">{index >= 0 ? cue.speaker : t("Default voice")}</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-44">
				{cast.map((m, i) => (
					<DropdownMenuItem key={m.name} onClick={() => setSpeaker(cue.id, m.name)}>
						<span className="size-2 rounded-full" style={{ background: castColor(i) }} /> {m.name}
					</DropdownMenuItem>
				))}
				<DropdownMenuItem onClick={() => setSpeaker(cue.id, undefined)}>
					<span className="size-2 rounded-full border" /> {t("Default voice")}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => setSpeaker(cue.id, addCharacter())}>{t("New character…")}</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
