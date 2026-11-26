import { useEffect, useState, type ComponentType } from "react";
import { CircleCheck, CircleX, Download, ExternalLink, FolderOpen, HardDrive, Info, Keyboard, Languages, type LucideIcon, Mic, Palette } from "lucide-react";
import { type Appearance, type Settings, type SettingsView, type TranslateProvider, UI_ZOOM_STEPS } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { applyAppearance } from "@/lib/appearance";
import { useEditor } from "@/state/store";
import { AppSelect, Card, ChoiceTiles, Group, Row, Segmented } from "../common";

// The settings registry. Each entry is one page in the settings nav; add a page by adding an entry here.

export type SettingsPatch = Partial<Record<keyof Settings, string | number | null>>;

export interface SectionProps {
	settings: SettingsView;
	save: (patch: SettingsPatch) => Promise<void>;
}

export interface SettingsSectionDef {
	id: string;
	group: string;
	title: string;
	icon: LucideIcon;
	/** Extra words the settings search matches. */
	keywords: string;
	component: ComponentType<SectionProps>;
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
	{ id: "translation", group: "AI services", title: "Translation", icon: Languages, keywords: "gemini google translate free claude anthropic api key model khmer translate opus sonnet haiku flash", component: TranslationSection },
	{ id: "speech", group: "AI services", title: "Speech to Text", icon: Mic, keywords: "gemini groq openai whisper transcribe speech api key endpoint", component: SpeechSection },
	{ id: "downloads", group: "Media", title: "Downloads", icon: Download, keywords: "yt-dlp cookies browser login bilibili douyin youtube 1080p", component: DownloadsSection },
	{ id: "storage", group: "Media", title: "Storage", icon: HardDrive, keywords: "library folder movies voice cache downloads finder", component: StorageSection },
	{ id: "appearance", group: "Interface", title: "Appearance", icon: Palette, keywords: "theme dark light system mac zoom size scale bigger smaller interface", component: AppearanceSection },
	{ id: "shortcuts", group: "Interface", title: "Shortcuts", icon: Keyboard, keywords: "keyboard keys split undo play", component: ShortcutsSection },
	{ id: "about", group: "Kroma", title: "About", icon: Info, keywords: "version ffmpeg yt-dlp tools", component: AboutSection },
];

// ── Sections ──

const MODELS = [
	{ value: "claude-opus-5-5", label: "Opus 5.5 · best Khmer" },
	{ value: "claude-sonnet-5-5", label: "Sonnet 5.5 · cheaper" },
	{ value: "claude-haiku-5-5", label: "Haiku 5.5 · cheapest" },
];

const PROVIDERS: { value: TranslateProvider; label: string; description: string }[] = [
	{ value: "gemini", label: "Gemini", description: "Free tier · good Khmer" },
	{ value: "google", label: "Google Translate", description: "Free · no key · basic" },
	{ value: "claude", label: "Claude", description: "Paid · best Khmer" },
];

function TranslationSection({ settings, save }: SectionProps) {
	const provider = settings.translateProvider;
	return (
		<>
			<Group title="Translator" description="Who turns the subtitles into Khmer. Gemini and Claude also write the social posts.">
				<ChoiceTiles label="Translator" columns={3} value={provider} options={PROVIDERS} onChange={(v) => void save({ translateProvider: v })} />
			</Group>

			{provider === "gemini" && (
				<Group title="Gemini" description="Free from Google AI Studio, no card needed. The free tier limits requests per minute (Kroma waits when it has to) and Google may use free-tier requests to improve its models.">
					<Card>
						<KeyRow label="API key" saved={settings.hasGeminiKey} placeholder="AIza…" keyUrl="https://aistudio.google.com/apikey" onSave={(v) => save({ geminiKey: v })} />
						<Row label="Model" description="Flash models are fast and free; Pro is better but has a smaller free limit." control={<GeminiModelSelect settings={settings} save={save} />} />
					</Card>
				</Group>
			)}

			{provider === "google" && (
				<Group title="Google Translate" description="Works straight away with no key. Translations are literal and don't use your notes or the earlier lines, so names and politeness may be off. Social posts need Gemini or Claude.">
					<Card>
						<Row label="Ready to use" description="Nothing to set up." control={<CircleCheck className="size-4 text-success" />} />
					</Card>
				</Group>
			)}

			{provider === "claude" && (
				<Group title="Claude" description="Paid by use (Anthropic API). The most natural Khmer, best with names and tone.">
					<Card>
						<KeyRow label="API key" saved={settings.hasAnthropicKey} placeholder="sk-ant-…" keyUrl="https://platform.claude.com/settings/keys" onSave={(v) => save({ anthropicKey: v })} />
						<Row label="Model" control={<AppSelect label="Model" className="w-56" value={settings.translateModel} options={MODELS} onChange={(v) => void save({ translateModel: v })} />} />
					</Card>
				</Group>
			)}

			<Group title="Speed">
				<Card>
					<Row
						label="Parallel requests"
						description="How many batches run at once, for translation and speech to text. Lower it if a service says you're sending too much."
						control={<Segmented label="Parallel requests" size="sm" value={String(settings.concurrency)} options={["2", "4", "6", "8"].map((v) => ({ value: v, label: v }))} onChange={(v) => void save({ concurrency: Number(v) })} />}
					/>
				</Card>
			</Group>
		</>
	);
}

