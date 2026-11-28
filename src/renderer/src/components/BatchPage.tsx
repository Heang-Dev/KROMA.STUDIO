import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, ChevronDown, ChevronRight, Circle, CircleAlert, Ellipsis, Minus, CircleCheck, Clock, ExternalLink, FileVideo, FolderOpen, ListChecks, Loader2, Play, RotateCcw, Send, Settings, Square, Trash2, X } from "lucide-react";
import { type BatchFilter, type BatchItem, type BatchOptions, type BatchStep, DEFAULT_PLATFORM_FORMAT, POST_FORMATS, type PostChoice, type PostFormat, STEP_LABEL, STEP_SHORT, type StepStatus, filterCounts, filterItems, groupByRun, nextStep, planSteps, runText, stepStatus } from "@shared/batch";
import type { DownloadCenterState } from "@shared/downloads";
import { TARGET_LANGUAGES, languageOf, languageOfVoice } from "@shared/languages";
import type { ExportQuality, KvsVoice, PlatformCaption, Project, PublishPlatform } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { PLATFORM_NAMES, openProjectAt } from "@/lib/actions";
import { addToBatch, clearFromBatch, loadBatch, postBatchItems, removeFromBatch, retryBatchFrom, retryBatchItem, setBatchOptions, showBatchItem, startBatch, stopBatch, useBatch } from "@/lib/batch";
import { PRESET_OPTIONS } from "@/lib/stylePresets";
import { formatTime } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { type Panel, useEditor } from "@/state/store";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGUAGES } from "./AIPanel";
import { EmptyState } from "@/components/empty/EmptyState";
import { Steps, type Step } from "@/components/Steps";
import { voiceChoices } from "./CharactersSection";
import { FormatPicker, ORDER, PostFields, connectedPlatforms, usePostProfile } from "./PostPanel";
import { SearchSelect } from "./SearchSelect";
import { AppSelect, Card, Group, IconButton, Row, Section, Segmented } from "./common";
import { PageHeader, PageSection } from "./PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Batch: pick several projects, run every step on them one after another (like the Download Center's queue), then
// choose per video where it's posted and in which format. Left: what to process and how. Right: the queue.

const QUALITY: { value: ExportQuality; label: string }[] = [
	{ value: "small", label: "Small" },
	{ value: "standard", label: "Standard" },
	{ value: "high", label: "High" },
];

export function BatchPage() {
	const view = useEditor((s) => s.view);
	const tab = view.name === "batch" ? (view.tab ?? "process") : "process";
	const items = useBatch((s) => s.state.items);
	useEffect(() => void loadBatch(), []);
	const ready = items.filter((i) => i.status === "done");
	const active = items.filter((i) => i.status !== "done").length;

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			<PageHeader icon={<ListChecks />} title="Batch" description="Every step on several videos, one after another — then choose where each one is posted" actions={tab === "ready" ? <ReadyActions items={ready} /> : undefined}>
				<Segmented
					label="Process or ready to post"
					size="sm"
					value={tab}
					options={[
						{ value: "process", label: `Process${active ? ` (${active})` : ""}` },
						{ value: "ready", label: `Ready to post${ready.length ? ` (${ready.length})` : ""}` },
					]}
					onChange={(t) => useEditor.getState().openBatch(t)}
				/>
			</PageHeader>
			{tab === "process" ? (
				<div className="flex min-h-0 flex-1">
					<ProcessSetup />
					<div className="flex min-w-0 flex-1 flex-col">
						<Queue />
					</div>
				</div>
			) : (
				<ReadyToPost items={ready} />
			)}
		</div>
	);
}

// ── Process: what and how ──

