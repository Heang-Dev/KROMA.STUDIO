// Batch: several projects go through the same steps (subtitles → translation → characters → voice-over → style →
// export → posts) one after another, and stop before posting. The pure rules live here (which steps run, which one
// comes next, file names, the per-platform formats); the renderer runs the steps (src/renderer/src/lib/batch.ts) and
// the main process keeps the list in <library>/batch.json (src/main/batch.ts).

import type { Aspect, ExportQuality, PlatformCaption, Project, PublishPlatform, PublishRequest } from "./types";

/** The formats a batch exports and a platform can be posted in. */
export type PostFormat = "16:9" | "9:16";
export const POST_FORMATS: PostFormat[] = ["16:9", "9:16"];

/** The format each platform gets unless you choose another: YouTube wide, Facebook (Reels) and TikTok tall. */
export const DEFAULT_PLATFORM_FORMAT: Record<PublishPlatform, PostFormat> = { youtube: "16:9", facebook: "9:16", tiktok: "9:16" };

/** The subtitle style presets (their looks are in the renderer's stylePresets). */
export const STYLE_PRESETS = [
	// Outlined
	"classic", "yellow", "tiktok", "minimal", "shadow", "cinema", "neon", "pink", "lime", "orange",
	// Glow
	"goldGlow", "fire", "ice", "magic",
	// Khmer fonts
	"koulen", "poster", "moulGold", "moulRed", "comic", "battambang", "serif", "rounded", "handwritten", "karaoke",
	// On a box
	"box", "softBox", "whiteBox", "highlight", "violetBox", "redBox", "news", "blueBox", "greenBox",
] as const;
export type StylePreset = (typeof STYLE_PRESETS)[number];

export interface BatchOptions {
	/** The site's subtitles when the video has them, else cloud speech to text. */
	subtitles: boolean;
	/** What is spoken in the videos (for speech to text): "zh", "en", … or "auto". */
	spokenLanguage: string;
	translate: boolean;
	/** The language to translate into (shared/languages). */
	language: string;
	characters: boolean;
	/** No voice-over, one voice for every line, or each character's own voice (needs `characters`). */
	voice: "off" | "one" | "cast";
	/** The voice for "one" (and lines with no character). */
	voiceId: string;
	/** Remove the original voices (fast separation); only with a voice-over. */
	removeVoices: boolean;
	/** A preset, one of my styles ("my:<id>"), or keep each project's own. */
	style: StylePreset | `my:${string}` | "keep";
	/** Blur the video's own burned-in subtitles (found in its frames). Missing in older saved options: off. */
	hideSubtitles?: boolean;
	formats: PostFormat[];
	/** Make each episode's cover (with its number) in the export formats. Missing in older saved options: off. */
	covers?: boolean;
	quality: ExportQuality;
	writePosts: boolean;
}

export const DEFAULT_BATCH_OPTIONS: BatchOptions = {
	subtitles: true,
	spokenLanguage: "zh",
	translate: true,
	language: "km",
	characters: false,
	voice: "off",
	voiceId: "km-KH-SreymomNeural",
	removeVoices: true,
	style: "keep",
	hideSubtitles: false,
	formats: ["16:9", "9:16"],
	covers: false,
	quality: "standard",
	writePosts: true,
};

export type BatchStep = "subtitles" | "translate" | "characters" | "removeVoices" | "voice" | "hideSubtitles" | "style" | "export-16:9" | "export-9:16" | "covers" | "posts";

export const STEP_LABEL: Record<BatchStep, string> = {
	subtitles: "Getting subtitles",
	translate: "Translating",
	characters: "Finding characters",
	removeVoices: "Removing the original voices",
	voice: "Making the voice-over",
	hideSubtitles: "Hiding the original subtitles",
	style: "Styling the subtitles",
	"export-16:9": "Exporting 16:9",
	"export-9:16": "Exporting 9:16",
	covers: "Making the covers",
	posts: "Writing the posts",
};

/** What a failed step's notice says went wrong ("EP4: translation failed"). */
export const STEP_NOUN: Record<BatchStep, string> = {
	subtitles: "subtitles",
	translate: "translation",
	characters: "finding characters",
	removeVoices: "removing voices",
	voice: "voice-over",
	hideSubtitles: "hiding the original subtitles",
	style: "style",
	"export-16:9": "16:9 export",
	"export-9:16": "9:16 export",
	covers: "covers",
	posts: "writing posts",
};

export const exportStep = (format: PostFormat): BatchStep => `export-${format}` as BatchStep;
export const stepFormat = (step: BatchStep): PostFormat | null => (step.startsWith("export-") ? (step.slice(7) as PostFormat) : null);