/** Gemini models from the key's live list (new versions appear by themselves); the saved one stays listed. */
function GeminiModelSelect({ settings, save }: SectionProps) {
	const [models, setModels] = useState<{ value: string; label: string }[]>([]);
	useEffect(() => {
		if (!settings.hasGeminiKey) return setModels([]);
		window.kroma
			.geminiModels()
			.then((list) => setModels(list.map((m) => ({ value: m.id, label: m.label }))))
			.catch(() => setModels([]));
	}, [settings.hasGeminiKey]);
	const options = models.some((m) => m.value === settings.geminiModel) ? models : [{ value: settings.geminiModel, label: settings.geminiModel }, ...models];
	return <AppSelect label="Gemini model" className="w-56" value={settings.geminiModel} options={options} onChange={(v) => void save({ geminiModel: v })} />;
}

const ASR_PRESETS = [
	{ value: "https://api.groq.com/openai/v1", label: "Groq", description: "Fast, free to start", model: "whisper-large-v3", keyUrl: "https://console.groq.com/keys" },
	{ value: "https://api.openai.com/v1", label: "OpenAI", description: "Whisper", model: "whisper-1", keyUrl: "https://platform.openai.com/api-keys" },
];

const SPEECH_SERVICES = [
	{ value: "gemini", label: "Gemini", description: "Your Gemini key · accurate" },
	{ value: "https://api.groq.com/openai/v1", label: "Groq", description: "Free key · fastest" },
	{ value: "https://api.openai.com/v1", label: "OpenAI", description: "Paid · Whisper" },
];

function SpeechSection({ settings, save }: SectionProps) {
	const choice = settings.asrProvider === "gemini" ? "gemini" : (ASR_PRESETS.find((p) => p.value === settings.asrBaseUrl)?.value ?? "custom");
	const preset = ASR_PRESETS.find((p) => p.value === settings.asrBaseUrl);
	return (
		<>
			<Group title="Service" description="Turns the video's speech into timed lines when the site has no subtitles. Runs in the cloud, several parts at once.">
				<ChoiceTiles
					label="Speech-to-text service"
					columns={3}
					value={choice}
					options={SPEECH_SERVICES}
					onChange={(v) => void (v === "gemini" ? save({ asrProvider: "gemini" }) : save({ asrProvider: "whisper", asrBaseUrl: v, asrModel: ASR_PRESETS.find((p) => p.value === v)?.model ?? settings.asrModel }))}
				/>
			</Group>

			{settings.asrProvider === "gemini" ? (
				<Group title="Gemini" description="Uses the Gemini key from Settings → Translation, so there's nothing else to set up. Very accurate, with punctuation; about a minute per 2 minutes of speech, so for long movies Groq is faster.">
					<Card>
						<Row
							label="Gemini key"
							description={settings.hasGeminiKey ? "Ready." : "Add it in Settings → Translation."}
							control={
								settings.hasGeminiKey ? (
									<CircleCheck className="size-4 text-success" />
								) : (
									<Button variant="outline" size="sm" onClick={() => useEditor.getState().openSettings("translation")}>
										Add key
									</Button>
								)
							}
						/>
					</Card>
				</Group>
			) : (
				<>
					<Group title={preset?.label ?? "Whisper service"} description={preset?.label === "Groq" ? "Whisper large-v3 on Groq's servers: a whole movie in about a minute. Free key." : "Any OpenAI-compatible transcription endpoint."}>
						<Card>
							<KeyRow label="API key" saved={settings.hasAsrKey} placeholder={preset?.label === "OpenAI" ? "sk-…" : "gsk_…"} keyUrl={preset?.keyUrl} onSave={(v) => save({ asrKey: v })} />
						</Card>
					</Group>
					<Group title="Advanced">
						<Card>
							<Row label="Endpoint" control={<DraftInput className="w-72" value={settings.asrBaseUrl} onCommit={(v) => void save({ asrBaseUrl: v })} />} />
							<Row label="Model" control={<DraftInput className="w-72" value={settings.asrModel} onCommit={(v) => void save({ asrModel: v })} />} />
						</Card>
					</Group>
				</>
			)}
		</>
	);
}

