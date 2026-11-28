import { contextBridge, ipcRenderer } from "electron";
import type { BatchState, PostFormat } from "@shared/batch";
import type { MainNotice, SystemNotice } from "@shared/notify";
import type { GlossaryTerm } from "@shared/glossary";
import type { FoundSubtitles } from "@shared/hardsubs";
import type { DownloadCenterState, DownloadOptions, FilledTitle, ImportPick, ListedSource, ListedVideo } from "@shared/downloads";
import type { CaptionRequest, DownloadResult, ExportRequest, MediaItem, PlatformCaption, Project, Settings, SettingsView, SourceCue, TaskProgress, VoiceLine, MediaVisuals, KvsStatus, KvsVoice, StoryRecord, StoryRequest, PostAccount, PostProfile, PublishRequest, PublishResult, UpdateState, MyStyle } from "@shared/types";

const api = {
	info: (): Promise<{ slot: number; tools: { ffmpeg: boolean; ffprobe: boolean; ytdlp: boolean; uv: boolean }; platform: string; installHints: { ffmpeg: string; ytdlp: string; uv: string }; libraryDir: string; version: string; smoke: boolean; e2e: boolean; firstRun: boolean }> => ipcRenderer.invoke("app:info"),
	getSettings: (): Promise<SettingsView> => ipcRenderer.invoke("settings:get"),
	/** My saved subtitle styles (Style → Save as my style). */
	myStyles: (): Promise<MyStyle[]> => ipcRenderer.invoke("styles:get"),
	setMyStyles: (list: MyStyle[]): Promise<MyStyle[]> => ipcRenderer.invoke("styles:set", list),
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
	/** `projectPath`: its folder's series glossary is used. */
	translate: (taskId: string, lines: { id: string; text: string; seconds?: number }[], notes: string, language?: string, projectPath?: string | null): Promise<{ translations: Record<string, string>; fallback: number }> =>
		ipcRenderer.invoke("task:translate", taskId, lines, notes, language, projectPath),
	/** A frame of a video as a JPEG, for drawing a cover on. */
	coverFrame: (path: string, seconds: number): Promise<Uint8Array> => ipcRenderer.invoke("cover:frame", path, seconds),
	/** A good moment of a video for its cover (sharp, not dark). */
	pickCoverTime: (path: string, duration: number): Promise<number> => ipcRenderer.invoke("cover:pickTime", path, duration),
	/** Saves a cover next to the episode's exports; returns the file. */
	saveCover: (projectPath: string | null, name: string, format: PostFormat, jpg: Uint8Array): Promise<string> => ipcRenderer.invoke("cover:save", projectPath, name, format, jpg),
	/** Where a video's burned-in subtitles are (fractions of its picture), or null. */
	findBurnedSubtitles: (taskId: string, path: string, duration: number): Promise<FoundSubtitles | null> => ipcRenderer.invoke("task:findHardsubs", taskId, path, duration),
	/** The series glossary of a project's folder (empty for an unsaved project). */
	glossary: (projectPath: string | null): Promise<GlossaryTerm[]> => ipcRenderer.invoke("glossary:get", projectPath),
	setGlossary: (projectPath: string, terms: GlossaryTerm[]): Promise<GlossaryTerm[]> => ipcRenderer.invoke("glossary:set", projectPath, terms),
	/** Finds names and terms (with their translation) in translated lines, for the glossary. Needs Gemini or Claude. */
	findGlossaryTerms: (taskId: string, pairs: { source: string; text: string }[], language?: string): Promise<GlossaryTerm[]> => ipcRenderer.invoke("task:glossaryFind", taskId, pairs, language),
	setTitleBarColors: (color: string, symbolColor: string): Promise<void> => ipcRenderer.invoke("window:titleBar", color, symbolColor),
	getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke("update:get"),
	checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke("update:check"),
	downloadUpdate: (): Promise<void> => ipcRenderer.invoke("update:download"),
	installUpdate: (): Promise<void> => ipcRenderer.invoke("update:install"),
	onUpdateState: (callback: (state: UpdateState) => void): (() => void) => {
		const listener = (_e: Electron.IpcRendererEvent, state: UpdateState) => callback(state);
		ipcRenderer.on("update:state", listener);
		return () => ipcRenderer.removeListener("update:state", listener);
	},
	fileExists: (path: string): Promise<boolean> => ipcRenderer.invoke("file:exists", path),
	postAccount: (): Promise<PostAccount> => ipcRenderer.invoke("post:account"),
	postProfiles: (): Promise<PostProfile[]> => ipcRenderer.invoke("post:profiles"),
	postConnect: (): Promise<string> => ipcRenderer.invoke("post:connect"),
	facebookPages: (): Promise<{ id: string; name: string }[]> => ipcRenderer.invoke("post:facebookPages"),
	publish: (taskId: string, req: PublishRequest): Promise<PublishResult[]> => ipcRenderer.invoke("task:publish", taskId, req),
	captions: (taskId: string, req: CaptionRequest): Promise<PlatformCaption[]> => ipcRenderer.invoke("task:captions", taskId, req),
	exportVideo: (taskId: string, req: ExportRequest): Promise<string> => ipcRenderer.invoke("task:export", taskId, req),
	findCharacters: (
		taskId: string,
		lines: { id: string; text: string; start: number }[],
		voices: { id: string; label: string; description: string }[],
		notes: string,
	): Promise<{ characters: { name: string; description: string; voice: string }[]; speakers: Record<string, string> }> => ipcRenderer.invoke("task:characters", taskId, lines, voices, notes),
	voiceOver: (taskId: string, lines: { id: string; text: string }[], voice: string, rate: number): Promise<Record<string, VoiceLine>> =>
		ipcRenderer.invoke("task:voice", taskId, lines, voice, rate),
	kvsStatus: (): Promise<KvsStatus> => ipcRenderer.invoke("kvs:status"),
	kvsStart: (): Promise<KvsStatus> => ipcRenderer.invoke("kvs:start"),
	kvsStop: (): Promise<void> => ipcRenderer.invoke("kvs:stop"),
	kvsShowLog: (): Promise<void> => ipcRenderer.invoke("kvs:engineLog"),
	kvsVoices: (): Promise<KvsVoice[]> => ipcRenderer.invoke("kvs:voices"),
	installEngine: (taskId: string): Promise<void> => ipcRenderer.invoke("task:installEngine", taskId),
	removeEngine: (): Promise<void> => ipcRenderer.invoke("kvs:removeEngine"),
	kvsDelete: (id: string): Promise<void> => ipcRenderer.invoke("kvs:delete", id),
	kvsPickRecording: (): Promise<string | null> => ipcRenderer.invoke("kvs:pickRecording"),
	tellStory: (taskId: string, request: StoryRequest): Promise<StoryRecord> => ipcRenderer.invoke("task:story", taskId, request),
	redoStoryLine: (taskId: string, id: string, line: number): Promise<StoryRecord> => ipcRenderer.invoke("task:storyRedo", taskId, id, line),
	stories: (): Promise<StoryRecord[]> => ipcRenderer.invoke("story:list"),
	deleteStory: (id: string): Promise<void> => ipcRenderer.invoke("story:delete", id),
	saveStoryAs: (id: string): Promise<string | null> => ipcRenderer.invoke("story:saveAs", id),
	showStory: (id: string): Promise<void> => ipcRenderer.invoke("story:show", id),
	removeVoices: (taskId: string, path: string, duration: number, quality: "fast" | "best"): Promise<string> => ipcRenderer.invoke("task:separate", taskId, path, duration, quality),
	voiceSample: (voice: string, rate: number): Promise<string | null> => ipcRenderer.invoke("voice:sample", voice, rate),
	makePresetVoice: (taskId: string, name: string): Promise<KvsVoice> => ipcRenderer.invoke("task:presetVoice", taskId, name),
	cloneVoice: (taskId: string, name: string, recording: string, transcript?: string): Promise<KvsVoice> => ipcRenderer.invoke("task:clone", taskId, name, recording, transcript),
	saveRecording: (bytes: Uint8Array): Promise<string> => ipcRenderer.invoke("recording:save", bytes),
	micAccess: (): Promise<string> => ipcRenderer.invoke("mic:access"),
	openMicSettings: (): Promise<void> => ipcRenderer.invoke("mic:settings"),
	cancel: (taskId: string): Promise<void> => ipcRenderer.invoke("task:cancel", taskId),
	onProgress: (listener: (p: TaskProgress) => void): (() => void) => {
		const handler = (_e: unknown, p: TaskProgress) => listener(p);
		ipcRenderer.on("task:progress", handler);
		return () => ipcRenderer.off("task:progress", handler);
	},

	pickImage: (): Promise<string | null> => ipcRenderer.invoke("dialog:pickImage"),
	chooseFolder: (current: string): Promise<string | null> => ipcRenderer.invoke("dialog:chooseFolder", current),
	folderDefaults: (): Promise<{ exportDir: string; downloadDir: string; libraryDir: string }> => ipcRenderer.invoke("folders:defaults"),
	openFolder: (dir: string): Promise<void> => ipcRenderer.invoke("shell:openFolder", dir),
	saveVideoDialog: (name: string): Promise<string | null> => ipcRenderer.invoke("dialog:saveVideo", name),
	importSrt: (): Promise<SourceCue[] | null> => ipcRenderer.invoke("srt:import"),
	exportSrt: (name: string, content: string): Promise<string | null> => ipcRenderer.invoke("srt:export", name, content),
	saveProject: (project: Project, path: string | null): Promise<string | null> => ipcRenderer.invoke("project:save", project, path),
	openProject: (): Promise<{ project: Project; path: string } | null> => ipcRenderer.invoke("project:open"),
	readProject: (path: string): Promise<Project> => ipcRenderer.invoke("project:read", path),

	// Batch
	readBatch: (): Promise<BatchState> => ipcRenderer.invoke("batch:read"),
	writeBatch: (state: BatchState): Promise<void> => ipcRenderer.invoke("batch:write", state),
	pickBatchProjects: (): Promise<string[]> => ipcRenderer.invoke("batch:pickProjects"),
	batchExportPath: (projectPath: string, format: PostFormat): Promise<string> => ipcRenderer.invoke("batch:exportPath", projectPath, format),

	// Download Center
	listDownloads: (text: string): Promise<ListedSource[]> => ipcRenderer.invoke("downloads:list", text),
	listMoreDownloads: (url: string, start: number): Promise<ListedSource> => ipcRenderer.invoke("downloads:listMore", url, start),
	downloadTitles: (urls: string[]): Promise<FilledTitle[]> => ipcRenderer.invoke("downloads:titles", urls),
	addDownloads: (videos: ListedVideo[], group: string, groupSize: number | undefined): Promise<number> => ipcRenderer.invoke("downloads:add", videos, group, groupSize),
	downloadState: (): Promise<DownloadCenterState> => ipcRenderer.invoke("downloads:state"),
	retryDownload: (id: string): Promise<void> => ipcRenderer.invoke("downloads:retry", id),
	retryFailedDownloads: (): Promise<void> => ipcRenderer.invoke("downloads:retryFailed"),
	cancelDownload: (id: string): Promise<void> => ipcRenderer.invoke("downloads:cancel", id),
	removeDownload: (id: string): Promise<void> => ipcRenderer.invoke("downloads:remove", id),
	clearFinishedDownloads: (): Promise<void> => ipcRenderer.invoke("downloads:clearFinished"),
	setDownloadOptions: (options: Partial<DownloadOptions>): Promise<DownloadCenterState> => ipcRenderer.invoke("downloads:setOptions", options),
	pauseDownloads: (paused: boolean): Promise<void> => ipcRenderer.invoke("downloads:pause", paused),
	showDownload: (id: string): Promise<void> => ipcRenderer.invoke("downloads:show", id),
	pickImport: (kind: "files" | "folder"): Promise<ImportPick | null> => ipcRenderer.invoke("downloads:pickImport", kind),
	importProjects: (files: { media: MediaItem; index: number }[], group: string, groupSize: number): Promise<number> => ipcRenderer.invoke("downloads:import", files, group, groupSize),
	downloadPlatforms: (): Promise<{ name: string; broken: boolean }[]> => ipcRenderer.invoke("downloads:platforms"),
	onDownloads: (listener: (state: DownloadCenterState) => void): (() => void) => {
		const handler = (_e: unknown, state: DownloadCenterState) => listener(state);
		ipcRenderer.on("downloads:update", handler);
		return () => ipcRenderer.off("downloads:update", handler);
	},
	// Notifications: a system notification (the main process checks the settings), entries from the main process, and clicks.
	notifySystem: (notice: SystemNotice): Promise<boolean> => ipcRenderer.invoke("notify:system", notice),
	/** Plays a notification sound (true on the Mac; elsewhere false, and the window plays its own chime). */
	notifySound: (name: string): Promise<boolean> => ipcRenderer.invoke("notify:sound", name),
	openNotificationSettings: (): Promise<void> => ipcRenderer.invoke("notify:openSystemSettings"),
	/** The unread count on the Dock icon. */
	setBadge: (count: number): Promise<void> => ipcRenderer.invoke("notify:badge", count),
	/** Shows notify.log in Finder. */
	showNotifyLog: (): Promise<void> => ipcRenderer.invoke("notify:showLog"),
	onNotice: (listener: (notice: MainNotice) => void): (() => void) => {
		const handler = (_e: unknown, notice: MainNotice) => listener(notice);
		ipcRenderer.on("notify:entry", handler);
		return () => ipcRenderer.off("notify:entry", handler);
	},
	onNoticeClicked: (listener: (id: string) => void): (() => void) => {
		const handler = (_e: unknown, id: string) => listener(id);
		ipcRenderer.on("notify:clicked", handler);
		return () => ipcRenderer.off("notify:clicked", handler);
	},
	autosave: (project: Project, path: string | null): Promise<void> => ipcRenderer.invoke("autosave:write", project, path),
	readAutosave: (): Promise<{ project: Project; path: string | null } | null> => ipcRenderer.invoke("autosave:read"),
	showInFolder: (path: string): Promise<void> => ipcRenderer.invoke("shell:show", path),
	openExternal: (url: string): Promise<void> => ipcRenderer.invoke("shell:open", url),
};

export type KromaApi = typeof api;
contextBridge.exposeInMainWorld("kromaPlatform", process.platform);
contextBridge.exposeInMainWorld("kroma", api);