function ProcessSetup() {
	const options = useBatch((s) => s.state.options);
	const items = useBatch((s) => s.state.items);
	const busy = useBatch((s) => s.busy);
	const stopping = useBatch((s) => s.stopping);
	const [picking, setPicking] = useState(false);
	const [clones, setClones] = useState<KvsVoice[]>([]);
	const [hasAi, setHasAi] = useState(true);
	useEffect(() => {
		void window.kroma.kvsVoices().then(setClones).catch(() => undefined);
		void window.kroma.getSettings().then((s) => setHasAi(s.hasGeminiKey || s.hasAnthropicKey));
	}, []);
	const set = (patch: Partial<BatchOptions>) => setBatchOptions(patch);
	const lang = languageOf(options.language);
	const steps = planSteps(options);
	const toRun = items.filter((i) => i.status === "waiting" || i.status === "stopped").length;

	const addProjects = async () => {
		const paths = await window.kroma.pickBatchProjects();
		if (!paths.length) return;
		const added = addToBatch(paths);
		useEditor.getState().showToast(added ? `Added ${added} video${added === 1 ? "" : "s"}` : "Those are already in the list");
	};
	const setLanguage = (code: string) => {
		// An instant voice of the old language moves to the new language's first voice.
		const from = languageOfVoice(options.voiceId);
		set({ language: code, ...(from && from.code !== code ? { voiceId: languageOf(code).voices[0].id } : {}) });
	};

	return (
		<aside className="flex w-[420px] shrink-0 flex-col border-r bg-sidebar">
			<div className="@container min-h-0 flex-1 divide-y overflow-y-auto">
				<Section title="Videos to process" hint="Projects from the Download Center, or any project file. They run one at a time, in order.">
					<div className="grid grid-cols-2 gap-2">
						<Button variant={picking ? "secondary" : "outline"} size="sm" className="min-w-0" onClick={() => setPicking((p) => !p)}>
							<FileVideo /> Add from downloads
						</Button>
						<Button variant="outline" size="sm" className="min-w-0" onClick={() => void addProjects()}>
							<FolderOpen /> Add projects…
						</Button>
					</div>
					{picking && <FromDownloads onClose={() => setPicking(false)} />}
				</Section>

				<Section title="Steps" hint="The same for every video. Saved with each project after every step, so nothing is lost if one fails.">
					<Card>
						<StepRow label="Subtitles" hint="The site's subtitles when the video has them, else speech to text." on={options.subtitles} onChange={(subtitles) => set({ subtitles })}>
							<Field label="Spoken language">
								<AppSelect label="Spoken language" className="w-full" value={options.spokenLanguage} options={LANGUAGES} onChange={(spokenLanguage) => set({ spokenLanguage })} />
							</Field>
						</StepRow>
						<StepRow label="Translate" hint="Every line, with the translator in Settings → Translation." on={options.translate} onChange={(translate) => set({ translate })}>
							<Field label="Translate to">
								<AppSelect label="Translate to" className="w-full" value={options.language} options={TARGET_LANGUAGES.map((l) => ({ value: l.code, label: l.name, description: l.native }))} onChange={setLanguage} />
							</Field>
						</StepRow>
						<StepRow label="Find characters" hint="Who says each line, so each character can have a voice." on={options.characters} onChange={(characters) => set({ characters, ...(!characters && options.voice === "cast" ? { voice: "one" } : {}) })} />
						<StepRow label="Voice-over" hint="Reads the translated lines aloud." on={options.voice !== "off"} onChange={(on) => set({ voice: on ? (options.characters ? "cast" : "one") : "off" })}>
							<Segmented
								label="Voices"
								equalWidth
								value={options.voice === "off" ? "one" : options.voice}
								options={[
									{ value: "one", label: "One voice" },
									{ value: "cast", label: "Each character" },
								]}
								onChange={(voice) => set({ voice, ...(voice === "cast" ? { characters: true } : {}) })}
							/>
							<Field label={options.voice === "cast" ? "Voice for lines with no character" : "Voice"}>
								<SearchSelect label="Voice" value={options.voiceId} onChange={(voiceId) => set({ voiceId })} options={voiceChoices(clones, lang)} searchPlaceholder="Find a voice (king, girl, narrator…)" className="w-full" />
							</Field>
						</StepRow>
						{options.voice !== "off" && <StepRow label="Remove original voices" hint="Keeps the music and effects under the voice-over (fast)." on={options.removeVoices} onChange={(removeVoices) => set({ removeVoices })} />}
						<StepRow label="Subtitle style" hint="Off keeps each project's own style." on={options.style !== "keep"} onChange={(on) => set({ style: on ? "classic" : "keep" })}>
							<AppSelect label="Subtitle style" value={options.style === "keep" ? "classic" : options.style} options={PRESET_OPTIONS} onChange={(style) => set({ style })} />
						</StepRow>
						<StepRow label="Export" hint="Into the export folder: <playlist>/<name> (16x9).mp4" on={options.formats.length > 0} onChange={(on) => set({ formats: on ? [...POST_FORMATS] : [] })}>
							<div className="flex gap-4">
								{POST_FORMATS.map((f) => (
									<label key={f} className="flex items-center gap-2 text-xs">
										<Checkbox checked={options.formats.includes(f)} onCheckedChange={(on) => set({ formats: POST_FORMATS.filter((x) => (x === f ? on === true : options.formats.includes(x))) })} aria-label={`Export ${f}`} />
										{f} <span className="text-muted-foreground">{f === "16:9" ? "YouTube" : "TikTok, Reels"}</span>
									</label>
								))}
							</div>
							<Segmented label="Export size" equalWidth value={options.quality === "fast" ? "standard" : options.quality} options={QUALITY} onChange={(quality) => set({ quality })} />
						</StepRow>
						<StepRow label="Write post text" hint={hasAi ? "Titles, text and hashtags for each platform." : "Needs an AI key (Settings → Translation)."} on={options.writePosts} onChange={(writePosts) => set({ writePosts })} />
					</Card>
					<p className="text-xs leading-relaxed text-muted-foreground">
						{steps.length ? `${steps.length} steps: ${steps.map((s) => STEP_LABEL[s].toLowerCase()).join(" → ")}. Then it waits in Ready to post.` : "Choose at least one step."}
					</p>
				</Section>
			</div>

			<div className="shrink-0 space-y-2 border-t p-4">
				{busy === "process" ? (
					<Button className="w-full" variant="outline" disabled={stopping} onClick={stopBatch}>
						{stopping ? <Loader2 className="animate-spin" /> : <Square />} {stopping ? "Stopping…" : "Stop"}
					</Button>
				) : (
					<Button className="w-full" disabled={!toRun || !steps.length || busy !== null} onClick={startBatch}>
						<Play /> {toRun ? `Process ${toRun} video${toRun === 1 ? "" : "s"}` : "Process videos"}
					</Button>
				)}
			</div>
		</aside>
	);
}

/** A step in the Style panel's layout: its name and a line of help, the switch on the right; its options under it while on. */
function StepRow({ label, hint, on, onChange, children }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void; children?: ReactNode }) {
	return (
		<div>
			<Row label={label} description={hint} control={<Switch checked={on} onCheckedChange={onChange} aria-label={label} />} />
			{on && children && <div className="space-y-2.5 pb-3">{children}</div>}
		</div>
	);
}

/** A small label over a full-width control. */
function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="space-y-1.5">
			<p className="text-xs text-muted-foreground">{label}</p>
			{children}
		</div>
	);
}

