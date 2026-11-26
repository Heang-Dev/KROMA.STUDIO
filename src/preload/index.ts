import { contextBridge, ipcRenderer } from "electron";
import type { CaptionRequest, DownloadResult, ExportRequest, MediaItem, PlatformCaption, Project, Settings, SettingsView, SourceCue, TaskProgress, VoiceLine, MediaVisuals, KvsStatus, KvsVoice } from "@shared/types";

const api = {
	info: (): Promise<{ tools: { ffmpeg: boolean; ffprobe: boolean; ytdlp: boolean; uv: boolean }; libraryDir: string; version: string; smoke: boolean; e2e: boolean }> => ipcRenderer.invoke("app:info"),
	getSettings: (): Promise<SettingsView> => ipcRenderer.invoke("settings:get"),
	saveSettings: (patch: Partial<Record<keyof Settings, string | number | boolean | null>>): Promise<SettingsView> => ipcRenderer.invoke("settings:save", patch),

	geminiModels: (): Promise<{ id: string; label: string }[]> => ipcRenderer.invoke("gemini:models"),
	setZoom: (zoom: number): Promise<number> => ipcRenderer.invoke("zoom:set", zoom),
	onZoomChanged: (listener: (zoom: number) => void): (() => void) => {
		const handler = (_e: unknown, zoom: number) => listener(zoom);
		ipcRenderer.on("zoom:changed", handler);
		return () => ipcRenderer.off("zoom:changed", handler);
	},

	onFullscreenChanged: (listener: (fullscreen: boolean) => void): (() => void) => {
		const handler = (_e: unknown, fullscreen: boolean) => listener(fullscreen);
		ipcRenderer.on("fullscreen:changed", handler);
		return () => ipcRenderer.off("fullscreen:changed", handler);
	},

	openMedia: (): Promise<MediaItem[]> => ipcRenderer.invoke("media:open"),
	probe: (path: string): Promise<MediaItem> => ipcRenderer.invoke("media:probe", path),
	visuals: (path: string, duration: number): Promise<MediaVisuals> => ipcRenderer.invoke("media:visuals", path, duration),
	readSubtitles: (path: string): Promise<SourceCue[]> => ipcRenderer.invoke("media:readSubtitles", path),

	download: (taskId: string, url: string): Promise<DownloadResult> => ipcRenderer.invoke("task:download", taskId, url),
	transcribe: (taskId: string, path: string, duration: number, language: string): Promise<{ cues: SourceCue[]; note?: string }> =>
		ipcRenderer.invoke("task:transcribe", taskId, path, duration, language),
	translate: (taskId: string, lines: { id: string; text: string; seconds?: number }[], notes: string): Promise<{ translations: Record<string, string>; fallback: number }> =>
		ipcRenderer.invoke("task:translate", taskId, lines, notes),
	captions: (taskId: string, req: CaptionRequest): Promise<PlatformCaption[]> => ipcRenderer.invoke("task:captions", taskId, req),
	exportVideo: (taskId: string, req: ExportRequest): Promise<string> => ipcRenderer.invoke("task:export", taskId, req),
	voiceOver: (taskId: string, lines: { id: string; text: string }[], voice: string, rate: number): Promise<Record<string, VoiceLine>> =>
		ipcRenderer.invoke("task:voice", taskId, lines, voice, rate),
	kvsStatus: (): Promise<KvsStatus> => ipcRenderer.invoke("kvs:status"),
	kvsVoices: (): Promise<KvsVoice[]> => ipcRenderer.invoke("kvs:voices"),
	kvsDelete: (id: string): Promise<void> => ipcRenderer.invoke("kvs:delete", id),
	kvsPickRecording: (): Promise<string | null> => ipcRenderer.invoke("kvs:pickRecording"),
	removeVoices: (taskId: string, path: string, duration: number, quality: "fast" | "best"): Promise<string> => ipcRenderer.invoke("task:separate", taskId, path, duration, quality),
	cloneVoice: (taskId: string, name: string, recording: string): Promise<KvsVoice> => ipcRenderer.invoke("task:clone", taskId, name, recording),
	cancel: (taskId: string): Promise<void> => ipcRenderer.invoke("task:cancel", taskId),
	onProgress: (listener: (p: TaskProgress) => void): (() => void) => {
		const handler = (_e: unknown, p: TaskProgress) => listener(p);
		ipcRenderer.on("task:progress", handler);
		return () => ipcRenderer.off("task:progress", handler);
	},

	chooseFolder: (current: string): Promise<string | null> => ipcRenderer.invoke("dialog:chooseFolder", current),
	folderDefaults: (): Promise<{ exportDir: string; downloadDir: string; libraryDir: string }> => ipcRenderer.invoke("folders:defaults"),
	openFolder: (dir: string): Promise<void> => ipcRenderer.invoke("shell:openFolder", dir),
	saveVideoDialog: (name: string): Promise<string | null> => ipcRenderer.invoke("dialog:saveVideo", name),
	importSrt: (): Promise<SourceCue[] | null> => ipcRenderer.invoke("srt:import"),
	exportSrt: (name: string, content: string): Promise<string | null> => ipcRenderer.invoke("srt:export", name, content),
	saveProject: (project: Project, path: string | null): Promise<string | null> => ipcRenderer.invoke("project:save", project, path),
	openProject: (): Promise<{ project: Project; path: string } | null> => ipcRenderer.invoke("project:open"),
	autosave: (project: Project, path: string | null): Promise<void> => ipcRenderer.invoke("autosave:write", project, path),
	readAutosave: (): Promise<{ project: Project; path: string | null } | null> => ipcRenderer.invoke("autosave:read"),
	showInFolder: (path: string): Promise<void> => ipcRenderer.invoke("shell:show", path),
	openExternal: (url: string): Promise<void> => ipcRenderer.invoke("shell:open", url),
};

export type KromaApi = typeof api;
contextBridge.exposeInMainWorld("kroma", api);
