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
	/** Who says it (a name from the project's cast); none means the default voice. */
	speaker?: string;
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
	/** Things on top of the video: blur boxes (to hide burned-in subtitles), logos, text. */
	objects?: VideoObject[];
	/** The language the subtitles are translated into (see shared/languages). Khmer when missing. */
	language?: string;
	/** The social posts written for this video (kept so they can be edited and posted later). */
	posts?: PlatformCaption[];
	/** Where this video was posted, newest last. */
	published?: PublishRecord[];
	/** The last export, reused for posting while the project hasn't changed since. */
	lastExport?: { path: string; fingerprint: string };
	/** The latest export of each format (16:9, 9:16), reused for posting while it still matches the project. */
	exports?: Partial<Record<Aspect, { path: string; fingerprint: string }>>;
}

/**
 * A layer over the video, placed in the output frame: x, y, w, h are fractions of the frame (0–1).
 * Shown for the whole video unless start/end (timeline seconds) are set.
 */
export interface VideoObject {
	id: string;
	kind: "blur" | "image" | "text";
	name: string;
	x: number;
	y: number;
	w: number;
	h: number;
	start?: number;
	end?: number;
	hidden?: boolean;
	/** 0–1 (images and text). */
	opacity: number;
	/** Blur strength 1–40 (blur boxes). */
	blur?: number;
	/** Image file (images). */
	path?: string;
	/** Text, its colour and an optional background (text). */
	text?: string;
	color?: string;
	background?: string;
	bold?: boolean;
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
	/** The voice (and speed) it was spoken with, see voiceKey; a different one makes it stale. */
	voice?: string;
}

/** A character in the video and the voice that speaks their lines. */
export interface CastMember {
	name: string;
	voice: string;
	/** Who they are, e.g. "young woman, the host". */
	description?: string;
}

export interface VoiceSettings {
	enabled: boolean;
	voice: string;
	/** Speaking speed change in percent (-30..+50). */
	rate: number;
	/** Original audio volume under the voice, 0..1. */
	originalVolume: number;
	lines: Record<string, VoiceLine>;
	/** Replace the original voices: their sound minus the speech (music and effects) goes under the Khmer voice. */
	removeVoices?: boolean;
	separation?: "fast" | "best";
	/** Music & effects volume when the voices are removed, 0..1. */
	backgroundVolume?: number;
	/** Voice-free sound per media id (made by removeVoices). */
	backgrounds?: Record<string, string>;
	/** The characters, in order (their colour follows it); lines with a speaker use that character's voice. */
	cast?: CastMember[];
}

/** Microsoft's instant Khmer voices. Other voice ids: "kvs-design:<preset>" and "kvs-clone:<id>" (Kroma's voice engine). */
export const KHMER_VOICES = [
	{ id: "km-KH-SreymomNeural", label: "Sreymom (female)" },
	{ id: "km-KH-PisethNeural", label: "Piseth (male)" },
] as const;

export const isKvsVoice = (voice: string) => voice.startsWith("kvs-");

