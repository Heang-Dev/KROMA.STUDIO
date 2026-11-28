import { useCallback, useEffect, useRef, useState } from "react";
import { FileAudio, Loader2, Play, Plus, Square, Trash2, Volume2, Wand2 } from "lucide-react";
import { KVS_TEMPLATES, type KvsStatus, type KvsVoice, isKvsVoice } from "@shared/types";
import { languageOf } from "@shared/languages";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linesNeedingVoice, makeVoiceOver, removeOriginalVoices, setVoice, voiceSettings, forgetVoice } from "@/lib/actions";
import { runTask, useEditor } from "@/state/store";
import { CharactersSection } from "./CharactersSection";
import { VoiceRecorder } from "./VoiceRecorder";
import { startEngine } from "./EngineStatus";
import { mediaUrl } from "./Preview";
import { Card, ProgressBar, Row, Section, Segmented, SliderField, SwitchRow, TaskProgress, useBusy } from "./common";
import { t } from "@shared/i18n";

type Source = "microsoft" | "designed" | "cloned";

const sourceOf = (voice: string): Source => (voice.startsWith("kvs-design:") ? "designed" : voice.startsWith("kvs-clone:") ? "cloned" : "microsoft");

/** The voice engine's status and the cloned voices on this computer, refreshed on demand. */
function useKvs() {
	const [status, setStatus] = useState<KvsStatus | null>(null);
	const [voices, setVoices] = useState<KvsVoice[]>([]);
	const refresh = useCallback(() => {
		void window.kroma.kvsStatus().then(setStatus);
		void window.kroma.kvsVoices().then(setVoices);
	}, []);
	useEffect(refresh, [refresh]);
	return { status, voices, refresh };
}

