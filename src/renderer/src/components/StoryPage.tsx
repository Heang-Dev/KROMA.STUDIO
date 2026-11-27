import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, FolderOpen, Headphones, Loader2, Pause, PencilLine, Plus, RotateCcw, Save, Sparkles, Trash2, Users } from "lucide-react";
import { KVS_TEMPLATES, type KvsVoice, type StoryRecord, type StoryRequest } from "@shared/types";
import { EXAMPLE_STORY, MAX_SPEAKERS, detectSpeakers, parseStory, spokenText } from "@shared/story";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { runTask, useEditor } from "@/state/store";
import { AppSelect, IconButton, Segmented, TaskProgress, useBusy, type Option } from "./common";
import { EngineChip, useEngineStatus } from "./EngineStatus";
import { WaveformPlayer } from "./WaveformPlayer";

// Story studio, laid out like an editor: your stories on the left; a top bar with the title, Write / Listen, the
// engine and Generate; under it either the script (with the cast — a voice and style per speaker — beside it) or the
// story you're listening to, line by line, where any line can be spoken again.

const MAX_SCRIPT = 30_000;
const DOTS = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"];

type Speakers = StoryRequest["speakers"];
type Tab = "write" | "listen";

/** A first guess at a speaker's voice from their name (a template whose words match), else the engine's default. */
function suggestVoice(name: string, templates: string[]): string {
	const lower = name.toLowerCase();
	const hints: [RegExp, string][] = [
		[/narrat|អ្នកនិទាន/, "Narrator (deep male)"],
		[/grandpa|grandfather|លោកតា|^តា/, "Storyteller (warm grandfather)"],
		[/grandma|grandmother|យាយ/, "Storyteller (kind grandmother)"],
		[/girl|ស្រី/, "Young girl"],
		[/boy|ប្រុស/, "Young boy"],
		[/king|ស្ដេច|ស្តេច/, "King (majestic)"],
		[/queen|មហេសី/, "Queen (elegant)"],
		[/mother|mom|ម្ដាយ|ម៉ាក់/, "Mother (caring)"],
		[/father|dad|ឪពុក|ប៉ា/, "Father (strict)"],
	];
	const hit = hints.find(([re, t]) => re.test(lower) && templates.includes(t));
	return hit ? `kvs-design:${hit[1]}` : "default";
}

