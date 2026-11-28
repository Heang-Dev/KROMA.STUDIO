import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, FolderOpen, Headphones, Loader2, Pause, PencilLine, Plus, RotateCcw, Save, Sparkles, Trash2, Users } from "lucide-react";
import { KVS_TEMPLATES, groupTemplates, type KvsVoice, type StoryRecord, type StoryRequest } from "@shared/types";
import { EXAMPLE_STORY, MAX_SPEAKERS, detectSpeakers, parseStory, spokenText } from "@shared/story";
import { t } from "@shared/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { runTask, useEditor } from "@/state/store";
import { AppSelect, IconButton, Segmented, TaskProgress, useBusy, type Option } from "./common";
import { EngineChip, useEngineStatus } from "./EngineStatus";
import { WaveformPlayer } from "./WaveformPlayer";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "@/components/empty/EmptyState";

// Story studio, laid out like an editor: your stories on the left; a top bar with the title, Write / Listen, the
// engine and Generate; under it either the script (with the cast — a voice and style per speaker — beside it) or the
// story you're listening to, line by line, where any line can be spoken again.

const MAX_SCRIPT = 30_000;
const DOTS = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"];

type Speakers = StoryRequest["speakers"];
type Tab = "write" | "listen";

/** A speaker's name as shown: the script's own words, except the default Narrator, which is named in the interface's language. */
const speakerName = (name: string) => (name === "Narrator" ? t("Narrator") : name);

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
	const hit = hints.find(([re, voice]) => re.test(lower) && templates.includes(voice));
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

	const presets = status?.presets.length ? status.presets : KVS_TEMPLATES;
	const templates = presets.map((p) => p.name);
	// Grouped like the character picker: the engine's default, your cloned voices, then the preset groups with what
	// each sounds like (instant voices aren't offered: the engine reads stories).
	const voiceOptions: Option[] = useMemo(
		() => [
			{ value: "default", label: t("Engine default voice"), description: t("Whatever voice the engine picks"), group: t("Default") },
			...voices.filter((v) => !v.preset).map((v) => ({ value: `kvs-clone:${v.id}`, label: v.name, description: t("Your cloned voice"), group: t("Your voices") })),
			...groupTemplates(presets).flatMap((g) => g.items.map((tpl) => ({ value: `kvs-design:${tpl.name}`, label: tpl.name, description: tpl.description, group: t(g.title) }))),
		],
		[voices, presets],
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
		const made = await runTask(`story-${Date.now()}`, t("Story"), (id) => window.kroma.tellStory(id, { title, script, speakers }), {
			kind: "voices",
			done: (s) => ({ tone: "success", title: t("Story ready: {title}", { title: s.title }), action: { kind: "view", view: "story" } }),
			failed: t("The story failed"),
			retry: () => tell(),
		});
		if (!made) return;
		refresh();
		open(made.id);
	};
	const redo = async (from: StoryRecord, line: number) => {
		const made = await runTask(`story-redo-${Date.now()}`, t("Redo line {n}", { n: line + 1 }), (id) => window.kroma.redoStoryLine(id, from.id, line), {
			kind: "voices",
			done: () => ({ tone: "success", title: t("Line {n} spoken again", { n: line + 1 }), detail: t("The earlier version is still in your stories."), action: { kind: "view", view: "story" } }),
			failed: t("Couldn't redo line {n}", { n: line + 1 }),
			retry: () => redo(from, line),
		});
		if (!made) return;
		refresh();
		open(made.id);
	};
	const remove = (s: StoryRecord) => {
		if (!window.confirm(t("Delete the story \"{title}\"?", { title: s.title }))) return;
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

	/** Adds a character: a new line "Name: " at the end of the script, with the cursor after it, ready to type. */
	const [newName, setNewName] = useState("");
	const nameProblem = !newName.trim() ? "" : /[:：៖()]/.test(newName) ? t("A name can't have : or ( )") : newName.trim().length > 30 ? t("At most 30 characters") : "";
	const addCharacter = () => {
		const name = newName.trim();
		if (!name || nameProblem) return;
		const base = script.replace(/\s+$/, "");
		const next = `${base}${base ? "\n" : ""}${name}: `;
		setScript(next);
		setNewName("");
		setTab("write");
		setTimeout(() => {
			editor.current?.focus();
			editor.current?.setSelectionRange(next.length, next.length);
		}, 0);
	};

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			<PageHeader
				icon={<BookOpenText />}
				title={t("Story")}
				description={t("A different voice for every character of a story.")}
				actions={
					<>
						<EngineChip />
						<Button size="sm" disabled={telling || offline || lineCount === 0} onClick={() => void tell()} title={offline ? t("Start the voice engine first") : lineCount === 0 ? t("Write a line first") : undefined}>
							{telling ? <Loader2 className="animate-spin" /> : <Sparkles />} {telling ? t("Working…") : t("Generate story")}
						</Button>
					</>
				}
			>
				<Segmented
					label={t("Write or listen")}
					value={tab}
					options={[
						{ value: "write", label: `1 · ${t("Write")}` },
						{ value: "listen", label: `2 · ${t("Listen")}` },
					]}
					onChange={(next) => (next === "listen" && !story ? stories[0] && open(stories[0].id) : setTab(next))}
				/>
			</PageHeader>
			{telling && (
				<div className="shrink-0 border-b px-4 py-2.5">
					<TaskProgress prefix="story-" />
				</div>
			)}
			<div className="flex min-h-0 flex-1">
			{/* Your stories */}
			<aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar">
				<div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
					<span className="text-xs font-medium text-muted-foreground">{t("Your stories")} · {stories.length}</span>
					<Button variant="outline" size="xs" onClick={newStory}>
						<Plus /> {t("New story")}
					</Button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					{stories.length === 0 ? (
						<EmptyState compact scene="story" title={t("No stories yet")} description={t("Write a script on the right, then press Generate story. Every story you make is kept here.")} />
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
											{t("{n} lines", { n: s.cues.length })} · {formatClock(s.seconds)} · {new Date(s.created).toLocaleDateString()}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</aside>

			<div className="flex min-w-0 flex-1 flex-col">
				{tab === "write" ? (
					<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
						{/* Script */}
						<section className="flex min-h-0 flex-col border-r">
							<div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
								<label htmlFor="story-title" className="shrink-0 text-xs text-muted-foreground">
									{t("Title")}
								</label>
								<Input
									id="story-title"
									aria-label={t("Story title")}
									title={title || undefined}
									className="max-w-md truncate text-[13px] font-medium"
									maxLength={120}
									placeholder={t("Untitled story")}
									value={title}
									onChange={(e) => setTitle(e.target.value)}
								/>
							</div>
							<div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b px-4 py-2 [scrollbar-width:none]">
								<span className="mr-1 shrink-0 text-[11px] text-muted-foreground">{t("Insert")}</span>
								<Button variant="outline" size="xs" className="shrink-0" onClick={() => insert(" [pause 1s] ")}>
									<Pause /> {t("Pause")}
								</Button>
								{names.map((name, i) => (
									<Button key={name} variant="outline" size="xs" className="max-w-44 shrink-0" title={t("Insert \"{name}: \"", { name })} onClick={() => insert(`${name}: `, true)}>
										<span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOTS[i % DOTS.length])} /> <span className="truncate">{speakerName(name)}</span>
									</Button>
								))}
								<span className="flex-1" />
								{!script && (
									<Button variant="outline" size="xs" onClick={() => setScript(EXAMPLE_STORY)}>
										{t("Use the example")}
									</Button>
								)}
							</div>
							<textarea
								ref={editor}
								lang="km"
								aria-label={t("Script")}
								maxLength={MAX_SCRIPT}
								value={script}
								onChange={(e) => setScript(e.target.value)}
								placeholder={"Narrator: កាលពីព្រេងនាយ…\n[pause 1s]\nSokha (excited): លោកតា!"}
								className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-[14px] leading-7 outline-none placeholder:text-muted-foreground/60"
							/>
							<div className="flex shrink-0 items-center justify-between gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
								<span>
									{t("One line per speaker:")} <code className="text-foreground/80">Sokha: …</code> {t("or")} <code className="text-foreground/80">សុខា៖ …</code> · {t("no name = Narrator")} · <code className="text-foreground/80">[pause 2s]</code> {t("for a pause")} ·{" "}
									<code className="text-foreground/80">Sokha (whisper): …</code> {t("for one line's style")}
								</span>
								<span className="shrink-0 tabular-nums">
									{t("{n} lines", { n: lineCount })} · {script.length.toLocaleString()} / {MAX_SCRIPT.toLocaleString()}
								</span>
							</div>
						</section>

						{/* Cast and lines */}
						<aside className="min-h-0 overflow-y-auto">
							<section className="space-y-3 border-b p-4">
								<h2 className="flex items-center gap-2 text-[13px] font-semibold">
									<Users className="size-4" /> {t("Cast")}
								</h2>
								{names.length > MAX_SPEAKERS && <p className="text-[11px] text-warning">{t("Only the first {n} speakers get their own voice.", { n: MAX_SPEAKERS })}</p>}
								{names.length === 0 ? (
									<EmptyState compact fill={false} className="rounded-lg border border-dashed" scene="people" title={t("No characters yet")} description={t("Each character in the script shows here, to choose their voice. Add one below, or write a line like \"Sokha: …\".")} />
								) : (
									<ul className="space-y-3">
										{Object.entries(speakers).map(([name, s], i) => (
											<li key={name} className="space-y-1.5 rounded-lg border bg-card/50 p-2.5">
												<p className="flex items-center gap-2 text-[13px] font-medium">
													<span aria-hidden className={cn("size-2 rounded-full", DOTS[i % DOTS.length])} /> {speakerName(name)}
												</p>
												<AppSelect label={t("Voice for {name}", { name: speakerName(name) })} value={s.voice} options={voiceOptions} onChange={(voice) => setSpeakers((c) => ({ ...c, [name]: { ...c[name], voice } }))} />
												<Input
													aria-label={t("Style for {name}", { name: speakerName(name) })}
													placeholder={t("Style (optional), e.g. calm")}
													className="text-xs"
													maxLength={200}
													value={s.style}
													onChange={(e) => setSpeakers((c) => ({ ...c, [name]: { ...c[name], style: e.target.value } }))}
												/>
											</li>
										))}
									</ul>
								)}
								<form
									className="space-y-1.5"
									onSubmit={(e) => {
										e.preventDefault();
										addCharacter();
									}}
								>
									<div className="flex gap-2">
										<Input aria-label={t("New character's name")} placeholder={t("New character, e.g. Mother")} className="min-w-0 flex-1 text-xs" maxLength={40} value={newName} onChange={(e) => setNewName(e.target.value)} />
										<Button type="submit" variant="outline" size="sm" disabled={!newName.trim() || Boolean(nameProblem)}>
											<Plus /> {t("Add")}
										</Button>
									</div>
									{nameProblem ? (
										<p className="text-[11px] text-destructive">{nameProblem}</p>
									) : names.length >= MAX_SPEAKERS && newName.trim() && !names.includes(newName.trim()) ? (
										<p className="text-[11px] text-warning">{t("Only the first {n} characters get their own voice; more use the Narrator's.", { n: MAX_SPEAKERS })}</p>
									) : (
										<p className="text-[11px] text-muted-foreground">{t("Starts a new line for them in the script; they get a fitting voice you can change.")}</p>
									)}
								</form>
							</section>
							<section className="space-y-2 p-4">
								<h2 className="text-[13px] font-semibold">{t("How it will be read")}</h2>
								<ScriptPreview items={items} speakers={Object.keys(speakers)} />
							</section>
						</aside>
					</div>
				) : story ? (
					<div className="min-h-0 flex-1 overflow-y-auto">
						<StoryResult story={story} busy={telling} offline={offline} onRedo={(line) => void redo(story, line)} onEdit={() => edit(story)} onDelete={() => remove(story)} />
					</div>
				) : (
					<div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">{t("Choose a story on the left to listen to it.")}</div>
				)}
			</div>
			</div>
		</div>
	);
}

