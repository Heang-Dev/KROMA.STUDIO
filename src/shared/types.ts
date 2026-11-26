// Types shared by the main process, the preload bridge and the editor UI.

export type Aspect = "16:9" | "9:16" | "1:1";
export type FitMode = "blur" | "black" | "fill";

export interface MediaItem {
	id: string;
	path: string;
	name: string;
	duration: number;
	width: number;
	height: number;
	hasAudio: boolean;
	/** Where it came from, when downloaded from a link. */
	sourceUrl?: string;
	/** Subtitle files the site provided, by language code (absolute paths to .srt). */
	siteSubtitles?: Record<string, string>;
}

/** A piece of a media item placed on the main track. Clips play back to back. */
export interface Clip {
	id: string;
	mediaId: string;
	/** Start and end inside the media, in seconds. */
	in: number;
	out: number;
}

/** One subtitle line, timed on the timeline (not the source media). */
export interface Cue {
	id: string;
	start: number;
	end: number;
	/** Original line (e.g. Chinese). */
	source: string;
	/** Translated line (Khmer). Empty until translated. */
	text: string;
}

export interface SubtitleStyle {
	/** Font size as a fraction of the output height (0.05 = 5 %). */
	size: number;
	color: string;
	outlineColor: string;
	/** Outline width as a fraction of the font size. */
	outline: number;
	/** Semi-transparent box behind the text. */
	box: boolean;
	boxColor: string;
	/** Vertical position of the text's bottom edge, 0 (top) .. 1 (bottom). */
	position: number;
	/** Show the original line above the Khmer one. */
	showSource: boolean;
	bold: boolean;
}

export interface Project {
	version: 1;
	name: string;
	aspect: Aspect;
	fit: FitMode;
	media: MediaItem[];
	clips: Clip[];
	cues: Cue[];
	style: SubtitleStyle;
	/** Notes for the translator: show name, characters, tone. Improves names and terms. */
	context: string;
	/** Khmer voice-over. Missing in projects made before voice-over existed. */
	voice?: VoiceSettings;
}

/** Timeline pictures and waveform for one video (made once, cached). */
export interface MediaVisuals {
	thumbs: { interval: number; files: string[] };
	peaksPerSecond: number;
	/** Loudness 0–255, peaksPerSecond values per second. */
	peaks: number[];
}

export interface VoiceLine {
	path: string;
	duration: number;
	/** The Khmer text it speaks; when the cue's text changes the line is stale. */
	text: string;
}

export interface VoiceSettings {
	enabled: boolean;
	voice: string;
	/** Speaking speed change in percent (-30..+50). */
	rate: number;
	/** Original audio volume under the voice, 0..1. */
	originalVolume: number;
	lines: Record<string, VoiceLine>;
}

export const KHMER_VOICES = [
	{ id: "km-KH-SreymomNeural", label: "Sreymom (female)" },
	{ id: "km-KH-PisethNeural", label: "Piseth (male)" },
] as const;

export const DEFAULT_VOICE: VoiceSettings = { enabled: false, voice: "km-KH-SreymomNeural", rate: 10, originalVolume: 0.15, lines: {} };

export interface Settings {
	/** Who translates to Khmer and writes the posts. */
	translateProvider: TranslateProvider;
	anthropicKey: string;
	/** Claude model. */
	translateModel: string;
	geminiKey: string;
	geminiModel: string;
	/** Speech to text: Gemini (your Gemini key) or a Whisper endpoint (Groq / OpenAI). */
	asrProvider: AsrProvider;
	asrBaseUrl: string;
	asrKey: string;
	asrModel: string;
	/** Parallel requests for transcription and translation. */
	concurrency: number;
	/** Browser whose logins yt-dlp may use (chrome, safari, firefox, edge, brave), or "" for none. */
	cookiesBrowser: string;
	/** Light, dark, or follow the Mac. */
	theme: Appearance;
	/** Interface zoom, like a browser's ⌘+ / ⌘−: 1 = 100 %. */
	uiZoom: number;
}

export type Appearance = "system" | "light" | "dark";

export type TranslateProvider = "gemini" | "google" | "claude";
export type AsrProvider = "gemini" | "whisper";

export interface SettingsView extends Omit<Settings, "anthropicKey" | "asrKey" | "geminiKey"> {
	hasAnthropicKey: boolean;
	hasGeminiKey: boolean;
	hasAsrKey: boolean;
}

export interface SourceCue {
	start: number;
	end: number;
	text: string;
}

export interface TaskProgress {
	taskId: string;
	/** 0..1, or -1 when unknown. */
	progress: number;
	message: string;
}

export interface DownloadResult {
	media: MediaItem;
	title: string;
}

export interface CaptionRequest {
	transcript: string;
	title: string;
	context: string;
}

export interface PlatformCaption {
	platform: "YouTube" | "Facebook" | "TikTok";
	title: string;
	description: string;
	hashtags: string[];
}

export interface ExportRequest {
	outPath: string;
	width: number;
	height: number;
	fit: FitMode;
	clips: { path: string; in: number; out: number; hasAudio: boolean }[];
	/** Subtitle images, already drawn by the editor: PNG bytes of a band, shown from start to end. */
	overlays: { start: number; end: number; png: Uint8Array }[];
	/** Height and top of the subtitle band in output pixels. */
	bandTop: number;
	bandHeight: number;
	quality: "fast" | "high";
	/** Khmer voice-over lines to mix in, timed on the timeline. */
	voice?: { lines: VoiceCue[]; originalVolume: number };
}

export interface VoiceCue {
	/** The subtitle cue it speaks. */
	id: string;
	start: number;
	/** When the next line starts (or the video ends): the line may speak until then. */
	slotEnd: number;
	path: string;
	duration: number;
}

export const DEFAULT_STYLE: SubtitleStyle = {
	size: 0.052,
	color: "#ffffff",
	outlineColor: "#000000",
	outline: 0.12,
	box: false,
	boxColor: "rgba(0,0,0,0.55)",
	position: 0.9,
	showSource: false,
	bold: true,
};

export const DEFAULT_SETTINGS: Settings = {
	translateProvider: "gemini",
	anthropicKey: "",
	translateModel: "claude-opus-5-5",
	geminiKey: "",
	// An alias Google keeps pointed at its current Flash model, so it never goes stale.
	geminiModel: "gemini-flash-latest",
	asrProvider: "gemini",
	asrBaseUrl: "https://api.groq.com/openai/v1",
	asrKey: "",
	asrModel: "whisper-large-v3",
	concurrency: 4,
	cookiesBrowser: "",
	theme: "dark",
	uiZoom: 0.9,
};

export const UI_ZOOM_STEPS = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4] as const;

export const ASPECT_SIZE: Record<Aspect, { width: number; height: number }> = {
	"16:9": { width: 1920, height: 1080 },
	"9:16": { width: 1080, height: 1920 },
	"1:1": { width: 1080, height: 1080 },
};