/** The Download Center's finished projects, to tick and add. */
function FromDownloads({ onClose }: { onClose: () => void }) {
	const [center, setCenter] = useState<DownloadCenterState | null>(null);
	const [picked, setPicked] = useState<Set<string>>(new Set());
	const inBatch = useBatch((s) => s.state.items);
	useEffect(() => {
		void window.kroma.downloadState().then(setCenter);
		return window.kroma.onDownloads(setCenter);
	}, []);
	const have = useMemo(() => new Set(inBatch.map((i) => i.projectPath)), [inBatch]);
	const usable = (center?.items ?? []).filter((i) => (i.status === "done" || i.status === "skipped") && i.projectPath);
	const fresh = usable.filter((i) => !have.has(i.projectPath!));
	const set = (path: string, on: boolean) =>
		setPicked((current) => {
			const next = new Set(current);
			if (on) next.add(path);
			else next.delete(path);
			return next;
		});
	const add = () => {
		const added = addToBatch([...picked]);
		useEditor.getState().showToast(`Added ${added} video${added === 1 ? "" : "s"}`);
		setPicked(new Set());
		onClose();
	};
	return (
		<PageSection
			title="From the Download Center"
			description={center ? `${usable.length} project${usable.length === 1 ? "" : "s"} · ${picked.size} picked` : "Loading…"}
			action={
				<div className="flex gap-0.5">
					{fresh.length > 1 && (
						<>
							<Button variant="ghost" size="xs" onClick={() => setPicked(new Set(fresh.map((i) => i.projectPath!)))}>
								All
							</Button>
							<Button variant="ghost" size="xs" onClick={() => setPicked(new Set())}>
								None
							</Button>
						</>
					)}
					<IconButton label="Close" size="icon-xs" onClick={onClose}>
						<X />
					</IconButton>
				</div>
			}
		>
			{center && !usable.length ? (
				<EmptyState scene="download" compact fill={false} title="No finished downloads yet" description="Videos you download or import in the Download Center show up here once their project is made." />
			) : (
				<Card className="max-h-72 overflow-y-auto px-0">
					{usable.map((i) => {
						const added = have.has(i.projectPath!);
						return (
							<label key={i.id} className={cn("flex h-8 items-center gap-2.5 px-3", added ? "opacity-60" : "cursor-pointer hover:bg-foreground/5")} title={i.projectPath}>
								<Checkbox checked={added || picked.has(i.projectPath!)} disabled={added} onCheckedChange={(on) => set(i.projectPath!, on === true)} aria-label={i.title} />
								<span className="min-w-0 flex-1 truncate text-xs">{i.title}</span>
								{added ? <span className="shrink-0 text-[10px] text-muted-foreground">In the list</span> : <span className="max-w-28 shrink-0 truncate text-[11px] text-muted-foreground">{i.group}</span>}
							</label>
						);
					})}
				</Card>
			)}
			<Button size="sm" className={cn("w-full", center && !usable.length && "hidden")} disabled={!picked.size} onClick={add}>
				Add {picked.size || ""} to the list
			</Button>
		</PageSection>
	);
}

// ── Process: the list (every job, its steps, and its history) ──

const FILTERS: { value: BatchFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "running", label: "Running" },
	{ value: "waiting", label: "Waiting" },
	{ value: "failed", label: "Failed" },
	{ value: "ready", label: "Ready to post" },
	{ value: "posted", label: "Posted" },
];

/** The panel a step is fixed by hand in. */
const STEP_PANEL: Record<BatchStep, Panel> = { subtitles: "ai", translate: "ai", characters: "voice", removeVoices: "voice", voice: "voice", style: "style", "export-16:9": "post", "export-9:16": "post", posts: "post" };

/** Opens the project in the editor, on the panel of the step to look at. */
async function openAtStep(item: BatchItem, step: BatchStep | null): Promise<void> {
	if (!(await openProjectAt(item.projectPath))) return;
	if (step) useEditor.getState().setPanel(STEP_PANEL[step]);
}

