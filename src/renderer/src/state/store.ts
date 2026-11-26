import { create } from "zustand";
import { DEFAULT_STYLE, type Project } from "@shared/types";
import { totalDuration } from "@/lib/timeline";

export type Panel = "media" | "ai" | "voice" | "style" | "post";

export interface TaskState {
	id: string;
	label: string;
	progress: number;
	message: string;
	status: "running" | "done" | "error";
	error?: string;
}

export interface Selection {
	kind: "clip" | "cue";
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
	select: (selection: Selection | null) => void;
	setTask: (task: TaskState) => void;
	showToast: (text: string, tone?: "info" | "error") => void;
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
	select: (selection) => set({ selection }),
	setTask: (task) => set((s) => ({ tasks: { ...s.tasks, [task.id]: task } })),
	showToast: (text, tone = "info") => {
		set({ toast: { text, tone } });
		setTimeout(() => {
			if (get().toast?.text === text) set({ toast: null });
		}, tone === "error" ? 7000 : 3500);
	},
}));

/** Runs a main-process task, mirroring its progress into the store. Returns null if it failed or was cancelled. */
export async function runTask<T>(id: string, label: string, work: (taskId: string) => Promise<T>): Promise<T | null> {
	const { setTask, showToast } = useEditor.getState();
	setTask({ id, label, progress: -1, message: "Starting…", status: "running" });
	try {
		const result = await work(id);
		setTask({ id, label, progress: 1, message: "Done", status: "done" });
		return result;
	} catch (err) {
		const message = cleanError(err);
		setTask({ id, label, progress: 0, message, status: "error", error: message });
		if (message !== "Cancelled") showToast(`${label}: ${message}`, "error");
		return null;
	}
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
