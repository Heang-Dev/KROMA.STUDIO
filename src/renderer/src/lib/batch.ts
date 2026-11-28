import { create } from "zustand";
import {
	type BatchItem,
	type BatchOptions,
	type BatchState,
	type BatchStep,
	EMPTY_BATCH,
	type PostChoice,
	type StepLog,
	STEP_NOUN,
	addItems,
	nextStep,
	pruneHistory,
	retryFrom,
	nextToRun,
	planSteps,
	retryItem,
	runSummary,
	stepFormat,
} from "@shared/batch";
import { useEditor } from "@/state/store";
import { batchMode } from "./batchMode";
import { exportFormat, findCharacters, getSubtitles, mainMedia, makeVoiceOver, preferredSiteSubtitle, publishVideo, removeOriginalVoices, setLanguage, setVoice, short, translateCues, voiceSettings, writePosts, PLATFORM_NAMES } from "./actions";
import { notify } from "./notify";
import { lookOf } from "./stylePresets";
import { totalDuration } from "./timeline";

// Batch: runs the editor's own steps (lib/actions.ts) on one project after another, without asking anything, saving
// each project after every step so a restart resumes where it stopped. Stops before posting: "Ready to post" posts
// each video where you choose. While it runs it borrows the editor (your open project is put back after).

interface BatchStore {
	state: BatchState;
	loaded: boolean;
	/** What the batch is doing with the editor: processing the list, or posting. */
	busy: "process" | "post" | null;
	stopping: boolean;
	/** The row whose details are open. */
	selected: string | null;
	/** The run going on now. */
	runId: string | null;
}

export const useBatch = create<BatchStore>(() => ({ state: EMPTY_BATCH, loaded: false, busy: null, stopping: false, selected: null, runId: null }));

/** Opens a row's details (from Ready to post too). */
export function showBatchItem(id: string | null): void {
	useBatch.setState({ selected: id });
	if (id) useEditor.getState().openBatch("process");
}

const get = () => useBatch.getState().state;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Changes the list and writes it to <library>/batch.json a moment later. */
function change(fn: (s: BatchState) => BatchState): void {
	useBatch.setState((b) => ({ state: fn(b.state) }));
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => void window.kroma.writeBatch(get()).catch(() => undefined), 250);
}

const patch = (id: string, fields: Partial<BatchItem> | ((i: BatchItem) => Partial<BatchItem>)) =>
	change((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...(typeof fields === "function" ? fields(i) : fields) } : i)) }));

const itemOf = (id: string) => get().items.find((i) => i.id === id);

export async function loadBatch(): Promise<void> {
	if (useBatch.getState().loaded) return;
	const state = await window.kroma.readBatch().catch(() => EMPTY_BATCH);
	useBatch.setState({ state, loaded: true });
}

/** Adds projects to the list (waiting); returns how many were new. */
export function addToBatch(paths: string[]): number {
	let added = 0;
	change((s) => {
		const r = addItems(s, paths);
		added = r.added;
		return r.state;
	});
	return added;
}