/** "Today 15:20", "Yesterday 09:05", "Nov 20 15:20" */
function runLabel(at: number): string {
	if (!at) return "Earlier";
	const d = new Date(at);
	const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
	const day = new Date();
	day.setHours(0, 0, 0, 0);
	if (at >= day.getTime()) return `Today ${time}`;
	if (at >= day.getTime() - 86_400_000) return `Yesterday ${time}`;
	return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${time}`;
}

/** The steps a row shows: the ones chosen for its run (or that would run, before it starts), never the others. */
const chosenSteps = (item: BatchItem, planned: BatchStep[]): BatchStep[] => (item.steps.length ? item.steps : planned);

/**
 * Rows: narrow → title, status and actions on top, the steps across the full width under them; wide (the list ≥ 64rem)
 * → one line: Video | Steps | Status | actions.
 */
const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-2.5 px-4 @5xl/queue:grid-cols-[minmax(9rem,13rem)_minmax(0,1fr)_10.5rem_auto]";

/** What the list shows, with counts: the same tab group as the Style panel's choices (Segmented). */
function FilterTabs({ value, counts, onChange }: { value: BatchFilter; counts: Record<BatchFilter, number>; onChange: (v: BatchFilter) => void }) {
	return (
		<div role="radiogroup" aria-label="Show" className="flex h-control max-w-full min-w-0 items-center overflow-x-auto rounded-md border bg-background/50 p-0.5 [scrollbar-width:none]">
			{FILTERS.map((f) => {
				const active = f.value === value;
				const alert = f.value === "failed" && counts.failed > 0;
				return (
					<button
						key={f.value}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(f.value)}
						className={cn(
							"flex h-full shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
							active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:text-foreground",
							alert && !active && "text-destructive",
						)}
					>
						{f.label}
						<span className={cn("rounded-sm px-1 text-[10px] tabular-nums", active ? "bg-background/70" : "bg-muted", alert && "bg-destructive/10 text-destructive")}>{counts[f.value]}</span>
					</button>
				);
			})}
		</div>
	);
}

function Queue() {
	const items = useBatch((s) => s.state.items);
	const runs = useBatch((s) => s.state.runs);
	const options = useBatch((s) => s.state.options);
	const selected = useBatch((s) => s.selected);
	const busy = useBatch((s) => s.busy);
	const [filter, setFilter] = useState<BatchFilter>("all");
	const [search, setSearch] = useState("");
	const [closed, setClosed] = useState<Set<string>>(new Set());
	const counts = filterCounts(items);
	const shown = filterItems(items, filter, search);
	const groups = groupByRun(shown, runs);
	const open = items.find((i) => i.id === selected);
	const planned = planSteps(options);
	const failed = items.filter((i) => i.status === "failed");
	const stopped = items.some((i) => i.status === "stopped");
	const finished = items.some((i) => i.status === "done" || i.status === "failed");
	const toggle = (key: string) =>
		setClosed((c) => {
			const next = new Set(c);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	if (!items.length) {
		return (
			<EmptyState
				scene="queue"
				title="Nothing to process"
				description="Add videos on the left, choose the steps, and press Process. Each video goes through its steps, one video after another, and waits in Ready to post. Every run stays here."
			/>
		);
	}
	// Runs are numbered in the order they started, so two in the same minute never read the same.
	const runNumber = (id: string) => [...(runs ?? [])].sort((a, b) => a.at - b.at).findIndex((r) => r.id === id) + 1;
	// Every run gets its header (when it ran, and how it went); the counts per status are on the tabs.
	const headers = groups.length > 0;
	return (
		<div className="flex min-h-0 flex-1">
			<div className="@container/queue flex min-w-0 flex-1 flex-col">
				{/* One bar: what to show (with counts, like the Style panel's choices), search, and the actions. */}
				<div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5">
					<FilterTabs value={filter} counts={counts} onChange={setFilter} />
					{/* Search and actions stay together: when the bar is narrow they move under the tabs as one group. */}
					<div className="ml-auto flex min-w-0 items-center gap-2">
					<Input aria-label="Search videos" placeholder="Search videos" className="h-control w-40 min-w-0 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
					{stopped && !busy && (
						<Button variant="outline" size="sm" onClick={startBatch}>
							<Play /> Resume
						</Button>
					)}
					{failed.length > 0 && (
						<Button variant="outline" size="sm" disabled={busy === "post"} onClick={() => failed.forEach((i) => retryBatchItem(i.id))}>
							<RotateCcw /> Retry failed
						</Button>
					)}
					{finished && (
						<Button variant="ghost" size="sm" title="Removes finished and failed videos from the list (the projects and exports stay)" onClick={() => clearFromBatch("finished")}>
							Clear finished
						</Button>
					)}
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto" role="list" aria-label="Videos in Batch">
					{/* Column names, only when the columns are side by side. */}
					<div className={cn(ROW_GRID, "sticky top-0 z-10 hidden h-8 items-center border-b bg-background text-[11px] text-muted-foreground @5xl/queue:grid")} aria-hidden>
						<span>Video</span>
						<span>Steps</span>
						<span>Status</span>
						<span />
					</div>
					{!shown.length && <EmptyState compact fill={false} scene="search" title="No video matches" description="Try another word, or show All." />}
					{groups.map(({ run, items: rows }) => {
						const key = run?.id ?? "new";
						const isClosed = headers && closed.has(key);
						return (
							<section key={key} aria-label={run ? runLabel(run.at) : "Not started"}>
								{headers && (
									<button type="button" className="flex h-8 w-full min-w-0 items-center gap-1.5 border-b bg-muted/40 px-3 text-left text-xs" aria-expanded={!isClosed} onClick={() => toggle(key)}>
										{isClosed ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
										<span className="shrink-0 font-medium">{run ? `${runNumber(run.id) ? `Run ${runNumber(run.id)} · ` : ""}${runLabel(run.at)}` : "Not started"}</span>
										<span className="truncate text-muted-foreground tabular-nums">· {runText(rows)}</span>
									</button>
								)}
								{!isClosed && rows.map((item) => <QueueRow key={item.id} item={item} selected={item.id === selected} steps={chosenSteps(item, planned)} />)}
							</section>
						);
					})}
				</div>
			</div>
			<Details item={open} />
		</div>
	);
}

function StatusIcon({ status }: { status: BatchItem["status"] }) {
	const icon = {
		waiting: <Clock className="text-muted-foreground" />,
		running: <Loader2 className="animate-spin text-primary" />,
		done: <CircleCheck className="text-success" />,
		failed: <CircleAlert className="text-destructive" />,
		stopped: <Ban className="text-muted-foreground" />,
	}[status];
	return <span className="flex size-3.5 shrink-0 items-center justify-center [&_svg]:size-3.5">{icon}</span>;
}

const STEP_STATUS_TEXT: Record<StepStatus, string> = { done: "done", running: "running", failed: "failed", waiting: "waiting", skipped: "not chosen" };

function StepIcon({ status }: { status: StepStatus }) {
	return {
		done: <Check className="size-3 text-success" strokeWidth={3} />,
		running: <Loader2 className="size-3 animate-spin text-primary" />,
		failed: <X className="size-3 text-destructive" strokeWidth={3} />,
		waiting: <Circle className="size-2.5 text-muted-foreground" />,
		skipped: <Minus className="size-3 text-muted-foreground/40" />,
	}[status];
}

/** A video's chosen steps for the shared step track: ✓ done, spinner running, ✗ failed (click: run again from there). */
/** Names short enough that a row's whole track fits on one line (the full names are in the hover text). */
const ROW_LABEL: Record<BatchStep, string> = {
	subtitles: "Subtitles",
	translate: "Translate",
	characters: "Cast",
	removeVoices: "Clean",
	voice: "Voice",
	style: "Style",
	"export-16:9": "16:9",
	"export-9:16": "9:16",
	posts: "Text",
};

function trackSteps(item: BatchItem, steps: BatchStep[], describe = false, fullNames = describe): Step[] {
	const next = nextStep({ steps, done: item.done });
	return steps.map((step) => {
		const status = stepStatus(item, step, steps);
		const entry = item.log?.[step];
		const time = entry?.end && entry.start ? took(entry.end - entry.start) : "";
		const why = status === "failed" ? (item.error ?? entry?.message) : entry?.message;
		const tip = `${STEP_SHORT[step]}: ${STEP_STATUS_TEXT[status]}${time ? ` · ${time}` : ""}${why ? `\n${why.replace(/^\/Users\/[^/]+/, "~")}` : ""}${status === "failed" ? "\nClick to run it again from this step." : ""}`;
		// A stopped video's next step is where it carries on: ringed like the current one.
		const shown: Step["status"] = status === "waiting" && item.status === "stopped" && step === next ? "current" : status === "skipped" ? "waiting" : status;
		return {
			key: step,
			label: fullNames ? STEP_SHORT[step] : ROW_LABEL[step],
			status: shown,
			title: tip,
			description: describe ? (status === "done" ? time || "done" : status === "running" ? "running…" : status === "failed" ? "failed" : "waiting") : undefined,
			onClick: status === "failed" ? () => retryBatchFrom(item.id, step) : undefined,
		};
	});
}

/** When the video started and how long its steps took (so far). */
function timing(item: BatchItem): { took: number; at: number } | null {
	const logs = Object.values(item.log ?? {});
	if (!logs.length) return null;
	const start = Math.min(...logs.map((l) => l!.start));
	const end = item.status === "running" ? Date.now() : Math.max(...logs.map((l) => l!.end ?? l!.start));
	return { took: end - start, at: start };
}

function QueueRow({ item, selected, steps }: { item: BatchItem; selected: boolean; steps: BatchStep[] }) {
	const busy = useBatch((s) => s.busy);
	const task = useEditor((s) => (item.status === "running" ? Object.values(s.tasks).filter((t) => t.status === "running").pop() : undefined));
	const [, tick] = useState(0);
	useEffect(() => {
		if (item.status !== "running") return;
		const timer = setInterval(() => tick((n) => n + 1), 1000);
		return () => clearInterval(timer);
	}, [item.status]);
	const at = item.status === "failed" || item.status === "stopped" ? nextStep(item) : null;
	const pct = task && task.progress >= 0 ? ` ${Math.round(task.progress * 100)}%` : "";
	const status = {
		waiting: item.done.length ? "Waiting · resumes" : "Waiting",
		running: `${item.current ? STEP_LABEL[item.current] : "Running"}${pct}`,
		failed: `Failed at ${at ? STEP_SHORT[at] : "opening"}`,
		stopped: `Stopped${at ? ` at ${STEP_SHORT[at]}` : ""}`,
		done: item.posted ? "Posted" : "Ready to post",
	}[item.status];
	const t = timing(item);
	const exports = POST_FORMATS.filter((f) => item.exports?.[f]);
	return (
		<div
			role="listitem"
			className={cn(ROW_GRID, "cursor-pointer items-start border-b py-3 hover:bg-foreground/[0.03]", selected && "bg-accent/60 hover:bg-accent/60")}
			onClick={() => showBatchItem(selected ? null : item.id)}
			aria-selected={selected}
		>
			<div className="min-w-0">
				<p className="truncate text-[13px] font-medium" title={item.title}>
					{item.title}
				</p>
				<p className="truncate text-[11px] text-muted-foreground" title={item.projectPath}>
					{item.group}
				</p>
			</div>
			<div className="col-span-3 row-start-2 min-w-0 @5xl/queue:col-span-1 @5xl/queue:col-start-2 @5xl/queue:row-start-1">
				<Steps variant="stacked" size="sm" className="-mx-2" steps={trackSteps(item, steps, true, false)} />
			</div>
			<div className="max-w-44 min-w-0 @5xl/queue:max-w-none" title={item.status === "failed" ? item.error : undefined}>
				<span className={cn("flex min-w-0 items-center gap-1.5 text-xs", item.status === "failed" && "text-destructive", item.status === "done" && "text-success", item.status === "running" && "text-primary", (item.status === "waiting" || item.status === "stopped") && "text-muted-foreground")}>
					<StatusIcon status={item.status} />
					<span className="truncate">{status}</span>
				</span>
				<p className="mt-0.5 flex min-w-0 items-center gap-1.5 pl-5 text-[11px] text-muted-foreground tabular-nums">
					<span className="truncate">{t ? `${took(t.took)} · ${new Date(t.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : "Not started"}</span>
					{item.status === "failed" && (
						<button type="button" className="shrink-0 text-destructive underline-offset-2 hover:underline" onClick={(e) => { e.stopPropagation(); showBatchItem(item.id); }}>
							See why
						</button>
					)}
				</p>
			</div>
			<div onClick={(e) => e.stopPropagation()}>
					<div className="flex items-center justify-end gap-0.5">
						{item.status === "failed" && (
							<IconButton label={at ? `Retry from ${STEP_SHORT[at]}` : "Retry"} size="icon-xs" disabled={busy === "post"} onClick={() => (at ? retryBatchFrom(item.id, at) : retryBatchItem(item.id))}>
								<RotateCcw />
							</IconButton>
						)}
						<IconButton label={busy ? "Open project (after the batch)" : at ? `Open project at ${STEP_SHORT[at]}` : "Open project"} size="icon-xs" disabled={Boolean(busy)} onClick={() => void openAtStep(item, at)}>
							<FileVideo />
						</IconButton>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon-xs" aria-label={`More for ${item.title}`}>
									<Ellipsis />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								{exports.map((f) => (
									<DropdownMenuItem key={f} onClick={() => void window.kroma.showInFolder(item.exports![f]!)}>
										<FolderOpen /> Show {f} export in Finder
									</DropdownMenuItem>
								))}
								{!exports.length && <DropdownMenuItem disabled>No exports yet</DropdownMenuItem>}
								<DropdownMenuItem onClick={() => showBatchItem(item.id)}>
									<ListChecks /> Step details
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem variant="destructive" disabled={item.status === "running"} onClick={() => removeFromBatch(item.id)}>
									<Trash2 /> Remove from the list
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
			</div>
		</div>
	);
}

