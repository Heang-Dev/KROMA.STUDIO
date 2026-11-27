import { useEffect, useState, type ComponentType } from "react";
import { AudioLines, CircleCheck, CircleX, Download, Loader2, Power, RefreshCw, ExternalLink, FolderOpen, HardDrive, Info, Keyboard, Languages, type LucideIcon, Mic, Palette, Send } from "lucide-react";
import { type Appearance, type KvsStatus, type PostAccount, type PostProfile, type PublishPlatform, type Settings, type SettingsView, type TranslateProvider, UI_ZOOM_STEPS } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { keyCaps } from "@/lib/platform";
import { applyAppearance } from "@/lib/appearance";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { useUpdateState } from "../UpdateButton";
import { AppSelect, Card, ChoiceTiles, Group, Row, Segmented, SwitchRow } from "../common";

// The settings registry. Each entry is one page in the settings nav; add a page by adding an entry here.

export type SettingsPatch = Partial<Record<keyof Settings, string | number | boolean | null>>;

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
	{ id: "voice-engine", group: "AI services", title: "Voice Engine", icon: AudioLines, keywords: "kvs khmer voice studio clone design voxcpm colab gpu token engine", component: VoiceEngineSection },
	{ id: "posting", group: "Social", title: "Posting", icon: Send, keywords: "upload post youtube facebook tiktok social connect accounts api key publish auto", component: PostingSection },
	{ id: "downloads", group: "Media", title: "Downloads", icon: Download, keywords: "yt-dlp cookies browser login bilibili douyin youtube 1080p", component: DownloadsSection },
	{ id: "folders", group: "Media", title: "Folders", icon: HardDrive, keywords: "export folder save location downloads library finder path", component: FoldersSection },
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

const LOCAL_ENGINE = "http://127.0.0.1:7861";
const COLAB_NOTEBOOK = "engine/colab/KhmerVoiceStudio_Colab.ipynb";
const isLocal = (url: string) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/?$/i.test(url.trim());
const deviceName = (device?: string) => (device === "cuda" ? "a GPU" : device === "mps" ? "this Mac's Apple GPU" : device === "cpu" ? "this computer's processor (slow)" : (device ?? "unknown"));

/** A numbered step in a how-to list. */
function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
	return (
		<div className="flex gap-3 py-3">
			<span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums">{n}</span>
			<div className="min-w-0 flex-1 space-y-1.5">
				<p className="text-[13px]">{title}</p>
				{children && <div className="text-xs leading-relaxed text-muted-foreground">{children}</div>}
			</div>
		</div>
	);
}

/**
 * The Khmer Voice Studio engine: what it is, whether it's on, and how to turn it on (Start here, or a Colab GPU).
 * Kroma can start it on this computer from the KVS folder; see src/main/engine.ts.
 */