/** The steps these options run, in order. Removing voices comes before the voice-over, so the voice-over never re-does it. */
export function planSteps(o: BatchOptions): BatchStep[] {
	const voice = o.voice === "cast" && !o.characters ? "one" : o.voice;
	const steps: BatchStep[] = [];
	if (o.subtitles) steps.push("subtitles");
	if (o.translate) steps.push("translate");
	if (o.characters) steps.push("characters");
	if (voice !== "off" && o.removeVoices) steps.push("removeVoices");
	if (voice !== "off") steps.push("voice");
	if (o.hideSubtitles) steps.push("hideSubtitles");
	if (o.style !== "keep") steps.push("style");
	for (const f of POST_FORMATS) if (o.formats.includes(f)) steps.push(exportStep(f));
	if (o.covers) steps.push("covers");
	if (o.writePosts) steps.push("posts");
	return steps;
}

export type BatchStatus = "waiting" | "running" | "done" | "failed" | "stopped";

/** Every step a batch can run, in the order it runs them (the checklist on each row). */
export const ALL_STEPS: BatchStep[] = ["subtitles", "translate", "characters", "removeVoices", "voice", "hideSubtitles", "style", "export-16:9", "export-9:16", "covers", "posts"];

/** Short names for the checklist chips. */
export const STEP_SHORT: Record<BatchStep, string> = {
	subtitles: "Subtitles",
	translate: "Translate",
	characters: "Characters",
	removeVoices: "Remove voices",
	voice: "Voice-over",
	hideSubtitles: "Hide subtitles",
	style: "Style",
	"export-16:9": "Export 16:9",
	"export-9:16": "Export 9:16",
	covers: "Covers",
	posts: "Post text",
};

/** What happened in one step: when it ran, how it ended, and what it said (lines translated, the file, the error). */
export interface StepLog {
	status: "running" | "done" | "failed";
	start: number;
	end?: number;
	message?: string;
}

/** One press of Process: the rows are grouped by run, newest first. */
export interface BatchRun {
	id: string;
	at: number;
}

export interface BatchItem {
	id: string;
	/** The project file (.kroma). */
	projectPath: string;
	title: string;
	/** The folder it's in (the playlist), for the export folder. */
	group: string;
	status: BatchStatus;
	/** Planned when it starts (and kept for a retry). */
	steps: BatchStep[];
	/** Steps finished, in order. */
	done: BatchStep[];
	current?: BatchStep;
	error?: string;
	/** Exported files by format. */
	exports?: Partial<Record<PostFormat, string>>;
	duration?: number;
	/** The run it was processed in (none until it starts). */
	runId?: string;
	/** Per step: times, outcome, message. */
	log?: Partial<Record<BatchStep, StepLog>>;
	/** Set when posted from "Ready to post". */
	posted?: { at: number; results: { platform: PublishPlatform; state: "working" | "done" | "failed"; url?: string; message?: string }[] };
	added: number;
}

export interface BatchState {
	items: BatchItem[];
	options: BatchOptions;
	/** Newest last. */
	runs?: BatchRun[];
}

export const EMPTY_BATCH: BatchState = { items: [], options: DEFAULT_BATCH_OPTIONS, runs: [] };

export type StepStatus = "done" | "running" | "failed" | "waiting" | "skipped";

/**
 * A step's state on a row. `planned` is what would run for a project that hasn't started (its own plan once it has).
 */
export function stepStatus(item: BatchItem, step: BatchStep, planned: BatchStep[] = item.steps): StepStatus {
	const steps = item.steps.length ? item.steps : planned;
	if (!steps.includes(step)) return "skipped";
	if (item.done.includes(step)) return "done";
	const next = nextStep({ steps, done: item.done });
	if (item.status === "running" && (item.current ?? next) === step) return "running";
	if (item.status === "failed" && next === step) return "failed";
	return "waiting";
}

/** Runs the project again from this step: it and every later step go back to waiting (their log too). */
export function retryFrom(item: BatchItem, step: BatchStep): BatchItem {
	const at = item.steps.indexOf(step);
	if (at < 0) return retryItem(item);
	const later = new Set(item.steps.slice(at));
	const log = Object.fromEntries(Object.entries(item.log ?? {}).filter(([s]) => !later.has(s as BatchStep)));
	return { ...retryItem(item), done: item.done.filter((s) => !later.has(s)), log, ...(item.status === "done" ? { posted: item.posted } : {}) };
}

export type BatchFilter = "all" | "running" | "waiting" | "failed" | "ready" | "posted";

/** Which filter a row belongs to (besides All). */
export function filterOf(item: BatchItem): Exclude<BatchFilter, "all"> {
	if (item.status === "running") return "running";
	if (item.status === "failed") return "failed";
	if (item.status === "done") return item.posted ? "posted" : "ready";
	return "waiting";
}