const clock = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const took = (ms: number) => (ms < 1000 ? "<1 s" : ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`);

/** One video's history, in a sheet from the right: every step top to bottom with its time, message and fixes. */
function Details({ item }: { item: BatchItem | undefined }) {
	return (
		<Sheet open={Boolean(item)} onOpenChange={(open) => !open && showBatchItem(null)}>
			<SheetContent aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>{item && <DetailsBody item={item} />}</SheetContent>
		</Sheet>
	);
}

function DetailsBody({ item }: { item: BatchItem }) {
	const options = useBatch((s) => s.state.options);
	const busy = useBatch((s) => s.busy);
	const planned = planSteps(options);
	const chosen = chosenSteps(item, planned);
	const now = Date.now();
	const steps: Step[] = trackSteps(item, chosen, false, true).map((track, i) => {
		const step = chosen[i];
		const status = stepStatus(item, step, planned);
		const entry = item.log?.[step];
		const message = status === "failed" ? (item.error ?? entry?.message) : entry?.message;
		// Only a step that ran can run again (a failed one has its own buttons; one still to come just waits).
		const canRerun = status === "done" && item.status !== "running";
		return {
			...track,
			onClick: undefined,
			meta: (
				<>
					{entry?.start ? `${clock(entry.start)}${entry.end ? ` · ${took(entry.end - entry.start)}` : status === "running" ? ` · ${took(now - entry.start)}` : ""}` : STEP_STATUS_TEXT[status]}
					{canRerun && (
						<IconButton label={`Run again from ${STEP_SHORT[step]}`} size="icon-xs" disabled={Boolean(busy)} onClick={() => retryBatchFrom(item.id, step)}>
							<RotateCcw />
						</IconButton>
					)}
				</>
			),
			children:
				message || status === "failed" ? (
					<>
						{message && (
							<p className={cn("text-[11px] leading-snug break-words", status === "failed" ? "rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-destructive" : "text-muted-foreground")}>
								{message.replace(/^\/Users\/[^/]+/, "~")}
							</p>
						)}
						{status === "failed" && (
							<div className="flex flex-wrap gap-1.5">
								<Button variant="outline" size="xs" disabled={Boolean(busy)} onClick={() => retryBatchFrom(item.id, step)}>
									<RotateCcw /> Retry from here
								</Button>
								<Button variant="outline" size="xs" disabled={Boolean(busy)} onClick={() => void openAtStep(item, step)}>
									<FileVideo /> Fix by hand
								</Button>
							</div>
						)}
					</>
				) : undefined,
		};
	});
	return (
		<>
			<SheetHeader>
				<SheetTitle className="flex min-w-0 items-center gap-2">
					<StatusIcon status={item.status} />
					<span className="truncate" title={item.title}>
						{item.title}
					</span>
				</SheetTitle>
				<p className="truncate text-[11px] text-muted-foreground" title={item.projectPath}>
					{item.projectPath.replace(/^\/Users\/[^/]+/, "~")}
				</p>
				<p className="text-[11px] text-muted-foreground">
					Added {new Date(item.added).toLocaleString()}
					{item.duration ? ` · ${formatTime(item.duration)}` : ""}
				</p>
			</SheetHeader>
			<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
				<Group title="Steps">
					<Steps variant="vertical" size="sm" steps={steps} />
				</Group>
				{item.exports && Object.keys(item.exports).length > 0 && (
					<Group title="Exports">
						<Card className="px-0">
							{POST_FORMATS.filter((f) => item.exports?.[f]).map((f) => (
								<div key={f} className="flex items-center gap-2 px-3 py-2">
									<span className="shrink-0 rounded-sm border px-1 text-[10px]">{f}</span>
									<span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={item.exports![f]}>
										{item.exports![f]!.split(/[\\/]/).pop()}
									</span>
									<IconButton label="Show in Finder" size="icon-xs" onClick={() => void window.kroma.showInFolder(item.exports![f]!)}>
										<FolderOpen />
									</IconButton>
								</div>
							))}
						</Card>
					</Group>
				)}
				{item.posted && (
					<Group title={`Posted · ${new Date(item.posted.at).toLocaleString()}`}>
						<Card className="px-0">
							<PostedLine results={item.posted.results} />
						</Card>
					</Group>
				)}
			</div>
			{item.status === "done" && (
				<div className="shrink-0 border-t px-5 py-3">
					<Button size="sm" className="w-full" onClick={() => useEditor.getState().openBatch("ready")}>
						<Send /> Go to Ready to post
					</Button>
				</div>
			)}
		</>
	);
}

// ── Ready to post ──

type Choice = Pick<PostChoice, "platforms" | "formats">;

/** Choices and selection are shared by the cards and the header's "Post selected". */
const useReady = (() => {
	let listeners: (() => void)[] = [];
	const store = { choices: {} as Record<string, Choice>, selected: new Set<string>(), privacy: "public" as PostChoice["youtubePrivacy"], tiktokMode: "post" as PostChoice["tiktokMode"] };
	const emit = () => listeners.forEach((l) => l());
	return {
		store,
		set(fn: (s: typeof store) => void) {
			fn(store);
			emit();
		},
		use() {
			const [, tick] = useState(0);
			useEffect(() => {
				const l = () => tick((n) => n + 1);
				listeners.push(l);
				return () => {
					listeners = listeners.filter((x) => x !== l);
				};
			}, []);
			return store;
		},
	};
})();

const choiceFor = (id: string, connected: PublishPlatform[]): Choice => useReady.store.choices[id] ?? { platforms: connected, formats: { ...DEFAULT_PLATFORM_FORMAT } };

function ReadyActions({ items }: { items: BatchItem[] }) {
	const ready = useReady.use();
	const busy = useBatch((s) => s.busy);
	const { profile } = usePostProfile();
	const connected = connectedPlatforms(profile);
	const selected = items.filter((i) => ready.selected.has(i.id));
	const postable = selected.filter((i) => choiceFor(i.id, connected).platforms.length);
	return (
		<>
			{items.some((i) => i.posted) && (
				<Button variant="outline" size="sm" onClick={() => clearFromBatch("posted")}>
					Clear posted
				</Button>
			)}
			<Button
				size="sm"
				disabled={!postable.length || busy !== null || !profile}
				onClick={() => void postBatchItems(postable.map((i) => ({ id: i.id, choice: { ...choiceFor(i.id, connected), youtubePrivacy: ready.privacy, tiktokMode: ready.tiktokMode } })))}
			>
				{busy === "post" ? <Loader2 className="animate-spin" /> : <Send />} Post selected{postable.length ? ` (${postable.length})` : ""}
			</Button>
		</>
	);
}

function ReadyToPost({ items }: { items: BatchItem[] }) {
	const ready = useReady.use();
	const { hasKey, profile } = usePostProfile();
	const connected = connectedPlatforms(profile);
	if (!items.length) {
		return (
			<EmptyState
				scene="video"
				title="Nothing ready yet"
				description="Processed videos wait here. Check each one, choose where it goes and in which format, then post."
				action={
					<Button variant="outline" size="sm" onClick={() => useEditor.getState().openBatch("process")}>
						<ListChecks /> Go to Process
					</Button>
				}
			/>
		);
	}
	const allOn = items.every((i) => ready.selected.has(i.id));
	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<div className="mx-auto w-full max-w-[1100px] space-y-4 px-6 py-5">
				{hasKey === false ? (
					<div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-xs">
						<span className="min-w-0 flex-1">Connect YouTube, Facebook and TikTok once to post from here.</span>
						<Button size="sm" onClick={() => useEditor.getState().openSettings("posting")}>
							<Settings /> Connect in Settings → Posting
						</Button>
					</div>
				) : (
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card/50 px-3.5 py-2.5">
						<label className="flex items-center gap-2 text-xs">
							<Checkbox checked={allOn} onCheckedChange={(on) => useReady.set((s) => (s.selected = new Set(on === true ? items.map((i) => i.id) : [])))} aria-label="Select all" /> All {items.length}
						</label>
						<span className="flex items-center gap-2 text-xs text-muted-foreground">
							YouTube
							<Segmented
								label="YouTube visibility"
								size="sm"
								value={ready.privacy}
								options={[
									{ value: "public", label: "Public" },
									{ value: "unlisted", label: "Unlisted" },
									{ value: "private", label: "Private" },
								]}
								onChange={(v) => useReady.set((s) => (s.privacy = v))}
							/>
						</span>
						<span className="flex items-center gap-2 text-xs text-muted-foreground">
							TikTok
							<Segmented
								label="TikTok"
								size="sm"
								value={ready.tiktokMode}
								options={[
									{ value: "post", label: "Post now" },
									{ value: "draft", label: "To drafts" },
								]}
								onChange={(v) => useReady.set((s) => (s.tiktokMode = v))}
							/>
						</span>
					</div>
				)}
				{items.map((item) => (
					<ReadyCard key={item.id} item={item} connected={connected} accounts={profile?.accounts ?? null} hasKey={hasKey} />
				))}
			</div>
		</div>
	);
}

function ReadyCard({ item, connected, accounts, hasKey }: { item: BatchItem; connected: PublishPlatform[]; accounts: Record<string, { name: string; needsReconnect?: boolean } | undefined> | null; hasKey: boolean | null }) {
	const ready = useReady.use();
	const busy = useBatch((s) => s.busy);
	const [open, setOpen] = useState(false);
	const choice = choiceFor(item.id, connected);
	const setChoice = (fn: (c: Choice) => Choice) => useReady.set((s) => (s.choices[item.id] = fn(choiceFor(item.id, connected))));
	const exported = POST_FORMATS.filter((f) => item.exports?.[f]);
	const missing = POST_FORMATS.filter((f) => choice.platforms.some((p) => choice.formats[p] === f) && !item.exports?.[f]);
	const post = () => void postBatchItems([{ id: item.id, choice: { ...choice, youtubePrivacy: ready.privacy, tiktokMode: ready.tiktokMode } }]);

	return (
		<div className="overflow-hidden rounded-lg border bg-card/50">
			<div className="flex items-center gap-3 px-3.5 py-2.5">
				<Checkbox checked={ready.selected.has(item.id)} onCheckedChange={(on) => useReady.set((s) => (on === true ? s.selected.add(item.id) : s.selected.delete(item.id)))} aria-label={`Select ${item.title}`} />
				<span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background/50 text-muted-foreground [&_svg]:size-4">
					<FileVideo />
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[13px] font-medium" title={item.projectPath}>
						{item.title}
					</p>
					<p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground tabular-nums">
						{item.duration ? formatTime(item.duration) : ""}
						{exported.map((f) => (
							<button key={f} type="button" className="rounded-sm border px-1 text-[10px] hover:bg-foreground/5" title={`Show the ${f} export`} onClick={() => void window.kroma.showInFolder(item.exports![f]!)}>
								{f}
							</button>
						))}
						{!exported.length && "Not exported yet"}
						{item.posted && <span className="text-success">· Posted {new Date(item.posted.at).toLocaleDateString()}</span>}
					</p>
				</div>
				<Button variant="ghost" size="xs" title="Every step this video went through" onClick={() => showBatchItem(item.id)}>
					<ListChecks /> Steps
				</Button>
				<IconButton label={busy ? "Open project (after the batch)" : "Open project"} size="icon-xs" disabled={Boolean(busy)} onClick={() => void openProjectAt(item.projectPath)}>
					<FileVideo />
				</IconButton>
				<IconButton label="Remove from the list (the project and exports stay)" size="icon-xs" onClick={() => removeFromBatch(item.id)}>
					<Trash2 />
				</IconButton>
				<Button size="sm" disabled={!choice.platforms.length || busy !== null || hasKey !== true} onClick={post}>
					<Send /> {item.posted ? "Post again" : "Post"}
				</Button>
			</div>
			<div className="grid grid-cols-1 border-t md:grid-cols-3 md:divide-x">
				{ORDER.map(({ id }) => {
					const account = accounts?.[id];
					const on = choice.platforms.includes(id);
					return (
						<div key={id} className={cn("flex items-center gap-2.5 px-3.5 py-2", !account && "opacity-60")}>
							<Checkbox
								id={`${item.id}-${id}`}
								checked={on}
								disabled={!account || account.needsReconnect}
								onCheckedChange={(v) => setChoice((c) => ({ ...c, platforms: v === true ? ORDER.map((o) => o.id).filter((p) => p === id || c.platforms.includes(p)) : c.platforms.filter((p) => p !== id) }))}
							/>
							<label htmlFor={`${item.id}-${id}`} className="min-w-0 flex-1">
								<span className="block truncate text-xs font-medium">{PLATFORM_NAMES[id]}</span>
								<span className="block truncate text-[11px] text-muted-foreground">{account ? (account.needsReconnect ? "Sign-in expired" : account.name) : hasKey === false ? "Not set up" : accounts ? "Not connected" : "Checking…"}</span>
							</label>
							<FormatPicker platform={id} value={choice.formats[id]} onChange={(f: PostFormat) => setChoice((c) => ({ ...c, formats: { ...c.formats, [id]: f } }))} />
						</div>
					);
				})}
			</div>
			{missing.length > 0 && choice.platforms.length > 0 && <p className="border-t px-3.5 py-1.5 text-[11px] text-muted-foreground">{missing.join(" and ")} isn't exported yet: it's exported when you post.</p>}
			{item.posted && <PostedLine results={item.posted.results} />}
			<button type="button" className="flex w-full items-center gap-1.5 border-t px-3.5 py-2 text-left text-xs text-muted-foreground hover:bg-foreground/5" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
				{open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} Post text
			</button>
			{open && <PostTexts path={item.projectPath} platforms={choice.platforms} />}
		</div>
	);
}

function PostedLine({ results }: { results: NonNullable<BatchItem["posted"]>["results"] }) {
	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3.5 py-1.5 text-[11px]">
			{results.map((r) => (
				<span key={r.platform} className="flex items-center gap-1.5">
					{r.state === "done" ? <Check className="size-3 text-success" /> : r.state === "failed" ? <CircleAlert className="size-3 text-destructive" /> : <Loader2 className="size-3 text-muted-foreground" />}
					{PLATFORM_NAMES[r.platform]}
					{r.state === "failed" && <span className="max-w-60 truncate text-destructive" title={r.message}>{r.message}</span>}
					{r.url && (
						<Button variant="ghost" size="xs" onClick={() => void window.kroma.openExternal(r.url!)}>
							<ExternalLink /> Open
						</Button>
					)}
				</span>
			))}
		</div>
	);
}

/** The project's written posts, editable; saved to the project file a moment after each change. */
function PostTexts({ path, platforms }: { path: string; platforms: PublishPlatform[] }) {
	const [project, setProject] = useState<Project | null>(null);
	const [error, setError] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => {
		void window.kroma
			.readProject(path)
			.then(setProject)
			.catch(() => setError(true));
		return () => clearTimeout(timer.current);
	}, [path]);
	if (error) return <p className="border-t px-3.5 py-2 text-xs text-destructive">The project file was moved or deleted.</p>;
	if (!project) return <p className="border-t px-3.5 py-2 text-xs text-muted-foreground">Loading…</p>;
	const posts = project.posts ?? [];
	if (!posts.length) return <EmptyState scene="chat" compact fill={false} className="border-t" title="No posts written yet" description={'They\'re written when you post, or turn on "Write post text" in the steps.'} />;
	const shown = ORDER.filter((o) => platforms.includes(o.id)).map((o) => posts.find((p) => p.platform === o.caption)).filter((p): p is PlatformCaption => Boolean(p));
	const change = (platform: PlatformCaption["platform"], patch: Partial<PlatformCaption>) => {
		const next = { ...project, posts: posts.map((p) => (p.platform === platform ? { ...p, ...patch } : p)) };
		setProject(next);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => void window.kroma.saveProject(next, path), 600);
	};
	return (
		<div className="grid grid-cols-1 gap-2 border-t p-3 md:grid-cols-3">
			{shown.length ? shown.map((post) => <PostFields key={post.platform} post={post} onChange={(patch) => change(post.platform, patch)} />) : <p className="text-xs text-muted-foreground">Tick a platform to see its post.</p>}
		</div>
	);
}
