import { toast } from "sonner";
import { create } from "zustand";
import { DEFAULT_STYLE, type Project } from "@shared/types";
import { totalDuration } from "@/lib/timeline";
import type { NoticeKind } from "@shared/notify";
import { type NotifyAction, type NotifyInput, notify } from "@/lib/notify";
import { batchMode, noteBatchError, noteBatchMessage } from "@/lib/batchMode";
import { t } from "@shared/i18n";

export type Panel = "media" | "ai" | "voice" | "style" | "objects" | "post";

export interface TaskState {
	id: string;
	label: string;
	progress: number;
	message: string;
	status: "running" | "done" | "error";
	error?: string;
}

export interface Selection {
	kind: "clip" | "cue" | "object";
	id: string;
}

interface EditorState {
	project: Project;
	projectPath: string | null;
	dirty: boolean;
	past: Project[];
	future: Project[];

	time: number;
	/** Bumped on every user seek, so the player knows to jump (playback updates `time` without it). */
	seekVersion: number;
	playing: boolean;
	zoom: number; // pixels per second
	panel: Panel;
	/** The editor, or the full-page Settings (Orca-style) open at one section. */
	view: { name: "editor" } | { name: "settings"; section: string } | { name: "voices" } | { name: "story" } | { name: "downloads" } | { name: "batch"; tab?: "process" | "ready" };
	/** Set while a batch uses the editor for its projects: the editor can't be used until it's done (says why). */
	locked: string | null;
	selection: Selection | null;
	tasks: Record<string, TaskState>;
	toast: { text: string; tone: "info" | "error" } | null;

	/** Changes the project. `history: false` for continuous edits (typing, dragging) after a `checkpoint()`. */
	update: (fn: (p: Project) => Project, history?: boolean) => void;
	checkpoint: () => void;
	undo: () => void;
	redo: () => void;
	load: (project: Project, path: string | null) => void;
	markSaved: (path: string) => void;

	seek: (t: number) => void;
	setTime: (t: number) => void;
	setPlaying: (playing: boolean) => void;
	setZoom: (zoom: number) => void;
	setPanel: (panel: Panel) => void;
	openSettings: (section?: string) => void;
	closeSettings: () => void;
	openVoices: () => void;
	closeVoices: () => void;
	/** Story studio: a voice for every character of a story. */
	openStory: () => void;
	/** Download Center: playlists and channels, a project per video. */
	openDownloads: () => void;
	/** Batch: several projects through every step, then "Ready to post". */
	openBatch: (tab?: "process" | "ready") => void;
	select: (selection: Selection | null) => void;
	setTask: (task: TaskState) => void;
	/**
	 * A passing notice: short title, optional detail line and button. Errors stay longer and can be closed. Long work
	 * finishing or failing goes through notify() (lib/notify.ts) instead, which also keeps it in the history.
	 */
	showToast: (text: string, tone?: "info" | "error", description?: string, action?: { label: string; onClick: () => void }) => void;
}

export function newProject(): Project {
	return { version: 1, name: "Untitled", aspect: "16:9", fit: "blur", media: [], clips: [], cues: [], style: { ...DEFAULT_STYLE }, context: "" };
}

const HISTORY = 100;