export function StoryPage() {
	const { status } = useEngineStatus();
	const [voices, setVoices] = useState<KvsVoice[]>([]);
	const [stories, setStories] = useState<StoryRecord[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>("write");
	const [title, setTitle] = useState("");
	const [script, setScript] = useState(EXAMPLE_STORY);
	const [speakers, setSpeakers] = useState<Speakers>({});
	const editor = useRef<HTMLTextAreaElement>(null);
	const telling = useBusy("story-");

	const refresh = useCallback(() => void window.kroma.stories().then(setStories), []);
	useEffect(() => {
		refresh();
		void window.kroma.kvsVoices().then(setVoices);
	}, [refresh]);

	const templates = (status?.presets.length ? status.presets : KVS_TEMPLATES).map((t) => t.name);
	const voiceOptions: Option[] = useMemo(
		() => [
			{ value: "default", label: "Engine default voice" },
			...voices.filter((v) => !v.preset).map((v) => ({ value: `kvs-clone:${v.id}`, label: `${v.name} (cloned)` })),
			...templates.map((t) => ({ value: `kvs-design:${t}`, label: t })),
		],
		[voices, templates],
	);

	// The cast follows the script as it is typed: a new name gets a fitting voice, known ones keep theirs.
	const names = useMemo(() => detectSpeakers(script), [script]);
	useEffect(() => {
		setSpeakers((current) => {
			const next: Speakers = {};
			for (const name of names.slice(0, MAX_SPEAKERS)) next[name] = current[name] ?? { voice: suggestVoice(name, templates), style: "" };
			return next;
		});
	}, [names.join("\n"), templates.join("\n")]);

	const items = useMemo(() => parseStory(script), [script]);
	const lineCount = items.filter((i) => i.type === "line").length;
	const story = stories.find((s) => s.id === selected) ?? null;
	const offline = status !== null && !status.online;

	const open = (id: string) => {
		setSelected(id);
		setTab("listen");
	};
	const newStory = () => {
		setSelected(null);
		setTitle("");
		setScript("");
		setTab("write");
		setTimeout(() => editor.current?.focus(), 0);
	};
	const edit = (s: StoryRecord) => {
		setTitle(s.title.replace(/ · line \d+$/, ""));
		setScript(s.script);
		setSpeakers(s.speakers);
		setTab("write");
	};

	const tell = async () => {
		const made = await runTask(`story-${Date.now()}`, "Story", (id) => window.kroma.tellStory(id, { title, script, speakers }));
		if (!made) return;
		refresh();
		open(made.id);
		useEditor.getState().showToast("The story is ready");
	};
	const redo = async (from: StoryRecord, line: number) => {
		const made = await runTask(`story-redo-${Date.now()}`, `Redo line ${line + 1}`, (id) => window.kroma.redoStoryLine(id, from.id, line));
		if (!made) return;
		refresh();
		open(made.id);
		useEditor.getState().showToast(`Line ${line + 1} spoken again`, "info", "The earlier version is still in your stories.");
	};
	const remove = (s: StoryRecord) => {
		if (!window.confirm(`Delete the story "${s.title}"?`)) return;
		void window.kroma.deleteStory(s.id).then(() => {
			if (selected === s.id) {
				setSelected(null);
				setTab("write");
			}
			refresh();
		});
	};

	/** Puts `text` at the cursor in the script (a pause, or a speaker's name at the start of a new line). */
	const insert = (text: string, onNewLine = false) => {
		const el = editor.current;
		const at = el?.selectionStart ?? script.length;
		const end = el?.selectionEnd ?? at;
		const before = script.slice(0, at);
		const piece = onNewLine && before && !before.endsWith("\n") ? `\n${text}` : text;
		setScript(before + piece + script.slice(end));
		setTimeout(() => {
			el?.focus();
			el?.setSelectionRange(at + piece.length, at + piece.length);
		}, 0);
	};

	return (
		<div className="flex min-h-0 min-w-0 flex-1 bg-background">
			{/* Your stories */}
			<aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar">
				<div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
					<span className="flex items-center gap-2 text-[13px] font-semibold">
						<BookOpenText className="size-4" /> Stories
					</span>
					<Button variant="outline" size="xs" onClick={newStory}>
						<Plus /> New
					</Button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					{stories.length === 0 ? (
						<p className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">Stories you make are kept here. Write a script and press Generate.</p>
					) : (
						<ul className="space-y-0.5">
							{stories.map((s) => (
								<li key={s.id}>
									<button
										type="button"
										onClick={() => open(s.id)}
										aria-current={s.id === selected ? "true" : undefined}
										className={cn("w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-foreground/5", s.id === selected && "bg-sidebar-accent text-sidebar-accent-foreground")}
									>
										<span lang="km" className="block truncate text-[13px]">
											{s.title}
										</span>
										<span className="text-[11px] text-muted-foreground">
											{s.cues.length} lines · {formatClock(s.seconds)} · {new Date(s.created).toLocaleDateString()}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</aside>

			<div className="flex min-w-0 flex-1 flex-col">
				{/* Top bar */}
				<header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
					{tab === "write" ? (
						<Input
							aria-label="Story title"
							className="h-8 max-w-sm border-transparent bg-transparent text-[13px] font-medium shadow-none hover:border-input"
							maxLength={120}
							placeholder="Untitled story"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					) : (
						<p lang="km" className="min-w-0 truncate text-[13px] font-medium">
							{story?.title}
						</p>
					)}
					<Segmented
						label="Write or listen"
						size="sm"
						value={tab}
						options={[
							{ value: "write", label: "Write" },
							{ value: "listen", label: "Listen" },
						]}
						onChange={(t) => (t === "listen" && !story ? stories[0] && open(stories[0].id) : setTab(t))}
					/>
					<span className="flex-1" />
					<EngineChip />
					<Button size="sm" disabled={telling || offline || lineCount === 0} onClick={() => void tell()} title={offline ? "Start the voice engine first" : undefined}>
						{telling ? <Loader2 className="animate-spin" /> : <Sparkles />} {telling ? "Working…" : "Generate"}
					</Button>
				</header>
				{telling && (
					<div className="shrink-0 border-b px-4 py-2.5">
						<TaskProgress prefix="story-" />
					</div>
				)}

				{tab === "write" ? (
					<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
						{/* Script */}
						<section className="flex min-h-0 flex-col border-r">
							<div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-4 py-2">
								<span className="mr-1 text-[11px] text-muted-foreground">Insert</span>
								<Button variant="outline" size="xs" onClick={() => insert(" [pause 1s] ")}>
									<Pause /> Pause
								</Button>
								{names.map((name, i) => (
									<Button key={name} variant="ghost" size="xs" onClick={() => insert(`${name}: `, true)}>
										<span aria-hidden className={cn("size-2 rounded-full", DOTS[i % DOTS.length])} /> {name}
									</Button>
								))}
								<span className="flex-1" />
								{!script && (
									<Button variant="ghost" size="xs" onClick={() => setScript(EXAMPLE_STORY)}>
										Use the example
									</Button>
								)}
							</div>
							<textarea
								ref={editor}
								lang="km"
								aria-label="Script"
								maxLength={MAX_SCRIPT}
								value={script}
								onChange={(e) => setScript(e.target.value)}
								placeholder={"Narrator: កាលពីព្រេងនាយ…\n[pause 1s]\nSokha (excited): លោកតា!"}
								className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-[14px] leading-7 outline-none placeholder:text-muted-foreground/60"
							/>
							<div className="flex shrink-0 items-center justify-between gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
								<span>
									One line per speaker: <code className="text-foreground/80">Sokha: …</code> or <code className="text-foreground/80">សុខា៖ …</code> · no name = Narrator · <code className="text-foreground/80">[pause 2s]</code> for a pause ·{" "}
									<code className="text-foreground/80">Sokha (whisper): …</code> for one line's style
								</span>
								<span className="shrink-0 tabular-nums">
									{lineCount} lines · {script.length.toLocaleString()} / {MAX_SCRIPT.toLocaleString()}
								</span>
							</div>
						</section>

						{/* Cast and lines */}
						<aside className="min-h-0 overflow-y-auto">
							<section className="space-y-3 border-b p-4">
								<h2 className="flex items-center gap-2 text-[13px] font-semibold">
									<Users className="size-4" /> Cast
								</h2>
								{names.length > MAX_SPEAKERS && <p className="text-[11px] text-warning">Only the first {MAX_SPEAKERS} speakers get their own voice.</p>}
								{names.length === 0 ? (
									<p className="text-xs text-muted-foreground">Each speaker in the script shows here, to choose their voice.</p>
								) : (
									<ul className="space-y-3">
										{Object.entries(speakers).map(([name, s], i) => (
											<li key={name} className="space-y-1.5 rounded-lg border bg-card/50 p-2.5">
												<p className="flex items-center gap-2 text-[13px] font-medium">
													<span aria-hidden className={cn("size-2 rounded-full", DOTS[i % DOTS.length])} /> {name}
												</p>
												<AppSelect label={`Voice for ${name}`} value={s.voice} options={voiceOptions} onChange={(voice) => setSpeakers((c) => ({ ...c, [name]: { ...c[name], voice } }))} />
												<Input
													aria-label={`Style for ${name}`}
													placeholder="Style for all their lines (excited, sad…)"
													className="h-8 text-xs"
													maxLength={200}
													value={s.style}
													onChange={(e) => setSpeakers((c) => ({ ...c, [name]: { ...c[name], style: e.target.value } }))}
												/>
											</li>
										))}
									</ul>
								)}
							</section>
							<section className="space-y-2 p-4">
								<h2 className="text-[13px] font-semibold">How it will be read</h2>
								<ScriptPreview items={items} speakers={Object.keys(speakers)} />
							</section>
						</aside>
					</div>
				) : story ? (
					<div className="min-h-0 flex-1 overflow-y-auto">
						<StoryResult story={story} busy={telling} offline={offline} onRedo={(line) => void redo(story, line)} onEdit={() => edit(story)} onDelete={() => remove(story)} />
					</div>
				) : (
					<div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Choose a story on the left to listen to it.</div>
				)}
			</div>
		</div>
	);
}

/** The script as the engine will read it: who says what, the pauses, and each line's own style. */
function ScriptPreview({ items, speakers }: { items: ReturnType<typeof parseStory>; speakers: string[] }) {
	if (!items.length) return <p className="text-xs text-muted-foreground">The lines show here as you write them.</p>;
	return (
		<ol className="space-y-2">
			{items.map((item, i) =>
				item.type === "pause" ? (
					<li key={i} className="flex items-center gap-2 pl-4 text-[11px] text-muted-foreground">
						<Pause className="size-3" /> {item.seconds} s pause
					</li>
				) : (
					<li key={i} className="flex gap-2">
						<span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOTS[Math.max(0, speakers.indexOf(item.speaker)) % DOTS.length])} />
						<span className="min-w-0">
							<span lang="km" className="block text-xs leading-relaxed">
								{spokenText(item.text)}
							</span>
							<span className="text-[11px] text-muted-foreground">
								{item.speaker}
								{item.style && ` · ${item.style}`}
							</span>
						</span>
					</li>
				),
			)}
		</ol>
	);
}

function StoryResult({ story, busy, offline, onRedo, onEdit, onDelete }: { story: StoryRecord; busy: boolean; offline: boolean; onRedo: (line: number) => void; onEdit: () => void; onDelete: () => void }) {
	const speakers = Object.keys(story.speakers);
	return (
		<div className="mx-auto w-full max-w-5xl space-y-5 px-6 py-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="flex items-center gap-2 text-xs text-muted-foreground">
					<Headphones className="size-4" /> {story.cues.length} lines · {formatClock(story.seconds)} · {new Date(story.created).toLocaleString()}
					{story.redoneLine !== undefined && <span className="rounded-sm border px-1.5 py-0.5 text-[10px]">line {story.redoneLine + 1} redone</span>}
				</p>
				<div className="flex flex-wrap gap-1.5">
					<Button variant="outline" size="sm" onClick={onEdit}>
						<PencilLine /> Edit the script
					</Button>
					<Button variant="outline" size="sm" onClick={() => void window.kroma.saveStoryAs(story.id).then((p) => p && useEditor.getState().showToast("Saved", "info", p))}>
						<Save /> Save audio as…
					</Button>
					<Button variant="ghost" size="sm" onClick={() => void window.kroma.showStory(story.id)}>
						<FolderOpen /> Show in folder
					</Button>
					<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
						<Trash2 /> Delete
					</Button>
				</div>
			</div>
			<div className="rounded-lg border bg-card/50 p-4">{story.audio ? <WaveformPlayer path={story.audio} /> : <p className="text-xs text-destructive">The audio file is missing.</p>}</div>
			<div>
				<p className="mb-2 text-[11px] text-muted-foreground">Not happy with a line? Press ↻ to speak just that line again; the rest stays the same.</p>
				<ul className="divide-y rounded-lg border">
					{story.cues.map(([start, end, text], i) => {
						const colon = text.indexOf(": ");
						const speaker = colon > 0 && speakers.includes(text.slice(0, colon)) ? text.slice(0, colon) : "Narrator";
						const words = speaker === "Narrator" && !text.startsWith("Narrator: ") ? text : text.slice(colon + 2);
						return (
							<li key={i} className={cn("flex items-start gap-3 px-4 py-2.5", story.redoneLine === i && "bg-primary/5")}>
								<span className="w-28 shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
									{formatClock(start)} – {formatClock(end)}
								</span>
								<span className="flex w-28 shrink-0 items-center gap-1.5 pt-0.5 text-[12px] text-muted-foreground">
									<span aria-hidden className={cn("size-2 rounded-full", DOTS[Math.max(0, speakers.indexOf(speaker)) % DOTS.length])} />
									<span className="truncate">{speaker}</span>
								</span>
								<span lang="km" className="min-w-0 flex-1 text-[13px] leading-relaxed">
									{spokenText(words)}
								</span>
								<IconButton label={offline ? "Start the voice engine to redo a line" : `Speak line ${i + 1} again`} disabled={busy || offline} onClick={() => onRedo(i)}>
									<RotateCcw />
								</IconButton>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

const formatClock = (seconds: number) => {
	const s = Math.max(0, seconds);
	return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};
