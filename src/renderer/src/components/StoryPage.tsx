import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenText, FolderOpen, Loader2, MoreHorizontal, Pause, PencilLine, RotateCcw, Save, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { KVS_TEMPLATES, type KvsStatus, type KvsVoice, type StoryRecord, type StoryRequest } from "@shared/types";
import { EXAMPLE_STORY, MAX_SPEAKERS, detectSpeakers, parseStory, spokenText } from "@shared/story";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { runTask, useEditor } from "@/state/store";
import { AppSelect, IconButton, TaskProgress, useBusy, type Option } from "./common";
import { WaveformPlayer } from "./WaveformPlayer";

// Story studio, as in Khmer Voice Studio: one line per speaker ("Sokha: …" or "សុខា៖ …"), a voice for every speaker,
// [pause 2s] for silence and "Sokha (whisper): …" for one line's style. The voice engine reads the whole story in one
// job; a single line can be spoken again without redoing the rest.

const MAX_SCRIPT = 30_000;
const DOTS = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"];

type Speakers = StoryRequest["speakers"];

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
	const [status, setStatus] = useState<KvsStatus | null>(null);
	const [voices, setVoices] = useState<KvsVoice[]>([]);
	const [stories, setStories] = useState<StoryRecord[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [script, setScript] = useState(EXAMPLE_STORY);
	const [speakers, setSpeakers] = useState<Speakers>({});
	const telling = useBusy("story-");

	const refresh = useCallback(() => void window.kroma.stories().then(setStories), []);
	useEffect(() => {
		refresh();
		void window.kroma.kvsVoices().then(setVoices);
		void window.kroma.kvsStatus().then(setStatus);
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

	// The speakers follow the script as it is typed: a new name gets a fitting voice, known ones keep theirs.
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

	const tell = async () => {
		const made = await runTask(`story-${Date.now()}`, "Story", (id) => window.kroma.tellStory(id, { title, script, speakers }));
		if (!made) return;
		refresh();
		setSelected(made.id);
		useEditor.getState().showToast("The story is ready");
	};

	const redo = async (from: StoryRecord, line: number) => {
		const made = await runTask(`story-redo-${Date.now()}`, `Redo line ${line + 1}`, (id) => window.kroma.redoStoryLine(id, from.id, line));
		if (!made) return;
		refresh();
		setSelected(made.id);
		useEditor.getState().showToast(`Line ${line + 1} spoken again`, "info", "The earlier version is still in your stories.");
	};

	const edit = (s: StoryRecord) => {
		setTitle(s.title.replace(/ · line \d+$/, ""));
		setScript(s.script);
		setSpeakers(s.speakers);
		setSelected(null);
	};

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto w-full max-w-6xl space-y-6 px-8 pt-6 pb-24">
					<div>
						<h1 className="text-xl font-semibold">Story studio</h1>
						<p className="mt-1 text-xs text-muted-foreground">A different voice for every character of a story, read by the Khmer Voice Studio engine.</p>
					</div>

					{offline && (
						<div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs">
							<span className="flex items-center gap-2">
								<TriangleAlert className="size-4 text-warning" /> The voice engine is offline. Start it (on this computer, or in its Colab notebook), then try again.
							</span>
							<Button variant="outline" size="xs" onClick={() => useEditor.getState().openSettings("voice-engine")}>
								Voice Engine settings
							</Button>
						</div>
					)}

					<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
						<section className="space-y-5 rounded-lg border bg-card/30 p-4">
							<div className="space-y-1.5">
								<label htmlFor="story-script" className="text-[13px] font-medium">
									Script
								</label>
								<Textarea id="story-script" lang="km" rows={10} maxLength={MAX_SCRIPT} value={script} onChange={(e) => setScript(e.target.value)} className="min-h-44 text-[13px] leading-relaxed" />
								<div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
									<span>
										One line per speaker, like <code>Sokha: …</code> or <code>សុខា៖ …</code>. Lines without a speaker are the Narrator's. <code>[pause 2s]</code> adds a pause;{" "}
										<code>Sokha (whisper): …</code> gives one line its own style.
									</span>
									<span className="shrink-0 tabular-nums">
										{script.length} / {MAX_SCRIPT}
									</span>
								</div>
							</div>

							<div className="space-y-2">
								<p className="text-[13px] font-medium">Voices</p>
								{names.length > MAX_SPEAKERS && <p className="text-[11px] text-warning">Only the first {MAX_SPEAKERS} speakers get their own voice.</p>}
								{names.length === 0 ? (
									<p className="text-xs text-muted-foreground">Write a line to see its speaker here.</p>
								) : (
									<ul className="divide-y rounded-lg border">
										{Object.entries(speakers).map(([name, s], i) => (
											<li key={name} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)_8rem]">
												<span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
													<span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOTS[i % DOTS.length])} />
													<span className="truncate">{name}</span>
												</span>
												<AppSelect label={`Voice for ${name}`} value={s.voice} options={voiceOptions} onChange={(voice) => setSpeakers((c) => ({ ...c, [name]: { ...c[name], voice } }))} />
												<Input
													aria-label={`Style for ${name}`}
													placeholder="Style" title="A style for all their lines, like excited or sad"
													className="h-8 text-xs"
													maxLength={200}
													value={s.style}
													onChange={(e) => setSpeakers((c) => ({ ...c, [name]: { ...c[name], style: e.target.value } }))}
												/>
											</li>
										))}
									</ul>
								)}
							</div>

							<div className="space-y-1.5">
								<label htmlFor="story-title" className="text-[13px] font-medium">
									Title
								</label>
								<Input id="story-title" className="h-8 text-[13px]" maxLength={120} placeholder="Untitled story" value={title} onChange={(e) => setTitle(e.target.value)} />
							</div>

							<TaskProgress prefix="story-" />
							<div className="flex justify-end">
								<Button size="sm" disabled={telling || offline || lineCount === 0} onClick={() => void tell()}>
									{telling ? <Loader2 className="animate-spin" /> : <Sparkles />} {telling ? "Working…" : "Generate story"}
								</Button>
							</div>
						</section>

						<div className="space-y-6">
							<section className="space-y-3 rounded-lg border bg-card/30 p-4">
								<h2 className="flex items-center gap-2 text-sm font-semibold">
									<BookOpenText className="size-4" /> {story ? story.title : "Preview"}
								</h2>
								{story ? <StoryResult story={story} busy={telling} offline={offline} onRedo={(line) => void redo(story, line)} /> : <ScriptPreview items={items} speakers={Object.keys(speakers)} />}
							</section>

							<section className="space-y-2 rounded-lg border bg-card/30 p-4">
								<h2 className="text-sm font-semibold">Your stories</h2>
								{stories.length === 0 ? (
									<p className="text-xs text-muted-foreground">Stories you make are kept here.</p>
								) : (
									<ul className="divide-y">
										{stories.map((s) => (
											<li key={s.id} className="flex items-center gap-2 py-1.5">
												<button
													type="button"
													onClick={() => setSelected(s.id === selected ? null : s.id)}
													aria-current={s.id === selected ? "true" : undefined}
													className={cn("min-w-0 flex-1 rounded-md px-2 py-1 text-left transition-colors hover:bg-foreground/5", s.id === selected && "bg-sidebar-accent")}
												>
													<span lang="km" className="block truncate text-[13px]">
														{s.title}
													</span>
													<span className="text-[11px] text-muted-foreground">
														{s.cues.length} lines · {formatClock(s.seconds)} · {new Date(s.created).toLocaleString()}
													</span>
												</button>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon-xs" aria-label={`More for ${s.title}`}>
															<MoreHorizontal />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => edit(s)}>
															<PencilLine /> Edit the script
														</DropdownMenuItem>
														<DropdownMenuItem onClick={() => void window.kroma.saveStoryAs(s.id).then((p) => p && useEditor.getState().showToast("Saved", "info", p))}>
															<Save /> Save audio as…
														</DropdownMenuItem>
														<DropdownMenuItem onClick={() => void window.kroma.showStory(s.id)}>
															<FolderOpen /> Show in folder
														</DropdownMenuItem>
														<DropdownMenuItem
															variant="destructive"
															onClick={() => {
																if (!window.confirm(`Delete the story "${s.title}"?`)) return;
																void window.kroma.deleteStory(s.id).then(() => {
																	if (selected === s.id) setSelected(null);
																	refresh();
																});
															}}
														>
															<Trash2 /> Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</li>
										))}
									</ul>
								)}
							</section>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/** The script as the engine will read it: who says what, the pauses, and each line's own style. */
