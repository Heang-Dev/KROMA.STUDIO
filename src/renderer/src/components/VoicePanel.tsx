import { useCallback, useEffect, useRef, useState } from "react";
import { FileAudio, Play, Plus, Trash2, Volume2 } from "lucide-react";
import { KHMER_VOICES, type KvsStatus, type KvsVoice, isKvsVoice } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linesNeedingVoice, makeVoiceOver, removeOriginalVoices, setVoice, voiceSettings } from "@/lib/actions";
import { runTask, useEditor } from "@/state/store";
import { mediaUrl } from "./Preview";
import { AppSelect, Card, ChoiceTiles, ProgressBar, Row, Section, Segmented, SliderField, SwitchRow, TaskProgress, useBusy } from "./common";

type Source = "microsoft" | "designed" | "cloned";

const sourceOf = (voice: string): Source => (voice.startsWith("kvs-design:") ? "designed" : voice.startsWith("kvs-clone:") ? "cloned" : "microsoft");

/** The KVS engine's status and the cloned voices on this Mac, refreshed on demand. */
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
	const busy = useBusy("voice");
	const kvs = useKvs();
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
		if (next === "microsoft") setVoice({ voice: KHMER_VOICES[0].id });
		else if (next === "designed" && kvs.status?.presets[0]) setVoice({ voice: `kvs-design:${kvs.status.presets[0].name}` });
		else if (next === "cloned" && kvs.voices[0]) setVoice({ voice: `kvs-clone:${kvs.voices[0].id}` });
		else if (next === "cloned") setCloneOpen(true);
	};

	const engineOffline = kvs.status !== null && !kvs.status.online;

	return (
		<>
			<Section title="Khmer voice-over" hint="Reads the Khmer subtitles aloud, timed to each line, over the original sound turned down.">
				<Segmented<Source>
					label="Voice type"
					equalWidth
					value={source}
					options={[
						{ value: "microsoft", label: "Instant" },
						{ value: "designed", label: "Designed" },
						{ value: "cloned", label: "Cloned" },
					]}
					onChange={chooseSource}
				/>

				{source === "microsoft" && (
					<>
						<ChoiceTiles
							label="Voice"
							value={voice.voice}
							options={KHMER_VOICES.map((v) => ({ value: v.id, label: v.label.split(" ")[0], description: v.label.includes("female") ? "Female" : "Male" }))}
							onChange={(id) => setVoice({ voice: id })}
						/>
						<Card>
							<SliderField label="Speed" value={voice.rate} min={-30} max={50} step={5} format={(v) => `${v > 0 ? "+" : ""}${v}%`} onChange={(v) => setVoice({ rate: v })} />
						</Card>
						<p className="text-xs text-muted-foreground">Free Microsoft voices: ready in seconds, good for drafts and checking timing.</p>
					</>
				)}

				{source !== "microsoft" && (
					<>
						{engineOffline ? (
							<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs leading-relaxed text-destructive">
								The KVS voice engine isn't reachable. {kvs.status?.error}
								<div className="mt-2 flex gap-1.5">
									<Button size="xs" variant="outline" onClick={() => useEditor.getState().openSettings("voice-engine")}>
										Set up the engine
									</Button>
									<Button size="xs" variant="ghost" onClick={kvs.refresh}>
										Try again
									</Button>
								</div>
							</div>
						) : (
							<p className="text-xs text-muted-foreground">
								Your KVS engine{kvs.status?.device ? ` (${kvs.status.device === "cuda" ? "GPU" : kvs.status.device === "mps" ? "this Mac, slower" : kvs.status.device})` : ""}: natural, expressive voices. Slower than Instant, so voice once the subtitles are final.
							</p>
						)}

						{source === "designed" && kvs.status?.online && (
							<div className="space-y-1.5">
								<AppSelect label="Designed voice" value={voice.voice} options={kvs.status.presets.map((p) => ({ value: `kvs-design:${p.name}`, label: p.name }))} onChange={(v) => setVoice({ voice: v })} />
								<p className="text-xs leading-relaxed text-muted-foreground">{kvs.status.presets.find((p) => `kvs-design:${p.name}` === voice.voice)?.description}</p>
							</div>
						)}

						{source === "cloned" && (
							<Card className="px-0">
								{kvs.voices.map((v) => {
									const id = `kvs-clone:${v.id}`;
									const on = voice.voice === id;
									return (
										<div key={v.id} className={`flex items-center gap-2 px-3 py-2 ${on ? "bg-accent/50" : ""}`}>
											<button type="button" className="min-w-0 flex-1 text-left" onClick={() => setVoice({ voice: id })} aria-pressed={on}>
												<span className="block truncate text-[13px] font-medium">
													{v.name} {on && <span className="text-xs font-normal text-muted-foreground">· in use</span>}
												</span>
												<span className="block truncate text-[11px] text-muted-foreground">
													{v.seconds.toFixed(0)} s sample{v.transcript ? ` · “${v.transcript}”` : ""}
												</span>
											</button>
											<Button
												variant="ghost"
												size="icon-xs"
												aria-label={`Delete ${v.name}`}
												onClick={() => {
													if (!window.confirm(`Delete the voice "${v.name}"?`)) return;
													void window.kroma.kvsDelete(v.id).then(() => {
														if (on) setVoice({ voice: KHMER_VOICES[0].id });
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
									<Plus className="size-4" /> Clone a voice
								</button>
							</Card>
						)}
					</>
				)}

				<Button className="h-auto min-h-9 w-full whitespace-normal py-2 leading-snug" disabled={!translated || busy || (isKvsVoice(voice.voice) && engineOffline)} onClick={() => void makeVoiceOver()}>
					<Volume2 /> {voiced && missing ? `Voice the ${missing} new lines` : "Make voice-over"}
				</Button>
				{translated > 0 ? (
					<div className="space-y-2">
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Lines voiced</span>
							<span className="tabular-nums">
								{voiced} / {translated}
							</span>
						</div>
						<ProgressBar value={voiced / translated} />
						{voiced > 0 && <p className="text-xs text-muted-foreground">Changing the voice re-voices every line; editing a subtitle re-voices only that line.</p>}
					</div>
				) : (
					<p className="text-xs text-muted-foreground">Make the Khmer subtitles first.</p>
				)}
				<TaskProgress prefix="voice" />
			</Section>

			<Section title="Mix">
				<Card>
					<SwitchRow label="Use the voice-over" description="In the preview and the export." checked={voice.enabled} onChange={(v) => setVoice({ enabled: v })} />
					<SwitchRow
						label="Remove the original voices"
						description={removing ? "Removing…" : "Keeps the music and sound effects, drops the Chinese speech. Runs on this Mac: about 40 s per 5 minutes (the first time also downloads the tool)."}
						checked={Boolean(voice.removeVoices)}
						onChange={(on) => {
							if (!on) return setVoice({ removeVoices: false });
							const ready = project.clips.every((c) => voice.backgrounds?.[c.mediaId] && voice.separation === quality);
							if (ready) setVoice({ removeVoices: true, enabled: true });
							else void removeOriginalVoices(quality);
						}}
					/>
					{voice.removeVoices || removing ? (
						<>
							<Row
								label="Quality"
								description={quality === "best" ? "Cleanest, but slower than the video's length on a Mac." : "Fast and removes speech well."}
								control={
									<Segmented<"fast" | "best">
										label="Voice removal quality"
										size="sm"
										value={quality}
										options={[
											{ value: "fast", label: "Fast" },
											{ value: "best", label: "Best" },
										]}
										onChange={(q) => {
											setQuality(q);
											if (voice.removeVoices && q !== voice.separation) void removeOriginalVoices(q);
										}}
									/>
								}
							/>
							<SliderField label="Music & effects" value={voice.backgroundVolume ?? 1} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setVoice({ backgroundVolume: v })} />
						</>
					) : (
						<SliderField label="Original sound" value={voice.originalVolume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setVoice({ originalVolume: v })} />
					)}
				</Card>
				<TaskProgress prefix="separate" />
				<Button variant="outline" size="sm" className="h-auto min-h-8 w-full whitespace-normal py-1.5 leading-snug" disabled={!voiced} onClick={playSample}>
					<Play /> Hear the first line
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

/** Make a cloned voice from a 5–20 s recording, with the speaker's consent (the same rule as KVS). */
function CloneDialog({ open, onOpenChange, onCloned }: { open: boolean; onOpenChange: (open: boolean) => void; onCloned: (voice: KvsVoice) => void }) {
	const [name, setName] = useState("");
	const [file, setFile] = useState<string | null>(null);
	const [consent, setConsent] = useState(false);
	const cloning = useBusy("clone");

	useEffect(() => {
		if (open) {
			setName("");
			setFile(null);
			setConsent(false);
		}
	}, [open]);

	const clone = async () => {
		if (!file) return;
		const voice = await runTask(`clone-${Date.now()}`, "Clone voice", (id) => window.kroma.cloneVoice(id, name, file));
		if (voice) {
			useEditor.getState().showToast(`Voice "${voice.name}" is ready.`);
			onCloned(voice);
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !cloning && onOpenChange(next)}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Clone a voice</DialogTitle>
					<DialogDescription>Use 5–20 seconds of one person speaking clearly in Khmer, with no music. The engine cleans it and writes down what was said.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="clone-name">Name</Label>
						<Input id="clone-name" placeholder="e.g. My voice" value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div className="space-y-1.5">
						<Label>Recording</Label>
						<Button variant="outline" className="w-full justify-start" onClick={() => void window.kroma.kvsPickRecording().then((p) => p && setFile(p))}>
							<FileAudio /> <span className="truncate">{file ? file.split("/").pop() : "Choose an audio or video file…"}</span>
						</Button>
					</div>
					<label className="flex items-start gap-2.5 text-xs leading-relaxed">
						<Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
						<span>This is my voice, or I have the speaker's permission to clone it. I won't use it to pretend to be someone or to mislead people.</span>
					</label>
					<TaskProgress prefix="clone" />
				</div>
				<DialogFooter>
					<Button variant="outline" disabled={cloning} onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button disabled={!file || !consent || cloning} onClick={() => void clone()}>
						{cloning ? "Cloning…" : "Clone voice"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