export function filterCounts(items: BatchItem[]): Record<BatchFilter, number> {
	const counts: Record<BatchFilter, number> = { all: items.length, running: 0, waiting: 0, failed: 0, ready: 0, posted: 0 };
	for (const i of items) counts[filterOf(i)] += 1;
	return counts;
}

/** Rows that pass the filter and the search (every word, in the title). */
export function filterItems(items: BatchItem[], filter: BatchFilter, search: string): BatchItem[] {
	const words = search.toLowerCase().split(/\s+/).filter(Boolean);
	return items.filter((i) => (filter === "all" || filterOf(i) === filter) && words.every((w) => i.title.toLowerCase().includes(w)));
}

/** Rows grouped by run, newest run first; projects not started yet come first, as "Not started". */
export function groupByRun(items: BatchItem[], runs: BatchRun[] = []): { run: BatchRun | null; items: BatchItem[] }[] {
	const groups: { run: BatchRun | null; items: BatchItem[] }[] = [];
	const fresh = items.filter((i) => !i.runId);
	if (fresh.length) groups.push({ run: null, items: fresh });
	for (const run of [...runs].sort((a, b) => b.at - a.at)) {
		const inRun = items.filter((i) => i.runId === run.id);
		if (inRun.length) groups.push({ run, items: inRun });
	}
	// Rows whose run was forgotten.
	const known = new Set(runs.map((r) => r.id));
	const lost = items.filter((i) => i.runId && !known.has(i.runId));
	if (lost.length) groups.push({ run: { id: "earlier", at: 0 }, items: lost });
	return groups;
}

/** "5 videos · 4 ready · 1 failed" */
export function runText(items: BatchItem[]): string {
	const c = filterCounts(items);
	return [`${items.length} video${items.length === 1 ? "" : "s"}`, c.running ? `${c.running} running` : "", c.waiting ? `${c.waiting} waiting` : "", c.ready + c.posted ? `${c.ready + c.posted} ready` : "", c.posted ? `${c.posted} posted` : "", c.failed ? `${c.failed} failed` : ""].filter(Boolean).join(" · ");
}

/** History kept: the last 20 runs and 500 projects. Finished projects of older runs go first; unfinished ones stay. */
export function pruneHistory(state: BatchState, maxRuns = 20, maxItems = 500): BatchState {
	const runs = [...(state.runs ?? [])].sort((a, b) => a.at - b.at);
	const dropped = new Set(runs.slice(0, Math.max(0, runs.length - maxRuns)).map((r) => r.id));
	const finished = (i: BatchItem) => i.status === "done" || i.status === "failed";
	let items = state.items.filter((i) => !(i.runId && dropped.has(i.runId) && finished(i)));
	let extra = items.length - maxItems;
	if (extra > 0) items = items.filter((i) => !(finished(i) && extra-- > 0));
	const used = new Set(items.map((i) => i.runId));
	return { ...state, items, runs: runs.filter((r) => !dropped.has(r.id) || used.has(r.id)) };
}

/** The step to run next: the first planned one not done yet (null when all are done). */
export function nextStep(item: Pick<BatchItem, "steps" | "done">): BatchStep | null {
	return item.steps.find((s) => !item.done.includes(s)) ?? null;
}

/** "3/7 · Translating" */
export function stepText(item: BatchItem): string {
	const step = item.current ?? nextStep(item);
	if (!step) return `${item.steps.length}/${item.steps.length}`;
	return `${item.steps.indexOf(step) + 1}/${item.steps.length} · ${STEP_LABEL[step]}`;
}

/** One project at a time: the next one to run is the first waiting one, and none while another is running. */
export function nextToRun(items: BatchItem[]): BatchItem | null {
	if (items.some((i) => i.status === "running")) return null;
	return items.find((i) => i.status === "waiting") ?? null;
}

/** Retry: carries on from the step that failed (the steps before it stay done). */
export function retryItem(item: BatchItem): BatchItem {
	return { ...item, status: "waiting", error: undefined, current: undefined };
}

/** After a restart nothing is running: an item that was is stopped, to resume where it was. */
export function afterRestart(state: BatchState): BatchState {
	return { ...state, items: state.items.map((i) => (i.status === "running" ? { ...i, status: "stopped", current: undefined } : i)) };
}

/** Adds projects at the end (a project already in the list isn't added twice). */
export function addItems(state: BatchState, paths: string[], now = Date.now()): { state: BatchState; added: number } {
	const have = new Set(state.items.map((i) => i.projectPath));
	const fresh = [...new Set(paths)].filter((p) => !have.has(p));
	const items = fresh.map((p, k) => ({ id: `${now.toString(36)}-${k}`, projectPath: p, title: projectTitle(p), group: projectGroup(p), status: "waiting" as const, steps: [], done: [], added: now }));
	return { state: { ...state, items: [...state.items, ...items] }, added: items.length };
}

