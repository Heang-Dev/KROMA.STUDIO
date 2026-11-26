import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FileArrowUp, MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react";
import type { Cue } from "@shared/types";
import { importSrt } from "@/lib/actions";
import { cueAt, formatTime, totalDuration, uid } from "@/lib/timeline";
import { useEditor } from "@/state/store";
import { IconButton, inputClass } from "./ui";

export function SubtitleList() {
	const cues = useEditor((s) => s.project.cues);
	const active = useEditor((s) => cueAt(s.project.cues, s.time));
	const playing = useEditor((s) => s.playing);
	const selectedId = useEditor((s) => (s.selection?.kind === "cue" ? s.selection.id : null));
	const [query, setQuery] = useState("");
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
		<aside className="flex w-[380px] shrink-0 flex-col border-l border-line bg-panel">
			<header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
				<div>
					<h2 className="text-[13px] font-semibold">Subtitles</h2>
					<p className="text-[11px] text-dim">{cues.length ? `${cues.length} lines · ${translated} in Khmer` : "None yet"}</p>
				</div>
				<div className="flex">
					<IconButton label="Import an .srt file" onClick={() => void importSrt()}>
						<FileArrowUp size={16} />
					</IconButton>
					<IconButton label="Add a line at the playhead" onClick={addLine}>
						<Plus size={16} />
					</IconButton>
				</div>
			</header>
			{cues.length > 0 && (
				<div className="relative border-b border-line px-3 py-2">
					<MagnifyingGlass size={14} className="absolute top-1/2 left-5.5 -translate-y-1/2 text-dim" />
					<input className={`${inputClass} pl-8`} placeholder="Find in subtitles" value={query} onChange={(e) => setQuery(e.target.value)} />
				</div>
			)}
			<div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
				{visible.map((cue) => (
					<CueRow key={cue.id} cue={cue} active={cues[active]?.id === cue.id} selected={selectedId === cue.id} />
				))}
				{cues.length === 0 && <p className="px-4 py-6 text-xs leading-relaxed text-dim">Subtitles appear here after "Make Khmer subtitles". You can fix any line by typing in it.</p>}
			</div>
		</aside>
	);
}

const CueRow = memo(function CueRow({ cue, active, selected }: { cue: Cue; active: boolean; selected: boolean }) {
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
			className={`cue-row group border-b border-line/60 px-4 py-2.5 ${active ? "bg-accent/[0.07]" : ""} ${selected ? "shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}
		>
			<div className="mb-1 flex items-center justify-between">
				<button type="button" className="font-mono text-[11px] tabular-nums text-dim hover:text-accent" onClick={focus}>
					{formatTime(cue.start, true)} → {formatTime(cue.end, true)}
				</button>
				<button
					type="button"
					aria-label="Delete line"
					title="Delete line"
					className="text-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
					onClick={() => update((p) => ({ ...p, cues: p.cues.filter((c) => c.id !== cue.id) }))}
				>
					<Trash size={14} />
				</button>
			</div>
			{cue.source && <p className="mb-1 text-[12.5px] leading-snug text-muted select-text">{cue.source}</p>}
			<textarea
				rows={1}
				value={cue.text}
				placeholder={cue.source ? "Not translated yet" : "Type the Khmer line"}
				onFocus={focus}
				onChange={(e) => setText(e.target.value)}
				className="field-sizing-content w-full resize-none rounded border border-transparent bg-transparent px-1.5 py-1 font-khmer text-[15px] leading-relaxed text-fg placeholder:text-dim hover:border-line focus:border-accent focus:bg-bg focus:outline-none"
			/>
		</div>
	);
});