export function VoicePanel() {
	const project = useEditor((s) => s.project);
	const voice = voiceSettings(project);
	const lang = languageOf(project.language);
	const langName = t(lang.name);
	const instant = lang.voices;
	const busy = useBusy("voice");
	const kvs = useKvs();
	const player = usePlayer();
	const [cloneOpen, setCloneOpen] = useState(false);
	const translated = project.cues.filter((c) => c.text.trim()).length;
	const missing = linesNeedingVoice(project).length;
	const voiced = translated - missing;
	const source = sourceOf(voice.voice);
	const sample = useRef<HTMLAudioElement | null>(null);
	const removing = useBusy("separate");
	const [quality, setQuality] = useState<"fast" | "best">(voice.separation ?? "fast");

	const playSample = () => {
		const first = project.cues.find((c) => voice.lines[c.id]?.text === c.text.trim());
		if (!first) return;
		sample.current?.pause();
		sample.current = new Audio(mediaUrl(voice.lines[first.id].path));
		void sample.current.play();
	};

	const chooseSource = (next: Source) => {
		if (next === source) return;
		if (next === "microsoft") setVoice({ voice: instant[0].id });
		else if (next === "designed") setVoice({ voice: `kvs-design:${(kvs.status?.presets[0] ?? KVS_TEMPLATES[0]).name}` });
		else if (next === "cloned" && kvs.voices.some((v) => !v.preset)) setVoice({ voice: `kvs-clone:${kvs.voices.find((v) => !v.preset)!.id}` });
		else if (next === "cloned") setCloneOpen(true);
	};

	const engineOffline = kvs.status !== null && !kvs.status.online;

	return (
		<>
			<CharactersSection clones={kvs.voices.filter((v) => !v.preset)} sample={(v) => <PlaySample voice={v} rate={voice.rate} player={player} />} />
			<Section
				title={voice.cast?.length ? t("Default voice") : t("{language} voice-over", { language: langName })}
				hint={t("Reads the {language} subtitles aloud, timed to each line, over the original sound turned down.", { language: langName })}
			>
				<Segmented<Source>
					label={t("Voice type")}
					equalWidth
					value={source}
					options={[
						{ value: "microsoft", label: t("Instant") },
						{ value: "designed", label: t("Designed") },
						{ value: "cloned", label: t("Cloned") },
					]}
					onChange={chooseSource}
				/>

				{source === "microsoft" && (
					<>
						<Card className="px-0">
							{instant.map((v) => (
								<VoiceRow
									key={v.id}
									selected={voice.voice === v.id}
									title={v.label.split(" ")[0]}
									subtitle={v.label.includes("female") ? t("Female · Microsoft") : t("Male · Microsoft")}
									onSelect={() => setVoice({ voice: v.id })}
									sample={<PlaySample voice={v.id} rate={voice.rate} player={player} />}
								/>
							))}
						</Card>
						<Card>
							<SliderField label={t("Speed")} value={voice.rate} min={-30} max={50} step={5} format={(v) => `${v > 0 ? "+" : ""}${v}%`} onChange={(v) => setVoice({ rate: v })} />
						</Card>
						<p className="text-xs text-muted-foreground">{lang.code === "km" ? t("Free Microsoft {language} voices: ready in seconds, good for drafts and checking timing.", { language: langName }) : t("Free Microsoft {language} voices: ready in seconds.", { language: langName })}</p>
					</>
				)}

				{source !== "microsoft" && (
					<>
						{lang.code !== "km" && (
							<p className="rounded-md border border-dashed p-2.5 text-xs leading-relaxed text-muted-foreground">
								{t("These voices are made for Khmer. For {language}, the Instant voices sound right; these may read {language} with a Khmer accent.", { language: langName })}
							</p>
						)}
						{engineOffline ? (
							<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs leading-relaxed text-destructive">
								{kvs.status?.local && kvs.status.installed === "missing"
									? t("These voices need the voice engine. Install it once in Settings (about 2 GB).")
									: kvs.status?.local
										? t("The voice engine is off.")
										: t("Kroma can't reach your Colab voice engine. {error}", { error: kvs.status?.error ?? "" })}
								<div className="mt-2 flex gap-1.5">
									{kvs.status?.local && kvs.status.installed !== "missing" && !kvs.status.cannotStart ? (
										<Button size="xs" variant="outline" onClick={() => void startEngine().then(kvs.refresh)}>
											{t("Start engine")}
										</Button>
									) : (
										<Button size="xs" variant="outline" onClick={() => useEditor.getState().openSettings("voice-engine")}>
											{kvs.status?.local && kvs.status.installed === "missing" ? t("Install the engine") : t("Set up the engine")}
										</Button>
									)}
									<Button size="xs" variant="ghost" onClick={kvs.refresh}>
										{t("Try again")}
									</Button>
								</div>
							</div>
						) : (
							<p className="text-xs text-muted-foreground">
								{t("The voice engine{device}: natural, expressive voices. Slower than Instant, so voice once the subtitles are final.", { device: kvs.status?.device ? ` (${kvs.status.device === "cuda" ? "GPU" : kvs.status.device === "mps" ? t("this computer, slower") : kvs.status.device})` : "" })}
							</p>
						)}

						{source === "designed" && (
							<p className="text-xs text-muted-foreground">
								{t("▶ plays a sample.")} <Wand2 className="inline size-3" /> {t("makes one (once per voice): it also keeps that voice exactly the same in every video.")}
							</p>
						)}
						{source === "designed" && (
							<Card className="px-0">
								{(kvs.status?.presets.length ? kvs.status.presets : KVS_TEMPLATES).map((p) => {
									const id = `kvs-design:${p.name}`;
									const saved = kvs.voices.some((v) => v.preset === p.name);
									return (
										<VoiceRow
											key={p.name}
											selected={voice.voice === id}
											title={p.name}
											subtitle={p.description}
											onSelect={() => setVoice({ voice: id })}
											sample={saved ? <PlaySample voice={id} rate={0} player={player} /> : <MakeSample name={p.name} onMade={kvs.refresh} disabled={engineOffline} />}
										/>
									);
								})}
							</Card>
						)}

						{source === "cloned" && (
							<Card className="px-0">
								{kvs.voices.filter((v) => !v.preset).map((v) => {
									const id = `kvs-clone:${v.id}`;
									const on = voice.voice === id;
									return (
										<div key={v.id} className={`flex items-center gap-2 px-3 py-2 ${on ? "bg-accent/50" : ""}`}>
											<button type="button" className="min-w-0 flex-1 text-left" onClick={() => setVoice({ voice: id })} aria-pressed={on}>
												<span className="block truncate text-[13px] font-medium">
													{v.name} {on && <span className="text-xs font-normal text-muted-foreground">{t("· in use")}</span>}
												</span>
												<span className="block truncate text-[11px] text-muted-foreground">
													{t("{seconds} s sample", { seconds: v.seconds.toFixed(0) })}{v.transcript ? ` · “${v.transcript}”` : ""}
												</span>
											</button>
											<PlaySample voice={id} rate={0} player={player} />
											<Button
												variant="ghost"
												size="icon-xs"
												aria-label={t("Delete {name}", { name: v.name })}
												onClick={() => {
													if (!window.confirm(t(`Delete the voice "{name}"?`, { name: v.name }))) return;
													void window.kroma.kvsDelete(v.id).then(() => {
														forgetVoice(id);
														kvs.refresh();
													});
												}}
											>
												<Trash2 />
											</Button>
										</div>
									);
								})}
								<button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-muted-foreground hover:bg-accent/40 hover:text-foreground" onClick={() => setCloneOpen(true)} disabled={engineOffline}>
									<Plus className="size-4" /> {t("Clone a voice")}
								</button>
							</Card>
						)}
					</>
				)}

				<Button className="h-auto min-h-control w-full whitespace-normal py-2 leading-snug" disabled={!translated || busy || (isKvsVoice(voice.voice) && engineOffline)} onClick={() => void makeVoiceOver()}>
					<Volume2 /> {voiced && missing ? t("Voice the {n} new lines", { n: missing }) : t("Make voice-over")}
				</Button>
				{translated > 0 ? (
					<div className="space-y-2">
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">{t("Lines voiced")}</span>
							<span className="tabular-nums">
								{voiced} / {translated}
							</span>
						</div>
						<ProgressBar value={voiced / translated} />
						{voiced > 0 && <p className="text-xs text-muted-foreground">{t("Changing a voice re-voices only the lines it speaks; editing a subtitle re-voices only that line.")}</p>}
					</div>
				) : (
					<p className="text-xs text-muted-foreground">{t("Make the {language} subtitles first.", { language: langName })}</p>
				)}
				<TaskProgress prefix="voice" />
			</Section>

			<Section title={t("Mix")}>
				<Card>
					<SwitchRow label={t("Use the voice-over")} description={t("In the preview and the export.")} checked={voice.enabled} onChange={(v) => setVoice({ enabled: v })} />
					<SwitchRow
						label={t("Remove the original voices")}
						description={
							removing
								? t("Removing…")
								: voice.removeVoices === undefined
									? t("On: done automatically with the voice-over (or at export). Keeps the music and sound effects, drops the original speech.")
									: t("Keeps the music and sound effects, drops the original speech. Runs on this computer: about 40 s per 5 minutes on a recent Mac or PC.")
						}
						checked={voice.removeVoices !== false}
						onChange={(on) => {
							if (!on) return setVoice({ removeVoices: false });
							const ready = project.clips.every((c) => voice.backgrounds?.[c.mediaId] && voice.separation === quality);
							if (ready) setVoice({ removeVoices: true, enabled: true });
							else void removeOriginalVoices(quality);
						}}
					/>
					{voice.removeVoices !== false || removing ? (
						<>
							<Row
								stack
								label={t("Quality")}
								description={quality === "best" ? t("Cleanest, but slower than the video's length without a strong GPU.") : t("Fast and removes speech well.")}
								control={
									<Segmented<"fast" | "best">
										equalWidth
										label={t("Voice removal quality")}
										size="sm"
										value={quality}
										options={[
											{ value: "fast", label: t("Fast") },
											{ value: "best", label: t("Best") },
										]}
										onChange={(q) => {
											setQuality(q);
											if (voice.removeVoices && q !== voice.separation) void removeOriginalVoices(q);
										}}
									/>
								}
							/>
							<SliderField label={t("Music & effects")} value={voice.backgroundVolume ?? 1} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setVoice({ backgroundVolume: v })} />
						</>
					) : (
						<SliderField label={t("Original sound")} value={voice.originalVolume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setVoice({ originalVolume: v })} />
					)}
				</Card>
				<TaskProgress prefix="separate" />
				<Button variant="outline" size="sm" className="h-auto min-h-control w-full whitespace-normal py-1.5 leading-snug" disabled={!voiced} onClick={playSample}>
					<Play /> {t("Hear the first line")}
				</Button>
			</Section>

			<CloneDialog
				open={cloneOpen}
				onOpenChange={setCloneOpen}
				onCloned={(v) => {
					kvs.refresh();
					setVoice({ voice: `kvs-clone:${v.id}` });
				}}
			/>
		</>
	);
}