const BROWSERS = [
	{ value: "", label: "None · public videos only" },
	{ value: "chrome", label: "Chrome" },
	{ value: "safari", label: "Safari" },
	{ value: "firefox", label: "Firefox" },
	{ value: "edge", label: "Edge" },
	{ value: "brave", label: "Brave" },
];

function DownloadsSection({ settings, save }: SectionProps) {
	return (
		<Group title="Logins" description="Sites like Bilibili only give 1080p, and some videos only play, when you're signed in.">
			<Card>
				<Row
					label="Use my logins from"
					description="Sign in to the site in that browser first. Your Mac may ask to allow access; Safari also needs Full Disk Access."
					control={<AppSelect label="Browser logins" className="w-52" value={settings.cookiesBrowser} options={BROWSERS} onChange={(v) => void save({ cookiesBrowser: v })} />}
				/>
			</Card>
		</Group>
	);
}

function StorageSection() {
	const [dir, setDir] = useState("");
	useEffect(() => {
		void window.kroma.info().then((i) => setDir(i.libraryDir));
	}, []);
	return (
		<Group title="Library" description="Downloads, the voice-over cache and saved projects live here.">
			<Card>
				<Row
					label="Library folder"
					description={<span className="font-mono">{dir}</span>}
					control={
						<Button variant="outline" size="sm" onClick={() => void window.kroma.showInFolder(`${dir}/downloads`)}>
							<FolderOpen /> Show in Finder
						</Button>
					}
				/>
			</Card>
		</Group>
	);
}

const APPEARANCES: { value: Appearance; label: string }[] = [
	{ value: "dark", label: "Dark" },
	{ value: "light", label: "Light" },
	{ value: "system", label: "System" },
];

function AppearanceSection({ settings, save }: SectionProps) {
	return (
		<>
		<Group title="Size">
			<Card>
				<Row
					label="Interface size"
					description={
						<>
							Like zooming a web page. Also <Kbd>⌘</Kbd> <Kbd>+</Kbd> / <Kbd>⌘</Kbd> <Kbd>−</Kbd>, and <Kbd>⌘</Kbd> <Kbd>0</Kbd> for 100%.
						</>
					}
					control={
						<Segmented
							label="Interface size"
							size="sm"
							value={String(settings.uiZoom)}
							options={UI_ZOOM_STEPS.map((z) => ({ value: String(z), label: `${Math.round(z * 100)}%` }))}
							onChange={(v) => void window.kroma.setZoom(Number(v))}
						/>
					}
				/>
			</Card>
		</Group>
		<Group title="Theme">
			<Card>
				<Row
					label="Theme"
					description="System follows your Mac's setting."
					control={
						<Segmented
							label="Theme"
							value={settings.theme}
							options={APPEARANCES}
							onChange={(v) => {
								applyAppearance(v);
								void save({ theme: v });
							}}
						/>
					}
				/>
			</Card>
		</Group>
		</>
	);
}

const SHORTCUTS: [string, string[]][] = [
	["Play / pause", ["Space"]],
	["Split clip at the playhead", ["S"]],
	["Delete the selection", ["⌫"]],
	["Step one frame", ["←", "→"]],
	["Jump 5 seconds", ["⇧", "← →"]],
	["Undo", ["⌘", "Z"]],
	["Redo", ["⇧", "⌘", "Z"]],
	["New project", ["⌘", "N"]],
	["Open project", ["⌘", "O"]],
	["Save project", ["⌘", "S"]],
	["Settings", ["⌘", ","]],
	["Bigger interface", ["⌘", "+"]],
	["Smaller interface", ["⌘", "−"]],
	["Interface at 100%", ["⌘", "0"]],
	["Zoom the timeline", ["⌘", "scroll"]],
];