const parts = (path: string) => path.split(/[\\/]/).filter(Boolean);

/** "01 - EP1" for …/projects/Show/01 - EP1.kroma */
export function projectTitle(path: string): string {
	return (parts(path).pop() ?? "Untitled").replace(/\.kroma$/i, "");
}

/** "Show" for …/projects/Show/01 - EP1.kroma */
export function projectGroup(path: string): string {
	const p = parts(path);
	return p.length > 1 ? p[p.length - 2] : "Projects";
}

/** The export's file name: "01 - EP1 (16x9).mp4". */
export function exportFileName(projectPath: string, format: PostFormat): string {
	return `${projectTitle(projectPath)} (${format.replace(":", "x")}).mp4`;
}

/** Where a format is exported: <exports>/<group>/01 - EP1 (9x16).mp4 */
export function exportPathFor(exportDir: string, projectPath: string, format: PostFormat): string {
	const sep = exportDir.includes("\\") && !exportDir.includes("/") ? "\\" : "/";
	return [exportDir.replace(/[\\/]+$/, ""), projectGroup(projectPath), exportFileName(projectPath, format)].join(sep);
}

/** Records an export on the project (one per format), replacing the older one of that format. */
export function recordExport(project: Project, format: Aspect, path: string, fingerprint: string): Project {
	return { ...project, exports: { ...project.exports, [format]: { path, fingerprint } }, lastExport: { path, fingerprint } };
}

/** The export of this format that still shows the project as it is now (its fingerprint matches), or null. */
export function currentExport(project: Project, format: Aspect, fingerprint: string): string | null {
	const e = project.exports?.[format];
	if (e && e.fingerprint === fingerprint) return e.path;
	// Exports from before formats were kept: the last one, when it's this format and still current.
	const last = project.lastExport;
	return !project.exports && last && project.aspect === format && last.fingerprint === fingerprint ? last.path : null;
}

/** "5 processed · 1 failed" */
export function runSummary(processed: number, failed: number, stopped = 0): string {
	return [`${processed} processed`, failed ? `${failed} failed` : "", stopped ? `${stopped} stopped` : ""].filter(Boolean).join(" · ");
}

export interface PostChoice {
	platforms: PublishPlatform[];
	formats: Record<PublishPlatform, PostFormat>;
	youtubePrivacy: "public" | "unlisted" | "private";
	tiktokMode: "post" | "draft";
}

/** The formats a choice needs exported. */
export const neededFormats = (choice: Pick<PostChoice, "platforms" | "formats">): PostFormat[] => POST_FORMATS.filter((f) => choice.platforms.some((p) => choice.formats[p] === f));

/**
 * The upload: each platform gets the file of its own format. Facebook goes up as a Reel when its video is tall and at
 * most 90 s, else as a normal Page video.
 */
export function publishRequest(args: {
	name: string;
	posts: PlatformCaption[];
	choice: PostChoice;
	files: Partial<Record<PostFormat, string>>;
	duration: number;
	profile: string;
	pageId?: string;
	key: string;
}): PublishRequest {
	const { choice, files } = args;
	const post = (name: PlatformCaption["platform"]) => args.posts.find((p) => p.platform === name) ?? { platform: name, title: args.name, description: "", hashtags: [] };
	const videos = Object.fromEntries(choice.platforms.map((p) => [p, files[choice.formats[p]]!])) as Partial<Record<PublishPlatform, string>>;
	const yt = post("YouTube");
	const fb = post("Facebook");
	const tt = post("TikTok");
	return {
		video: videos[choice.platforms[0]]!,
		videos,
		profile: args.profile,
		platforms: choice.platforms,
		youtube: { title: yt.title, description: yt.description, tags: yt.hashtags, privacy: choice.youtubePrivacy },
		facebook: { title: fb.title, description: fb.description, tags: fb.hashtags, pageId: args.pageId, mediaType: choice.formats.facebook === "9:16" && args.duration <= 90 ? "REELS" : "VIDEO" },
		tiktok: { caption: [tt.title, tt.description].filter(Boolean).join("\n").slice(0, 1800), tags: tt.hashtags, mode: choice.tiktokMode },
		idempotencyKey: args.key,
	};
}

/** Platforms grouped by the file they get: one upload per file. */
export function uploadGroups(req: Pick<PublishRequest, "video" | "videos" | "platforms">): { video: string; platforms: PublishPlatform[] }[] {
	const groups = new Map<string, PublishPlatform[]>();
	for (const p of req.platforms) {
		const file = req.videos?.[p] ?? req.video;
		groups.set(file, [...(groups.get(file) ?? []), p]);
	}
	return [...groups.entries()].map(([video, platforms]) => ({ video, platforms }));
}