function ScriptPreview({ items, speakers }: { items: ReturnType<typeof parseStory>; speakers: string[] }) {
	if (!items.length) return <p className="text-xs text-muted-foreground">The story's lines show here as you write them.</p>;
	return (
		<ul className="space-y-1.5">
			{items.map((item, i) =>
				item.type === "pause" ? (
					<li key={i} className="flex items-center gap-2 pl-4 text-[11px] text-muted-foreground">
						<Pause className="size-3" /> {item.seconds} s pause
					</li>
				) : (
					<li key={i} className="flex gap-2">
						<span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOTS[Math.max(0, speakers.indexOf(item.speaker)) % DOTS.length])} />
						<span className="min-w-0">
							<span lang="km" className="block text-[13px]">
								{item.text}
							</span>
							<span className="text-[11px] text-muted-foreground">
								{item.speaker}
								{item.style && ` · ${item.style}`}
							</span>
						</span>
					</li>
				),
			)}
		</ul>
	);
}

function StoryResult({ story, busy, offline, onRedo }: { story: StoryRecord; busy: boolean; offline: boolean; onRedo: (line: number) => void }) {
	const speakers = Object.keys(story.speakers);
	return (
		<div className="space-y-3">
			<p className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
				{story.cues.length} lines · {formatClock(story.seconds)}
				{story.redoneLine !== undefined && (
					<Badge variant="outline" className="text-[10px]">
						line {story.redoneLine + 1} redone
					</Badge>
				)}
			</p>
			{story.audio ? <WaveformPlayer path={story.audio} /> : <p className="text-xs text-destructive">The audio file is missing.</p>}
			<ul className="divide-y rounded-lg border">
				{story.cues.map(([start, end, text], i) => {
					const colon = text.indexOf(": ");
					const speaker = colon > 0 && speakers.includes(text.slice(0, colon)) ? text.slice(0, colon) : "Narrator";
					const words = speaker === "Narrator" && !text.startsWith("Narrator: ") ? text : text.slice(colon + 2);
					return (
						<li key={i} className={cn("flex items-start gap-2 px-3 py-2", story.redoneLine === i && "bg-primary/5")}>
							<span className="w-24 shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
								{formatClock(start)}–{formatClock(end)}
							</span>
							<span className="min-w-0 flex-1">
								<span lang="km" className="block text-[13px]">
									{spokenText(words)}
								</span>
								<span className="text-[11px] text-muted-foreground">{speaker}</span>
							</span>
							<IconButton label={offline ? "Start the voice engine to redo a line" : `Speak line ${i + 1} again`} disabled={busy || offline} onClick={() => onRedo(i)}>
								<RotateCcw />
							</IconButton>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

const formatClock = (seconds: number) => {
	const s = Math.max(0, seconds);
	return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};