function VoiceEngineSection({ settings, save }: SectionProps) {
	const [status, setStatus] = useState<KvsStatus | null>(null);
	const [checking, setChecking] = useState(false);
	const [starting, setStarting] = useState(false);
	const [startError, setStartError] = useState<string | null>(null);
	const local = isLocal(settings.kvsUrl);
	const check = () => {
		setChecking(true);
		void window.kroma
			.kvsStatus()
			.then(setStatus)
			.finally(() => setChecking(false));
	};
	useEffect(check, [settings.kvsUrl, settings.hasKvsToken, settings.kvsProjectDir]);

	const start = async () => {
		setStarting(true);
		setStartError(null);
		try {
			await window.kroma.kvsStart();
			useEditor.getState().showToast("The voice engine is on");
		} catch (e) {
			setStartError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
		} finally {
			setStarting(false);
			check();
		}
	};
	const stop = async () => {
		await window.kroma.kvsStop();
		setTimeout(check, 800);
	};

	const online = status?.online ?? false;
	const notInstalled = status?.cannotStart?.includes("make engine-setup");

	return (
		<>
			<Group title="Voice engine" description="The engine makes Kroma's Khmer voices: your cloned voices, the preset voices (storyteller, news anchor, children…) and Story studio. It's part of Khmer Voice Studio and runs on this computer or on a free Google Colab GPU.">
				<Card>
					<div className="flex flex-wrap items-center gap-3 py-3.5">
						<span className={cn("size-2.5 shrink-0 rounded-full", status === null || starting ? "animate-pulse bg-muted-foreground" : online ? "bg-success" : "bg-destructive")} aria-hidden />
						<div className="min-w-0 flex-1">
							<p className="text-[13px] font-medium">{status === null ? "Checking…" : starting ? "Starting the engine…" : online ? "On" : "Off"}</p>
							<p className="text-xs leading-relaxed text-muted-foreground">
								{starting
									? "The first start loads the voice model and can take up to a minute."
									: online
										? `Running on ${deviceName(status?.device)} · ${status?.presets.length ?? 0} preset voices${status?.busy ? ` · ${status.busy} job(s) running` : ""}${status?.startedByKroma ? " · started by Kroma, stops when Kroma quits" : ""}`
										: status === null
											? ""
											: local
												? "Not running. Press Start to turn it on."
												: "Kroma can't reach your Colab engine. Check that the notebook is still running, and its address and token below."}
							</p>
						</div>
						<span className="flex shrink-0 gap-2">
							{!online && local && (
								<Button size="sm" disabled={starting || Boolean(status?.cannotStart)} onClick={() => void start()} title={status?.cannotStart ?? undefined}>
									{starting ? <Loader2 className="animate-spin" /> : <Power />} {starting ? "Starting…" : "Start engine"}
								</Button>
							)}
							{online && status?.startedByKroma && (
								<Button variant="outline" size="sm" onClick={() => void stop()}>
									<Power /> Stop
								</Button>
							)}
							<Button variant="outline" size="sm" disabled={checking || starting} onClick={check}>
								<RefreshCw className={checking ? "animate-spin" : ""} /> Check
							</Button>
						</span>
					</div>
					{!online && local && status?.cannotStart && !starting && (
						<p className="py-2.5 text-xs leading-relaxed text-warning">
							{notInstalled ? (
								<>
									The engine isn't installed yet. Open Terminal and run this once (a few minutes):
									<code className="mt-1.5 block rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] text-foreground select-text">
										cd "{settings.kvsProjectDir}" && make engine-setup
									</code>
								</>
							) : (
								status.cannotStart
							)}
						</p>
					)}
					{startError && (
						<p className="flex flex-wrap items-center gap-2 py-2.5 text-xs text-destructive">
							{startError}
							<Button variant="ghost" size="xs" onClick={() => void window.kroma.kvsShowLog()}>
								Show the log
							</Button>
						</p>
					)}
				</Card>
			</Group>

			<Group title="Where it runs">
				<Segmented
					label="Where the engine runs"
					equalWidth
					value={local ? "here" : "colab"}
					options={[
						{ value: "here", label: "This computer" },
						{ value: "colab", label: "Google Colab (free GPU)" },
					]}
					onChange={(where) => {
						if (where === "here" && !local) void save({ kvsUrl: LOCAL_ENGINE });
						if (where === "colab" && local) void save({ kvsUrl: "https://" });
					}}
				/>
				{local ? (
					<Card>
						<Row
							label="Khmer Voice Studio folder"
							description={settings.kvsProjectDir ? <span className="font-mono break-all">{settings.kvsProjectDir}</span> : "Choose the folder where Khmer Voice Studio is. Kroma starts the engine from it."}
							control={<KvsFolderButtons settings={settings} save={save} />}
						/>
						<SwitchRow label="Start the engine with Kroma" description="Turns the engine on each time you open Kroma, so voices are ready when you need them." checked={settings.kvsAutoStart} onChange={(v) => void save({ kvsAutoStart: v })} />
						<Row
							label="Good to know"
							description="On a Mac the engine uses the Apple GPU: fine for short lines, slower for long stories (Colab is several times faster). The very first start downloads the voice model, about 5 GB. An engine Kroma starts stops when Kroma quits."
						/>
					</Card>
				) : (
					<Card>
						<Step n={1} title="Open the notebook in Google Colab">
							In your Khmer Voice Studio folder it's <span className="font-mono">{COLAB_NOTEBOOK}</span>. In Colab: File → Upload notebook.
						</Step>
						<Step n={2} title="Choose a GPU and run it">Runtime → Change runtime type → T4 GPU, then Runtime → Run all. The last cell prints an address and a token.</Step>
						<Step n={3} title="Paste them here">
							<div className="space-y-2 pt-1">
								<DraftInput className="w-full" value={settings.kvsUrl} onCommit={(v) => void save({ kvsUrl: v })} />
							</div>
						</Step>
						<KeyRow label="Token" saved={settings.hasKvsToken} placeholder="The token Colab printed" onSave={(v) => save({ kvsToken: v })} />
					</Card>
				)}
			</Group>

			<Group title="Your Khmer Voice Studio voices" description="Voices you made in the Khmer Voice Studio dashboard can come into Kroma: open Voices → Import from KVS. It reads them from the folder above.">
				{!local && (
					<Card>
						<Row
							label="Khmer Voice Studio folder"
							description={settings.kvsProjectDir ? <span className="font-mono break-all">{settings.kvsProjectDir}</span> : "Not set: importing from KVS is off."}
							control={<KvsFolderButtons settings={settings} save={save} />}
						/>
					</Card>
				)}
			</Group>
		</>
	);
}