/** The voice engine's templates, shown even while the engine is off (the engine's own list replaces this when it's on). */
export const KVS_TEMPLATES: { name: string; description: string }[] = [
	{ name: "Storyteller (warm grandfather)", description: "An elderly Cambodian grandfather, an old man with a low, warm, slow and gentle male storytelling voice" },
	{ name: "Storyteller (kind grandmother)", description: "An elderly Cambodian grandmother, an old woman with a soft, kind, calm female voice, clearly a woman" },
	{ name: "Narrator (deep male)", description: "A middle-aged man with a deep, clear, confident male narrator voice" },
	{ name: "Narrator (clear female)", description: "A young woman with a clear, bright and friendly female narrator voice" },
	{ name: "News anchor (male)", description: "A professional adult male news anchor, a man with a low, formal male voice and a steady pace" },
	{ name: "News anchor (female)", description: "A professional adult female news anchor, a woman with a formal female voice and a steady pace" },
	{ name: "Young boy", description: "A cheerful ten-year-old boy, a child with a high-pitched, energetic young voice" },
	{ name: "Young girl", description: "A sweet eight-year-old girl, a child with a high, playful young voice" },
	{ name: "Villain (dark, slow)", description: "A menacing man with a dark, low, raspy and slow male voice" },
	{ name: "Ghost story (whisper)", description: "A mysterious woman whispering softly, suspenseful female voice" },
	{ name: "King (majestic)", description: "A powerful middle-aged king, a man with a deep, commanding, majestic and slow male voice full of authority" },
	{ name: "Queen (elegant)", description: "A graceful noble queen, a mature woman with an elegant, calm and dignified female voice" },
	{ name: "Empress dowager (stern)", description: "A stern elderly empress dowager, an old woman with a cold, slow and commanding female voice" },
	{ name: "Prince (young noble)", description: "A young prince in his twenties, a man with a clear, confident and refined male voice" },
	{ name: "Princess (gentle)", description: "A gentle young princess, a young woman with a soft, sweet and graceful female voice" },
	{ name: "General (bold warrior)", description: "A middle-aged army general, clearly a man with a very deep, low, rough and commanding male voice, calm and steady" },
	{ name: "Eunuch (palace servant)", description: "A palace eunuch, a man with a thin, high, sly and slightly nasal voice who speaks very politely" },
	{ name: "Young man (hero)", description: "A brave young man in his twenties, clearly a grown man (not a woman or a child) with a warm, clear, medium-low and energetic male voice" },
	{ name: "Young woman (heroine)", description: "A kind young woman in her twenties, a woman with a bright, clear and lively female voice" },
	{ name: "Maid (timid servant)", description: "A timid young maid, a young woman with a small, polite and slightly nervous female voice" },
	{ name: "Old monk (wise)", description: "A wise elderly Buddhist monk, an old man with a calm, slow, peaceful and kind male voice" },
	{ name: "Mother (caring)", description: "A caring middle-aged mother, a woman with a warm, gentle and motherly female voice" },
	{ name: "Father (strict)", description: "A strict middle-aged father, a man with a firm, steady and serious male voice" },
	{ name: "Emperor (cold)", description: "A young emperor in his twenties, a man with a cold, calm and authoritative male voice" },
	{ name: "Concubine (scheming)", description: "A scheming palace concubine, a young woman with a sweet but sly and flirtatious female voice" },
	{ name: "Minister (old official)", description: "An elderly court minister, an old man with a careful, polite and slightly hoarse male voice" },
	{ name: "Assassin (cold killer)", description: "A cold assassin, a man with a quiet, flat, emotionless and low male voice" },
	{ name: "Swordswoman (fierce)", description: "A fierce female warrior, a young woman with a strong, confident and sharp female voice" },
	{ name: "Old man (village elder)", description: "A village elder, an old man with a rough, slow and kind male voice" },
	{ name: "Shopkeeper (cheerful)", description: "A friendly middle-aged shopkeeper, clearly a man with a deep, warm, relaxed and chatty male voice" },
	{ name: "Rich young master (arrogant)", description: "An arrogant rich young master, a young man with a proud, mocking and lazy male voice" },
	{ name: "CEO (cold boss)", description: "A rich company boss in his thirties, a man with a deep, calm, confident and slightly cold male voice" },
	{ name: "Secretary (office woman)", description: "A capable young office woman, a woman with a clear, polite and professional female voice" },
	{ name: "Teenage boy (cheeky)", description: "A teenage boy of about fifteen, a boy with a casual, cheeky voice that is just starting to break" },
	{ name: "Teenage girl (cheerful)", description: "A teenage girl of about fifteen, a girl with a bright, quick and cheerful voice" },
	{ name: "Villainess (cruel)", description: "A cruel and cunning woman, a middle-aged villainess with a sharp, cold and mocking female voice" },
];

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
	/** Where finished videos and subtitle files go ("" = Movies/Kroma Studio/Exports). */
	exportDir: string;
	/** Show the Save dialog for every export instead of saving straight into exportDir. */
	askExportPath: boolean;
	/** Where videos downloaded from links go ("" = Movies/Kroma Studio/downloads). */
	downloadDir: string;
	/** Kroma's voice engine (cloned / designed voices): its address (this computer, or Colab) and optional token. */
	kvsUrl: string;
	kvsToken: string;
	/** Start the engine on this computer when Kroma opens (when the address is this computer). */
	kvsAutoStart: boolean;
	/** Light, dark, or follow the Mac. */
	theme: Appearance;
	/** Interface zoom, like a browser's ⌘+ / ⌘−: 1 = 100 %. */
	uiZoom: number;
	/** Upload-Post (upload-post.com) API key, for posting to YouTube, Facebook and TikTok in one click. */
	postKey: string;
	/** The Upload-Post profile whose connected accounts Kroma posts to. */
	postProfile: string;
	/** The Facebook Page videos are posted to. */
	facebookPageId: string;
	/** Download new versions in the background and offer "Restart to update". */
	autoUpdate: boolean;
	/** System notifications when work finishes or fails while Kroma is in the background (Settings → Notifications). */
	notifySystem: boolean;
	/** Only failures show a system notification. */
	notifyOnlyErrors: boolean;
	/** System notifications play the system sound. */
	notifySound: boolean;
	/** Which work notifies (system notification, and a toast when it worked); all of it still goes into the bell. */
	notifyDownloads: boolean;
	notifySubtitles: boolean;
	notifyVoices: boolean;
	notifyExport: boolean;
	notifyUpdates: boolean;
}

