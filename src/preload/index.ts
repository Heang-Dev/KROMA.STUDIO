import { contextBridge, ipcRenderer } from "electron";
import type { CaptionRequest, DownloadResult, ExportRequest, MediaItem, PlatformCaption, Project, Settings, SettingsView, SourceCue, TaskProgress, VoiceLine } from "@shared/types";

const api = {
	info: (): Promise<{ tools: { ffmpeg: boolean; ffprobe: boolean; ytdlp: boolean }; libraryDir: string; smoke: boolean }> => ipcRenderer.invoke("app:info"),
	getSettings: (): Promise<SettingsView> => ipcRenderer.invoke("settings:get"),
	saveSettings: (patch: Partial<Record<keyof Settings, string | number | null>>): Promise<SettingsView> => ipcRenderer.invoke("settings:save", patch),

	openMedia: (): Promise<MediaItem[]> => ipcRenderer.invoke("media:open"),
	probe: (path: string): Promise<MediaItem> => ipcRenderer.invoke("media:probe", path),
	readSubtitles: (path: string): Promise<SourceCue[]> => ipcRenderer.invoke("media:readSubtitles", path),

	download: (taskId: string, url: string): Promise<DownloadResult> => ipcRenderer.invoke("task:download", taskId, url),
	transcribe: (taskId: string, path: string, duration: number, language: string): Promise<SourceCue[]> =>
		ipcRenderer.invoke("task:transcribe", taskId, path, duration, language),
	translate: (taskId: string, lines: { id: string; text: string }[], notes: string): Promise<Record<string, string>> =>
		ipcRenderer.invoke("task:translate", taskId, lines, notes),
	captions: (taskId: string, req: CaptionRequest): Promise<PlatformCaption[]> => ipcRenderer.invoke("task:captions", taskId, req),
	exportVideo: (taskId: string, req: ExportRequest): Promise<string> => ipcRenderer.invoke("task:export", taskId, req),
	voiceOver: (taskId: string, lines: { id: string; text: string }[], voice: string, rate: number): Promise<Record<string, VoiceLine>> =>
		ipcRenderer.invoke("task:voice", taskId, lines, voice, rate),
	cancel: (taskId: string): Promise<void> => ipcRenderer.invoke("task:cancel", taskId),
	onProgress: (listener: (p: TaskProgress) => void): (() => void) => {
		const handler = (_e: unknown, p: TaskProgress) => listener(p);
		ipcRenderer.on("task:progress", handler);
		return () => ipcRenderer.off("task:progress", handler);
	},

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