function KvsFolderButtons({ settings, save }: SectionProps) {
	return (
		<span className="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={async () => {
					const picked = await window.kroma.chooseFolder(settings.kvsProjectDir);
					if (picked) await save({ kvsProjectDir: picked });
				}}
			>
				<FolderOpen /> {settings.kvsProjectDir ? "Change…" : "Choose…"}
			</Button>
			{settings.kvsProjectDir && (
				<Button variant="ghost" size="sm" onClick={() => void save({ kvsProjectDir: "" })}>
					Clear
				</Button>
			)}
		</span>
	);
}

const PLATFORMS: { id: PublishPlatform; name: string }[] = [
	{ id: "youtube", name: "YouTube" },
	{ id: "facebook", name: "Facebook" },
	{ id: "tiktok", name: "TikTok" },
];

/** Upload-Post: connect YouTube, Facebook and TikTok once, then the Post panel posts to them in one click. */
function PostingSection({ settings, save }: SectionProps) {
	const [account, setAccount] = useState<PostAccount | null>(null);
	const [profiles, setProfiles] = useState<PostProfile[]>([]);
	const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const clean = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

	const refresh = () => {
		if (!settings.hasPostKey) return;
		setBusy(true);
		setError(null);
		void Promise.all([window.kroma.postAccount(), window.kroma.postProfiles()])
			.then(([a, p]) => {
				setAccount(a);
				setProfiles(p);
				if (!settings.postProfile && p[0]) void save({ postProfile: p[0].username });
			})
			.catch((e) => setError(clean(e)))
			.finally(() => setBusy(false));
		void window.kroma.facebookPages().then(setPages).catch(() => setPages([]));
	};
	useEffect(refresh, [settings.hasPostKey, settings.postProfile]);
	// Coming back from the browser after connecting: show the new accounts.
	useEffect(() => {
		window.addEventListener("focus", refresh);
		return () => window.removeEventListener("focus", refresh);
	});

	const profile = profiles.find((p) => p.username === settings.postProfile) ?? profiles[0];
	return (
		<>
			<Group
				title="Upload-Post"
				description="Kroma posts through Upload-Post (upload-post.com), which is already approved by YouTube, Facebook and TikTok, so your posts go out publicly. Connect your accounts once; after that the Post panel posts in one click."
			>
				<Card>
					<KeyRow label="API key" saved={settings.hasPostKey} placeholder="From app.upload-post.com → API Keys" keyUrl="https://app.upload-post.com/api-keys" onSave={(v) => save({ postKey: v })} />
					{settings.hasPostKey && (
						<Row
							label="Account"
							description={error ?? (account ? `${account.email}${account.plan ? ` · ${account.plan} plan` : ""}` : busy ? "Checking…" : "")}
							control={
								<span className="flex items-center gap-2">
									{account && !error ? <CircleCheck className="size-4 text-success" /> : error ? <CircleX className="size-4 text-destructive" /> : null}
									<Button variant="outline" size="sm" disabled={busy} onClick={refresh}>
										<RefreshCw className={busy ? "animate-spin" : ""} /> Check
									</Button>
								</span>
							}
						/>
					)}
				</Card>
			</Group>

			{settings.hasPostKey && !error && (
				<Group title="Your accounts" description="Press Connect, sign in to each platform in your browser and allow access, then come back here.">
					<Card>
						{profiles.length > 1 && (
							<Row
								label="Profile"
								description="Each Upload-Post profile has its own set of accounts."
								control={<AppSelect label="Profile" value={profile?.username ?? ""} options={profiles.map((p) => ({ value: p.username, label: p.displayName }))} onChange={(v) => void save({ postProfile: v })} />}
							/>
						)}
						{PLATFORMS.map((pl) => {
							const a = profile?.accounts[pl.id];
							return (
								<Row
									key={pl.id}
									label={pl.name}
									description={a ? `${a.name}${a.handle && a.handle !== a.name ? ` (@${a.handle.replace(/^@/, "")})` : ""}${a.needsReconnect ? " · sign-in expired: press Connect" : ""}` : "Not connected"}
									control={a && !a.needsReconnect ? <CircleCheck className="size-4 text-success" /> : <CircleX className="size-4 text-muted-foreground" />}
								/>
							);
						})}
						{profile?.accounts.facebook && (
							<Row
								label="Facebook Page"
								description="Videos are posted to this Page (Facebook doesn't allow apps to post to personal profiles)."
								control={
									pages.length ? (
										<AppSelect label="Facebook Page" value={settings.facebookPageId || pages[0].id} options={pages.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => void save({ facebookPageId: v })} />
									) : (
										<span className="text-xs text-muted-foreground">No Pages found</span>
									)
								}
							/>
						)}
						<Row
							label="Connect accounts"
							description="Opens a secure Upload-Post page in your browser. TikTok needs Upload-Post's Basic plan; YouTube and Facebook work on the free plan (10 posts a month)."
							control={
								<Button
									size="sm"
									disabled={busy}
									onClick={() =>
										void window.kroma
											.postConnect()
											.then((p) => {
												if (p !== settings.postProfile) void save({ postProfile: p });
											})
											.catch((e) => setError(clean(e)))
									}
								>
									<ExternalLink /> Connect
								</Button>
							}
						/>
					</Card>
				</Group>
			)}

			{!settings.hasPostKey && (
				<Group title="Getting started">
					<Card>
						<Row label="1. Make a free account" description="Sign up at upload-post.com." control={<Button variant="outline" size="sm" onClick={() => void window.kroma.openExternal("https://app.upload-post.com/")}><ExternalLink /> Open</Button>} />
						<Row label="2. Copy your API key" description="In Upload-Post: API Keys → create a key, then paste it above." />
						<Row label="3. Connect your accounts" description="Press Connect here, and sign in to YouTube, Facebook and TikTok." />
					</Card>
				</Group>
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
					description="Sign in to the site in that browser first. Your system may ask to allow access; Safari also needs Full Disk Access."
					control={<AppSelect label="Browser logins" className="w-52" value={settings.cookiesBrowser} options={BROWSERS} onChange={(v) => void save({ cookiesBrowser: v })} />}
				/>
			</Card>
		</Group>
	);
}

function FoldersSection({ settings, save }: SectionProps) {
	const [defaults, setDefaults] = useState<{ exportDir: string; downloadDir: string; libraryDir: string } | null>(null);
	useEffect(() => {
		void window.kroma.folderDefaults().then(setDefaults);
	}, []);
	if (!defaults) return null;
	const exportDir = settings.exportDir || defaults.exportDir;
	const downloadDir = settings.downloadDir || defaults.downloadDir;
	const choose = async (key: "exportDir" | "downloadDir", current: string) => {
		const picked = await window.kroma.chooseFolder(current);
		if (picked) await save({ [key]: picked });
	};

	return (
		<>
			<Group title="Exports" description="Finished videos and subtitle files.">
				<Card>
					<FolderRow label="Export folder" path={exportDir} isDefault={!settings.exportDir} onChoose={() => void choose("exportDir", exportDir)} onReset={() => void save({ exportDir: "" })} />
					<SwitchRow label="Ask where to save each time" description="Off: Export saves straight into the folder (a new name, never overwriting) and shows the file." checked={settings.askExportPath} onChange={(v) => void save({ askExportPath: v })} />
				</Card>
			</Group>
			<Group title="Downloads" description="Videos downloaded from links, each in its own folder with the site's subtitles.">
				<Card>
					<FolderRow label="Download folder" path={downloadDir} isDefault={!settings.downloadDir} onChoose={() => void choose("downloadDir", downloadDir)} onReset={() => void save({ downloadDir: "" })} />
				</Card>
			</Group>
			<Group title="Library" description="Voice clips, cloned voices, timeline pictures and saved projects.">
				<Card>
					<FolderRow label="Library folder" path={defaults.libraryDir} isDefault />
				</Card>
			</Group>
		</>
	);
}

function FolderRow({ label, path, isDefault, onChoose, onReset }: { label: string; path: string; isDefault: boolean; onChoose?: () => void; onReset?: () => void }) {
	return (
		<Row
			label={label}
			description={
				<span className="block font-mono break-all">
					{path.replace(/^\/Users\/[^/]+/, "~")}
					{isDefault && onChoose && <span className="font-sans text-muted-foreground"> · default</span>}
				</span>
			}
			control={
				<span className="flex gap-1.5">
					<Button variant="outline" size="sm" onClick={() => void window.kroma.openFolder(path)}>
						<FolderOpen /> Open
					</Button>
					{onChoose && (
						<Button variant="outline" size="sm" onClick={onChoose}>
							Change…
						</Button>
					)}
					{onReset && !isDefault && (
						<Button variant="ghost" size="sm" onClick={onReset}>
							Reset
						</Button>
					)}
				</span>
			}
		/>
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
					description="System follows your computer's setting."
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
	["Save as a new file", ["⇧", "⌘", "S"]],
	["New window", ["⇧", "⌘", "N"]],
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
								{keyCaps(keys).map((k) => (
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

/** Settings → About → Updates: the version, a check button, and automatic updates on or off. */
function UpdatesGroup() {
	const state = useUpdateState();
	const [auto, setAuto] = useState<boolean | null>(null);
	useEffect(() => {
		void window.kroma.getSettings().then((s) => setAuto(s.autoUpdate));
	}, []);
	const status = !state
		? ""
		: state.status === "checking"
			? "Checking…"
			: state.status === "none"
				? `You have the latest version (${state.current}).`
				: state.status === "available"
					? `Kroma ${state.version} is available.`
					: state.status === "downloading"
						? `Downloading Kroma ${state.version}${state.progress !== undefined ? ` · ${Math.round(state.progress * 100)}%` : ""}`
						: state.status === "ready"
							? `Kroma ${state.version} is ready: press “Restart to update” on the card in the bottom-right corner (or in the status bar at the bottom).`
							: state.status === "error"
								? (state.error ?? "Couldn't check for updates.")
								: `Version ${state.current}. Kroma checks for updates on start and every few hours.`;
	return (
		<Group title="Updates" description="New versions come from GitHub Releases. Kroma downloads them in the background; you choose when to restart.">
			<Card>
				<Row
					label="Check for updates"
					description={status}
					control={
						<Button variant="outline" size="sm" disabled={state?.status === "checking" || state?.status === "downloading"} onClick={() => void window.kroma.checkForUpdates()}>
							<RefreshCw className={state?.status === "checking" ? "animate-spin" : ""} /> Check now
						</Button>
					}
				/>
				{auto !== null && (
					<SwitchRow
						label="Update automatically"
						description="Download new versions in the background. Off: Kroma only tells you a new version is out."
						checked={auto}
						onChange={(v) => {
							setAuto(v);
							void window.kroma.saveSettings({ autoUpdate: v });
						}}
					/>
				)}
				<Row label="What's new" control={<Button variant="ghost" size="sm" onClick={() => void window.kroma.openExternal("https://heang-dev.github.io/kroma/changelog/")}><ExternalLink /> Changelog</Button>} />
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
		["FFmpeg", info.tools.ffmpeg && info.tools.ffprobe, info.installHints.ffmpeg],
		["yt-dlp", info.tools.ytdlp, info.installHints.ytdlp],
		["uv (for removing voices)", info.tools.uv, info.installHints.uv],
	];
	return (
		<>
			<Group title="About">
				<Card>
					<Row label={`Kroma Studio ${info.version}`} description="Turns online videos into Khmer (and Thai, Vietnamese, Lao…) videos with subtitles and voices, posted to YouTube, Facebook and TikTok." />
				</Card>
			</Group>
			<UpdatesGroup />
			<Group title="Tools" description={info.platform === "darwin" ? "Installed with Homebrew; Kroma finds them on its own." : "FFmpeg and yt-dlp come with Kroma. uv is only needed for removing the original voices."}>
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