export type Appearance = "system" | "light" | "dark";

export type TranslateProvider = "gemini" | "google" | "claude";
export type AsrProvider = "gemini" | "whisper";

export interface KvsStatus {
	online: boolean;
	/** Set by kvs:status: whether the engine runs on this computer, whether it's installed (or being installed), why
	 * Kroma can't start it, and whether Kroma started the one running. */
	local?: boolean;
	installed?: "installed" | "outdated" | "missing";
	installing?: boolean;
	cannotStart?: string | null;
	startedByKroma?: boolean;
	device?: string;
	busy?: number;
	error?: string;
	presets: { name: string; description: string }[];
}

/** Story studio: what to speak. `speakers` maps each speaker of the script to a voice ("kvs-clone:<id>",
 * "kvs-design:<template>" or "default") and a style (e.g. "excited"; a line's own `(style)` wins for that line). */
export interface StoryRequest {
	title: string;
	script: string;
	speakers: Record<string, { voice: string; style: string }>;
}

/** A story spoken by the voice engine, kept in the library. `cues` are the engine's `[start, end, text]`, one per spoken line. */
export interface StoryRecord extends StoryRequest {
	id: string;
	cues: [number, number, string][];
	seconds: number;
	created: number;
	/** Set on a story made by redoing one line of another (0-based). */
	redoneLine?: number;
	/** story.mp3 (or .wav) and story.srt on disk. */
	audio?: string;
	srt?: string;
}

/** A cloned voice kept on this computer for the voice engine. */
export interface KvsVoice {
	id: string;
	name: string;
	transcript: string;
	seconds: number;
	created: number;
	/** Set when this is the saved sample of a voice template (a preset voice). */
	preset?: string;
	/** The recording (clones) or saved sample (templates). */
	path?: string;
	/** Set on voices imported by older Kroma versions (kept so they still load). */
	kvsId?: number;
}

export interface SettingsView extends Omit<Settings, "anthropicKey" | "asrKey" | "geminiKey" | "kvsToken" | "postKey"> {
	hasPostKey: boolean;
	hasKvsToken: boolean;
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
	/** The subtitles' language (Khmer when missing). */
	language?: string;
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
	/** audioPath: a separate sound for the clip (its voice-free background), timed like the video. */
	clips: { path: string; in: number; out: number; hasAudio: boolean; audioPath?: string }[];
	/** Subtitle images, already drawn by the editor: PNG bytes of a band, shown from start to end. */
	overlays: { start: number; end: number; png: Uint8Array }[];
	/** Height and top of the subtitle band in output pixels. */
	bandTop: number;
	bandHeight: number;
	quality: ExportQuality;
	/** Blur boxes and images (text objects arrive as PNG images drawn by the editor), in output pixels. */
	objects?: {
		blurs: { x: number; y: number; w: number; h: number; blur: number; start?: number; end?: number }[];
		images: { path?: string; png?: Uint8Array; x: number; y: number; w: number; h: number; opacity: number; start?: number; end?: number }[];
	};
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
	exportDir: "",
	askExportPath: false,
	downloadDir: "",
	kvsUrl: "http://127.0.0.1:7861",
	kvsAutoStart: false,
	kvsToken: "",
	theme: "dark",
	uiZoom: 0.9,	postKey: "",
	postProfile: "",
	facebookPageId: "",	autoUpdate: true,
	notifySystem: true,
	notifyOnlyErrors: false,
	notifySound: true,
	notifyDownloads: true,
	notifySubtitles: true,
	notifyVoices: true,
	notifyExport: true,
	notifyUpdates: true,
};

export const UI_ZOOM_STEPS = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4] as const;

export const ASPECT_SIZE: Record<Aspect, { width: number; height: number }> = {
	"16:9": { width: 1920, height: 1080 },
	"9:16": { width: 1080, height: 1920 },
	"1:1": { width: 1080, height: 1080 },
};