function ShortcutsSection() {
	return (
		<Group title="Editor">
			<Card>
				{SHORTCUTS.map(([label, keys]) => (
					<Row
						key={label}
						label={label}
						control={
							<span className="flex gap-1">
								{keys.map((k) => (
									<Kbd key={k}>{k}</Kbd>
								))}
							</span>
						}
					/>
				))}
			</Card>
		</Group>
	);
}

function AboutSection() {
	const [info, setInfo] = useState<Awaited<ReturnType<typeof window.kroma.info>> | null>(null);
	useEffect(() => {
		void window.kroma.info().then(setInfo);
	}, []);
	if (!info) return null;
	const tools: [string, boolean, string][] = [
		["FFmpeg", info.tools.ffmpeg && info.tools.ffprobe, "brew install ffmpeg"],
		["yt-dlp", info.tools.ytdlp, "brew install yt-dlp"],
	];
	return (
		<>
			<Group title="About">
				<Card>
					<Row label={`Kroma Studio ${info.version}`} description="Turns Chinese and online videos into Khmer-subtitled posts for YouTube, Facebook and TikTok." />
				</Card>
			</Group>
			<Group title="Tools" description="Installed on this Mac with Homebrew; Kroma finds them on its own.">
				<Card>
					{tools.map(([name, ok, install]) => (
						<Row
							key={name}
							label={name}
							description={ok ? undefined : <span className="font-mono">{install}</span>}
							control={
								ok ? (
									<Badge variant="secondary" className="gap-1">
										<CircleCheck className="text-success" /> Installed
									</Badge>
								) : (
									<Badge variant="destructive" className="gap-1">
										<CircleX /> Missing
									</Badge>
								)
							}
						/>
					))}
				</Card>
			</Group>
		</>
	);
}

// ── Controls ──

/** An API key row: never shows the saved key; type a new one and save, or remove it. */
function KeyRow({ label, saved, placeholder, keyUrl, onSave }: { label: string; saved: boolean; placeholder: string; keyUrl?: string; onSave: (value: string | null) => Promise<void> }) {
	const [draft, setDraft] = useState("");
	const [editing, setEditing] = useState(!saved);
	useEffect(() => setEditing(!saved), [saved]);
	return (
		<Row
			label={
				<span className="flex items-center gap-2">
					{label}
					{saved && (
						<Badge variant="secondary" className="gap-1 text-[10px]">
							<CircleCheck className="text-success" /> Saved
						</Badge>
					)}
				</span>
			}
			description={
				keyUrl && (
					<button type="button" className="inline-flex items-center gap-1 underline-offset-2 hover:text-foreground hover:underline" onClick={() => void window.kroma.openExternal(keyUrl)}>
						Get a key <ExternalLink className="size-3" />
					</button>
				)
			}
			control={
				editing ? (
					<form
						className="flex gap-1.5"
						onSubmit={(e) => {
							e.preventDefault();
							if (!draft.trim()) return;
							void onSave(draft.trim()).then(() => setDraft(""));
						}}
					>
						<Input type="password" className="h-8 w-56 text-xs" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={label} autoComplete="off" />
						<Button type="submit" size="sm" disabled={!draft.trim()}>
							Save
						</Button>
						{saved && (
							<Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
								Cancel
							</Button>
						)}
					</form>
				) : (
					<span className="flex gap-1.5">
						<Button variant="outline" size="sm" onClick={() => setEditing(true)}>
							Replace
						</Button>
						<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void onSave(null)}>
							Remove
						</Button>
					</span>
				)
			}
		/>
	);
}

/** A text field that saves when you leave it or press Enter. */
function DraftInput({ value, onCommit, className }: { value: string; onCommit: (v: string) => void; className?: string }) {
	const [draft, setDraft] = useState(value);
	useEffect(() => setDraft(value), [value]);
	const commit = () => draft.trim() && draft !== value && onCommit(draft.trim());
	return <Input className={`h-8 text-xs ${className ?? ""}`} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />;
}