/** One shared audio player: one sample at a time, the button shows loading / playing. */
function usePlayer() {
	const audio = useRef<HTMLAudioElement | null>(null);
	const [state, setState] = useState<{ voice: string; status: "loading" | "playing" } | null>(null);
	useEffect(() => () => audio.current?.pause(), []);
	const stop = useCallback(() => {
		audio.current?.pause();
		setState(null);
	}, []);
	const play = useCallback(
		async (voice: string, rate: number) => {
			if (state?.voice === voice) return stop();
			audio.current?.pause();
			setState({ voice, status: "loading" });
			try {
				const path = await window.kroma.voiceSample(voice, rate);
				if (!path) throw new Error(t("This voice has no sample yet."));
				const el = new Audio(mediaUrl(path));
				audio.current = el;
				el.onended = () => setState((s) => (s?.voice === voice ? null : s));
				await el.play();
				setState({ voice, status: "playing" });
			} catch (err) {
				setState(null);
				useEditor.getState().showToast(t("Couldn't play the sample"), "error", err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") : String(err));
			}
		},
		[state, stop],
	);
	return { state, play };
}

type Player = ReturnType<typeof usePlayer>;

function PlaySample({ voice, rate, player }: { voice: string; rate: number; player: Player }) {
	const status = player.state?.voice === voice ? player.state.status : null;
	return (
		<Button variant="ghost" size="icon-xs" aria-label={status === "playing" ? t("Stop the sample") : t("Hear a sample")} title={status === "playing" ? t("Stop") : t("Hear a sample")} onClick={(e) => (e.stopPropagation(), void player.play(voice, rate))}>
			{status === "loading" ? <Loader2 className="animate-spin" /> : status === "playing" ? <Square className="fill-current" /> : <Play className="fill-current" />}
		</Button>
	);
}

/** Designs a template once into its saved sample (pitch-checked), then it can be played and used. */
function MakeSample({ name, onMade, disabled }: { name: string; onMade: () => void; disabled?: boolean }) {
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="outline"
			size="icon-xs"
			aria-label={t("Make a sample of {name}", { name })}
			disabled={busy || disabled}
			title={disabled ? t("Start the voice engine to make samples") : t("Make a sample to hear (once, about a minute)")}
			onClick={async (e) => {
				e.stopPropagation();
				setBusy(true);
				const made = await runTask(`preset-${Date.now()}`, t(`Make "{name}" sample`, { name }), (id) => window.kroma.makePresetVoice(id, name), {
					kind: "voices",
					done: () => ({ tone: "success", title: t(`"{name}" sample is ready`, { name }), detail: t("Press ▶ to hear it.") }),
					failed: t(`Couldn't make the "{name}" sample`, { name }),
				});
				setBusy(false);
				if (made) onMade();
			}}
		>
			{busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
		</Button>
	);
}

function VoiceRow({ selected, title, subtitle, onSelect, sample }: { selected: boolean; title: string; subtitle?: string; onSelect: () => void; sample: React.ReactNode }) {
	return (
		<div className={`flex items-center gap-2 px-3 py-2 ${selected ? "bg-accent/50" : "hover:bg-accent/25"}`}>
			<button type="button" role="radio" aria-checked={selected} className="flex min-w-0 flex-1 items-start gap-2.5 text-left" onClick={onSelect}>
				<span className={`mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-foreground" : "border-input"}`}>{selected && <span className="size-1.5 rounded-full bg-foreground" />}</span>
				<span className="min-w-0">
					<span className="block text-[13px] leading-snug font-medium">{title}</span>
					{subtitle && <span className="block text-[11px] leading-snug text-muted-foreground">{subtitle}</span>}
				</span>
			</button>
			<div className="shrink-0">{sample}</div>
		</div>
	);
}

/** Make a cloned voice from a 5–20 s recording, with the speaker's consent. */
export function CloneDialog({ open, onOpenChange, onCloned }: { open: boolean; onOpenChange: (open: boolean) => void; onCloned: (voice: KvsVoice) => void }) {
	const [name, setName] = useState("");
	const [file, setFile] = useState<string | null>(null);
	const [recorded, setRecorded] = useState<{ path: string; transcript: string } | null>(null);
	const [mode, setMode] = useState<"record" | "file">("record");
	const [consent, setConsent] = useState(false);
	const cloning = useBusy("clone");

	useEffect(() => {
		if (open) {
			setName("");
			setFile(null);
			setRecorded(null);
			setConsent(false);
		}
	}, [open]);

	// A recording made here knows its text; a file is written down by the engine.
	const source = mode === "record" ? recorded : file ? { path: file, transcript: undefined } : null;

	const clone = async () => {
		if (!source) return;
		const voice = await runTask(`clone-${Date.now()}`, t("Clone voice"), (id) => window.kroma.cloneVoice(id, name, source.path, source.transcript), {
			kind: "voices",
			done: (v) => ({ tone: "success", title: t(`Voice "{name}" is ready`, { name: v.name }), action: { kind: "view", view: "voices" } }),
			failed: t(`Couldn't clone "{name}"`, { name }),
		});
		if (voice) {
			onCloned(voice);
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !cloning && onOpenChange(next)}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("Clone a voice")}</DialogTitle>
					<DialogDescription>{t("Record yourself reading a short text, or use 5–20 seconds of one person speaking clearly in Khmer, with no music.")}</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="clone-name">{t("Name")}</Label>
						<Input id="clone-name" placeholder={t("e.g. My voice")} value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div className="space-y-2">
						<Segmented<"record" | "file">
							label={t("Recording")}
							equalWidth
							value={mode}
							options={[
								{ value: "record", label: t("Record now") },
								{ value: "file", label: t("Use a file") },
							]}
							onChange={setMode}
						/>
						{mode === "record" ? (
							<VoiceRecorder onChange={setRecorded} />
						) : (
							<Button variant="outline" className="w-full justify-start" onClick={() => void window.kroma.kvsPickRecording().then((p) => p && setFile(p))}>
								<FileAudio /> <span className="truncate">{file ? file.split("/").pop() : t("Choose an audio or video file…")}</span>
							</Button>
						)}
					</div>
					<label className="flex items-start gap-2.5 text-xs leading-relaxed">
						<Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
						<span>{t("This is my voice, or I have the speaker's permission to clone it. I won't use it to pretend to be someone or to mislead people.")}</span>
					</label>
					<TaskProgress prefix="clone" />
				</div>
				<DialogFooter>
					<Button variant="outline" disabled={cloning} onClick={() => onOpenChange(false)}>
						{t("Cancel")}
					</Button>
					<Button disabled={!source || !consent || cloning} onClick={() => void clone()}>
						{cloning ? t("Cloning…") : t("Clone voice")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