export const useEditor = create<EditorState>((set, get) => ({
	project: newProject(),
	projectPath: null,
	dirty: false,
	past: [],
	future: [],
	time: 0,
	seekVersion: 0,
	playing: false,
	zoom: 40,
	panel: "media",
	view: { name: "editor" },
	locked: null,
	selection: null,
	tasks: {},
	toast: null,

	update: (fn, history = true) =>
		set((s) => {
			const next = fn(s.project);
			if (next === s.project) return s;
			const sorted = next.cues === s.project.cues ? next : { ...next, cues: [...next.cues].sort((a, b) => a.start - b.start) };
			return {
				project: sorted,
				dirty: true,
				past: history ? [...s.past.slice(-HISTORY + 1), s.project] : s.past,
				future: history ? [] : s.future,
			};
		}),
	checkpoint: () => set((s) => ({ past: [...s.past.slice(-HISTORY + 1), s.project], future: [] })),
	undo: () =>
		set((s) => {
			const prev = s.past[s.past.length - 1];
			if (!prev) return s;
			return { project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future], dirty: true };
		}),
	redo: () =>
		set((s) => {
			const next = s.future[0];
			if (!next) return s;
			return { project: next, past: [...s.past, s.project], future: s.future.slice(1), dirty: true };
		}),
	load: (project, path) => set({ project, projectPath: path, dirty: false, past: [], future: [], time: 0, seekVersion: get().seekVersion + 1, selection: null, playing: false }),
	markSaved: (path) => set({ projectPath: path, dirty: false }),

	seek: (t) => set((s) => ({ time: Math.max(0, Math.min(t, totalDuration(s.project.clips))), seekVersion: s.seekVersion + 1 })),
	setTime: (t) => set({ time: t }),
	setPlaying: (playing) => set({ playing }),
	setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(400, zoom)) }),
	setPanel: (panel) => set({ panel }),
	openSettings: (section) => set((s) => ({ playing: false, view: { name: "settings", section: section ?? (s.view.name === "settings" ? s.view.section : "translation") } })),
	closeSettings: () => set({ view: { name: "editor" } }),
	openVoices: () => set({ playing: false, view: { name: "voices" } }),
	closeVoices: () => set({ view: { name: "editor" } }),
	openStory: () => set({ playing: false, view: { name: "story" } }),
	openDownloads: () => set({ playing: false, view: { name: "downloads" } }),
	openBatch: (tab) => set({ playing: false, view: { name: "batch", tab } }),
	select: (selection) => set({ selection }),
	setTask: (task) => set((s) => ({ tasks: { ...s.tasks, [task.id]: task } })),
	showToast: (text, tone = "info", description, action) => {
		// A batch reports once per project; an error the action shows is why its step failed.
		if (batchMode.on) {
			if (tone === "error") noteBatchError(description ? `${text}: ${description}` : text);
			else noteBatchMessage(text.replace(/\.$/, ""));
			return;
		}
		set({ toast: { text, tone } });
		if (tone === "error") toast.error(text, { description, action, duration: 9000, closeButton: true });
		else toast.success(text, { description, action, duration: action ? 6000 : undefined });
		setTimeout(() => {
			if (get().toast?.text === text) set({ toast: null });
		}, tone === "error" ? 7000 : 3500);
	},
}));

export interface RunTaskOptions<T> {
	/** What it's about (Settings → Notifications → What to notify about). */
	kind?: NoticeKind;
	/**
	 * The notice when it worked: default "<label> done". A function words it from the result (null: no notice), or
	 * false when the caller notifies itself afterwards (it knows more, like how many lines).
	 */
	done?: false | ((result: T) => NotifyInput | null);
	/** The title when it failed: default "<label> failed". The error is the detail. */
	failed?: string;
	/** Offered as "Retry" on the failure notice. */
	retry?: () => unknown;
	/** A button on the failure notice instead of Retry (e.g. open the settings it needs). */
	failedAction?: NotifyAction;
}

/**
 * Runs a main-process task, mirroring its progress into the store, and notifies when it's done or failed (not when
 * cancelled). Returns null if it failed or was cancelled.
 */
export async function runTask<T>(id: string, text: string, work: (taskId: string) => Promise<T>, options: RunTaskOptions<T> = {}): Promise<T | null> {
	const { setTask } = useEditor.getState();
	// The label is English in the code (the key), shown in the interface language.
	const label = t(text);
	setTask({ id, label, progress: -1, message: t("Starting…"), status: "running" });
	let result: T;
	try {
		result = await work(id);
	} catch (err) {
		const message = cleanError(err);
		setTask({ id, label, progress: 0, message, status: "error", error: message });
		noteBatchError(message);
		if (message !== "Cancelled" && !batchMode.on) {
			const action = options.failedAction ?? (options.retry ? { kind: "retry" as const, run: options.retry } : undefined);
			notify({ tone: "error", kind: options.kind, title: options.failed ? t(options.failed) : t("{label} failed", { label }), detail: message, action });
		}
		return null;
	}
	setTask({ id, label, progress: 1, message: t("Done"), status: "done" });
	if (options.done !== false) {
		const notice = options.done ? options.done(result) : { tone: "success" as const, title: t("{label} done", { label }) };
		if (notice) notify({ kind: options.kind, ...notice });
	}
	return result;
}

/** Electron prefixes errors with "Error invoking remote method 'x': Error: "; people only need the last part. */
function cleanError(err: unknown): string {
	const text = err instanceof Error ? err.message : String(err);
	return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}

export function subscribeProgress(): () => void {
	return window.kroma.onProgress(({ taskId, progress, message }) => {
		const task = useEditor.getState().tasks[taskId];
		if (task && task.status === "running") useEditor.getState().setTask({ ...task, progress, message });
	});
}