export function removeFromBatch(id: string): void {
	if (itemOf(id)?.status === "running") return;
	change((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
}

/** Clears finished projects that were posted, or every finished one (done or failed). */
export function clearFromBatch(which: "posted" | "finished"): void {
	change((s) => ({ ...s, items: s.items.filter((i) => !(which === "posted" ? i.status === "done" && i.posted : i.status === "done" || i.status === "failed")) }));
}

export function setBatchOptions(patchOptions: Partial<BatchOptions>): void {
	change((s) => ({ ...s, options: { ...s.options, ...patchOptions } }));
}

/** Runs every waiting and stopped project, one at a time. */
export function startBatch(): void {
	change((s) => ({ ...s, items: s.items.map((i) => (i.status === "stopped" ? retryItem(i) : i)) }));
	void runQueue();
}

/** Carries on from the step that failed. */
export function retryBatchItem(id: string): void {
	const item = itemOf(id);
	if (!item || (item.status !== "failed" && item.status !== "stopped")) return;
	patch(id, retryItem(item));
	void runQueue();
}

/** Runs the project again from this step (it and the later ones are done again). */
export function retryBatchFrom(id: string, step: BatchStep): void {
	const item = itemOf(id);
	if (!item || item.status === "running") return;
	patch(id, retryFrom(item, step));
	void runQueue();
}

/** Stops after cancelling the step that's running; the project resumes from that step next time. */
export function stopBatch(): void {
	if (!useBatch.getState().busy) return;
	useBatch.setState({ stopping: true });
	for (const t of Object.values(useEditor.getState().tasks)) if (t.status === "running") void window.kroma.cancel(t.id);
}

/**
 * Lends the editor to the batch: your project (with its undo history) is put aside and comes back after; meanwhile
 * the editor can't be used, and the autosave keeps your project.
 */
async function borrowEditor<T>(reason: string, work: () => Promise<T>): Promise<T> {
	const e = useEditor.getState();
	const saved = { project: e.project, projectPath: e.projectPath, dirty: e.dirty, past: e.past, future: e.future, time: e.time, selection: e.selection };
	useEditor.setState({ locked: reason, playing: false, selection: null });
	if (e.view.name === "editor") e.openBatch(useBatch.getState().busy === "post" ? "ready" : "process");
	batchMode.on = true;
	batchMode.lastError = null;
	try {
		return await work();
	} finally {
		batchMode.on = false;
		batchMode.lastError = null;
		useEditor.setState({ ...saved, locked: null, seekVersion: useEditor.getState().seekVersion + 1 });
	}
}

async function runQueue(): Promise<void> {
	if (useBatch.getState().busy || !nextToRun(get().items)) return;
	const runId = `run-${Date.now().toString(36)}`;
	useBatch.setState({ busy: "process", stopping: false, runId });
	// The videos waiting now belong to this run (ones added while it runs join it when they start).
	change((s) => ({ ...s, runs: [...(s.runs ?? []), { id: runId, at: Date.now() }], items: s.items.map((i) => (i.status === "waiting" && !i.runId ? { ...i, runId } : i)) }));
	const tally = { ready: 0, failed: 0, stopped: 0 };
	try {
		await borrowEditor("It's processing videos. Wait for it, or press Stop in the bar above.", async () => {
			for (;;) {
				if (useBatch.getState().stopping) break;
				const item = nextToRun(get().items);
				if (!item) break;
				const outcome = await processItem(item.id);
				tally[outcome] += 1;
			}
		});
	} finally {
		useBatch.setState({ busy: null, stopping: false, runId: null });
		// The run's group goes when nothing was processed in it (all stopped before starting).
		change((s) => pruneHistory({ ...s, runs: (s.runs ?? []).filter((r) => r.id !== runId || s.items.some((i) => i.runId === runId)) }));
		clearTimeout(saveTimer);
		await window.kroma.writeBatch(get()).catch(() => undefined);
	}
	const total = tally.ready + tally.failed;
	if (total > 1 || tally.stopped) {
		notify({
			batch: true,
			kind: "export",
			tone: tally.failed ? "error" : "success",
			title: `Batch finished: ${runSummary(total, tally.failed, tally.stopped)}`,
			detail: tally.ready ? `${tally.ready} ready to post.` : undefined,
			action: { kind: "view", view: "batch", section: "ready" },
		});
	}
}

/** Saves the open (batch) project to its file. */
async function saveOpen(path: string): Promise<void> {
	const saved = await window.kroma.saveProject(useEditor.getState().project, path);
	if (saved) useEditor.getState().markSaved(saved);
}

async function processItem(id: string): Promise<"ready" | "failed" | "stopped"> {
	const start = itemOf(id)!;
	const steps = start.steps.length ? start.steps : planSteps(get().options);
	patch(id, { status: "running", steps, error: undefined, current: nextStep({ steps, done: start.done }) ?? undefined, runId: start.runId ?? useBatch.getState().runId ?? undefined });
	const log = (step: BatchStep, entry: Partial<StepLog>) => patch(id, (i) => ({ log: { ...i.log, [step]: { ...(i.log?.[step] ?? { status: "running", start: Date.now() }), ...entry } } }));
	const fail = (step: BatchStep | null, reason: string) => {
		const stopped = useBatch.getState().stopping;
		if (step) log(step, stopped ? { status: "failed", end: Date.now(), message: "Stopped" } : { status: "failed", end: Date.now(), message: reason });
		patch(id, { status: stopped ? "stopped" : "failed", current: undefined, error: stopped ? undefined : reason });
		if (stopped) return "stopped" as const;
		const title = itemOf(id)?.title ?? start.title;
		notify({
			batch: true,
			kind: "export",
			tone: "error",
			title: `${short(title, 32)}: ${step ? `${STEP_NOUN[step]} failed` : "couldn't open"}`,
			detail: reason,
			action: { kind: "retry", run: () => retryBatchItem(id) },
		});
		return "failed" as const;
	};

	try {
		useEditor.getState().load(await window.kroma.readProject(start.projectPath), start.projectPath);
	} catch {
		return fail(null, "The project file was moved or deleted.");
	}

	for (;;) {
		const item = itemOf(id)!;
		const step = nextStep(item);
		if (!step) break;
		if (useBatch.getState().stopping) return fail(step, "Stopped");
		patch(id, (i) => ({ current: step, log: { ...i.log, [step]: { status: "running", start: Date.now() } } }));
		batchMode.lastError = null;
		batchMode.lastNote = null;
		let ok = false;
		try {
			ok = await runStep(step, item);
		} catch (err) {
			batchMode.lastError ??= err instanceof Error ? err.message : String(err);
		}
		if (!ok) return fail(step, batchMode.lastError ?? "It didn't work. Open the project to see why.");
		await saveOpen(item.projectPath);
		const format = stepFormat(step);
		log(step, { status: "done", end: Date.now(), message: (format && itemOf(id)?.exports?.[format]) || batchMode.lastNote || undefined });
		patch(id, (i) => ({ done: [...i.done, step] }));
	}

	const project = useEditor.getState().project;
	patch(id, { status: "done", current: undefined, duration: totalDuration(project.clips), title: itemOf(id)!.title });
	notify({ batch: true, kind: "export", tone: "success", title: `${short(start.title, 40)} ready to post`, detail: (itemOf(id)?.exports && Object.keys(itemOf(id)!.exports!).join(" and ")) || undefined, action: { kind: "view", view: "batch", section: "ready" } });
	return "ready";
}

/** One step on the open project. True when it worked. */
async function runStep(step: BatchStep, item: BatchItem): Promise<boolean> {
	const o = get().options;
	const editor = useEditor.getState();
	const format = stepFormat(step);
	if (format) {
		const out = await window.kroma.batchExportPath(item.projectPath, format);
		const file = await exportFormat(format, o.quality, out);
		if (file) patch(item.id, (i) => ({ exports: { ...i.exports, [format]: file } }));
		return Boolean(file);
	}
	switch (step) {
		case "subtitles": {
			const media = mainMedia();
			if (!media) {
				batchMode.lastError = "The project has no video.";
				return false;
			}
			const site = preferredSiteSubtitle(media);
			return getSubtitles(media, site ? { kind: "site", path: site } : { kind: "cloud", language: o.spokenLanguage });
		}
		case "translate":
			if (editor.project.language !== o.language) setLanguage(o.language);
			return translateCues(false);
		case "characters":
			return findCharacters();
		case "removeVoices":
			return removeOriginalVoices("fast");
		case "voice": {
			const v = voiceSettings(useEditor.getState().project);
			// One voice: every line, characters too. Each character's voice: the voice is for lines without one.
			setVoice({
				voice: o.voiceId,
				...(o.voice === "one" && v.cast?.length ? { cast: v.cast.map((c) => ({ ...c, voice: o.voiceId })) } : {}),
				// Off: the voice-over plays over the original sound (quietly), instead of removing the voices on its own.
				...(!o.removeVoices && v.removeVoices === undefined ? { removeVoices: false } : {}),
			});
			return makeVoiceOver();
		}
		case "style":
			const preset = o.style;
			if (preset !== "keep") editor.update((p) => ({ ...p, style: { ...p.style, ...lookOf(preset) } }));
			batchMode.lastNote = `Style: ${o.style}`;
			return true;
		case "posts":
			return writePosts();
		default:
			return false;
	}
}

/** Posts finished projects, each where its choice says (missing formats are exported first). */
export async function postBatchItems(choices: { id: string; choice: PostChoice }[]): Promise<void> {
	if (useBatch.getState().busy || !choices.length) return;
	useBatch.setState({ busy: "post", stopping: false });
	try {
		await borrowEditor("It's posting videos. Wait for it to finish.", async () => {
			for (const { id, choice } of choices) {
				if (useBatch.getState().stopping) break;
				const item = itemOf(id);
				if (!item) continue;
				try {
					useEditor.getState().load(await window.kroma.readProject(item.projectPath), item.projectPath);
				} catch {
					notify({ batch: true, kind: "export", tone: "error", title: `${short(item.title, 32)}: not posted`, detail: "The project file was moved or deleted." });
					continue;
				}
				batchMode.lastError = null;
				const results = await publishVideo({ ...choice, quality: get().options.quality });
				// Exports made for posting and the post record are kept with the project.
				await saveOpen(item.projectPath);
				const exports = useEditor.getState().project.exports;
				patch(id, (i) => ({ exports: { ...i.exports, ...Object.fromEntries(Object.entries(exports ?? {}).filter(([f]) => f !== "1:1").map(([f, e]) => [f, e!.path])) } }));
				if (!results) {
					notify({ batch: true, kind: "export", tone: "error", title: `${short(item.title, 32)}: not posted`, detail: batchMode.lastError ?? "Posting didn't start." });
					continue;
				}
				patch(id, { posted: { at: Date.now(), results } });
				const failed = results.filter((r) => r.state === "failed");
				notify(
					failed.length
						? { batch: true, kind: "export", tone: "error", title: `${short(item.title, 32)}: not posted to ${failed.map((r) => PLATFORM_NAMES[r.platform]).join(", ")}`, detail: failed[0].message }
						: { batch: true, kind: "export", tone: "success", title: `Posted ${short(item.title, 32)} to ${results.map((r) => PLATFORM_NAMES[r.platform]).join(", ")}` },
				);
			}
		});
	} finally {
		useBatch.setState({ busy: null, stopping: false });
	}
}

/** The project shown in the banner: the one running now. */
export function runningItem(): BatchItem | undefined {
	return get().items.find((i) => i.status === "running");
}