/** Groups for the preset voices (Voices page and pickers), in display order. */
export const VOICE_GROUPS: { title: string; names: string[] }[] = [
	{ title: "Narration", names: ["Narrator (deep male)", "Narrator (clear female)", "News anchor (male)", "News anchor (female)", "Storyteller (warm grandfather)", "Storyteller (kind grandmother)"] },
	{ title: "Palace & royalty", names: ["King (majestic)", "Emperor (cold)", "Queen (elegant)", "Empress dowager (stern)", "Prince (young noble)", "Princess (gentle)", "Concubine (scheming)", "Minister (old official)", "Eunuch (palace servant)", "Maid (timid servant)"] },
	{ title: "Heroes & fighters", names: ["Young man (hero)", "Young woman (heroine)", "General (bold warrior)", "Swordswoman (fierce)", "Assassin (cold killer)"] },
	{ title: "Modern drama", names: ["CEO (cold boss)", "Secretary (office woman)", "Rich young master (arrogant)", "Shopkeeper (cheerful)"] },
	{ title: "Family & elders", names: ["Father (strict)", "Mother (caring)", "Old man (village elder)", "Old monk (wise)"] },
	{ title: "Children & teens", names: ["Young boy", "Young girl", "Teenage boy (cheeky)", "Teenage girl (cheerful)"] },
	{ title: "Villains & mood", names: ["Villain (dark, slow)", "Villainess (cruel)", "Ghost story (whisper)"] },
];

/** Templates sorted into VOICE_GROUPS; any the groups don't name go under "More". */
export function groupTemplates<T extends { name: string }>(templates: T[]): { title: string; items: T[] }[] {
	const groups = VOICE_GROUPS.map((g) => ({ title: g.title, items: g.names.map((n) => templates.find((t) => t.name === n)).filter((t): t is T => Boolean(t)) }));
	const named = new Set(VOICE_GROUPS.flatMap((g) => g.names));
	const rest = templates.filter((t) => !named.has(t.name));
	return [...groups, { title: "More", items: rest }].filter((g) => g.items.length);
}

/** Export sizes. "fast" is the old name of "standard". */
export type ExportQuality = "small" | "standard" | "high" | "fast";

/** Rough average bitrates (video + sound, Mbit/s) per size and output height, for the size shown before exporting. */
export function exportMbps(quality: ExportQuality, height: number): number {
	const big = height >= 1080;
	if (quality === "small") return big ? 2 : 1.3;
	if (quality === "high") return big ? 4.5 : 3; // x264 at near-original quality: varies most with the video
	return big ? 4.2 : 2.7;
}

/** "about 75 MB" for a video of this length. */
export function estimateSize(quality: ExportQuality, height: number, seconds: number): string {
	const mb = (exportMbps(quality, height) * seconds) / 8;
	return mb >= 1000 ? `about ${(mb / 1000).toFixed(1)} GB` : `about ${Math.max(1, Math.round(mb / 5) * 5)} MB`;
}

// ── Posting (Upload-Post) ──

export type PublishPlatform = "youtube" | "facebook" | "tiktok";

export interface PostAccount {
	email: string;
	plan: string;
}

export interface PostProfile {
	username: string;
	displayName: string;
	/** The connected accounts on this profile, by platform. */
	accounts: Partial<Record<PublishPlatform, { name: string; handle?: string; needsReconnect?: boolean }>>;
}

export interface PublishRequest {
	video: string;
	/** A file per platform (each in its own format); platforms not named here get `video`. */
	videos?: Partial<Record<PublishPlatform, string>>;
	profile: string;
	platforms: PublishPlatform[];
	youtube?: { title: string; description: string; tags: string[]; privacy: "public" | "unlisted" | "private" };
	facebook?: { title: string; description: string; tags: string[]; pageId?: string; mediaType: "REELS" | "VIDEO" };
	tiktok?: { caption: string; tags: string[]; mode: "post" | "draft" };
	/** The same key for a retry, so a post never goes out twice. */
	idempotencyKey: string;
}

export interface PublishResult {
	platform: PublishPlatform;
	state: "working" | "done" | "failed";
	url?: string;
	message?: string;
}

export interface PublishRecord {
	at: number;
	results: PublishResult[];
}

// ── Updates ──

export interface UpdateState {
	status: "idle" | "checking" | "none" | "available" | "downloading" | "ready" | "error";
	/** The running version. */
	current: string;
	/** The new version, when there is one. */
	version?: string;
	/** Download progress 0–1. */
	progress?: number;
	/** While downloading: bytes a second (smoothed) and the seconds left, once they are known. */
	speed?: number;
	secondsLeft?: number;
	notes?: string;
	/** The release page. */
	url?: string;
	error?: string;
}