/** The script as the engine will read it: who says what, the pauses, and each line's own style. */
function ScriptPreview({ items, speakers }: { items: ReturnType<typeof parseStory>; speakers: string[] }) {
	if (!items.length) return <p className="text-xs text-muted-foreground">{t("The lines show here as you write them.")}</p>;
	return (
		<ol className="space-y-2">
			{items.map((item, i) =>
				item.type === "pause" ? (
					<li key={i} className="flex items-center gap-2 pl-4 text-[11px] text-muted-foreground">
						<Pause className="size-3" /> {t("{n} s pause", { n: item.seconds })}
					</li>
				) : (
					<li key={i} className="flex gap-2">
						<span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOTS[Math.max(0, speakers.indexOf(item.speaker)) % DOTS.length])} />
						<span className="min-w-0">
							<span lang="km" className="block text-xs leading-relaxed">
								{spokenText(item.text)}
							</span>
							<span className="text-[11px] text-muted-foreground">
								{speakerName(item.speaker)}
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
			<h2 lang="km" className="truncate text-base font-semibold" title={story.title}>
				{story.title}
			</h2>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="flex items-center gap-2 text-xs text-muted-foreground">
					<Headphones className="size-4" /> {t("{n} lines", { n: story.cues.length })} · {formatClock(story.seconds)} · {new Date(story.created).toLocaleString()}
					{story.redoneLine !== undefined && <span className="rounded-sm border px-1.5 py-0.5 text-[10px]">{t("line {n} redone", { n: story.redoneLine + 1 })}</span>}
				</p>
				<div className="flex flex-wrap gap-1.5">
					<Button variant="outline" size="sm" onClick={onEdit}>
						<PencilLine /> {t("Edit the script")}
					</Button>
					<Button variant="outline" size="sm" onClick={() => void window.kroma.saveStoryAs(story.id).then((p) => p && useEditor.getState().showToast(t("Saved"), "info", p))}>
						<Save /> {t("Save audio as…")}
					</Button>
					<Button variant="ghost" size="sm" onClick={() => void window.kroma.showStory(story.id)}>
						<FolderOpen /> {t("Show in folder")}
					</Button>
					<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
						<Trash2 /> {t("Delete")}
					</Button>
				</div>
			</div>
			<div className="rounded-lg border bg-card/50 p-4">{story.audio ? <WaveformPlayer path={story.audio} /> : <p className="text-xs text-destructive">{t("The audio file is missing.")}</p>}</div>
			<div>
				<p className="mb-2 text-[11px] text-muted-foreground">{t("Not happy with a line? Press ↻ to speak just that line again; the rest stays the same.")}</p>
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
									<span className="truncate">{speakerName(speaker)}</span>
								</span>
								<span lang="km" className="min-w-0 flex-1 text-[13px] leading-relaxed">
									{spokenText(words)}
								</span>
								<IconButton label={offline ? t("Start the voice engine to redo a line") : t("Speak line {n} again", { n: i + 1 })} disabled={busy || offline} onClick={() => onRedo(i)}>
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
