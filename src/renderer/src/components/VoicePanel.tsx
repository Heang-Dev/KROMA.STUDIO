import { useRef } from "react";
import { Play, SpeakerHigh } from "@phosphor-icons/react";
import { KHMER_VOICES } from "@shared/types";
import { linesNeedingVoice, makeVoiceOver, setVoice, voiceSettings } from "@/lib/actions";
import { useEditor } from "@/state/store";
import { mediaUrl } from "./Preview";
import { Button, Label, Section, TaskProgress, inputClass, useBusy } from "./ui";

export function VoicePanel() {
	const project = useEditor((s) => s.project);
	const voice = voiceSettings(project);
	const busy = useBusy("voice");
	const translated = project.cues.filter((c) => c.text.trim()).length;
	const missing = linesNeedingVoice(project).length;
	const voiced = translated - missing;
	const sample = useRef<HTMLAudioElement | null>(null);

	const playSample = () => {
		const first = project.cues.find((c) => voice.lines[c.id]?.text === c.text.trim());
		if (!first) return;
		sample.current?.pause();
		sample.current = new Audio(mediaUrl(voice.lines[first.id].path));
		void sample.current.play();
	};

	return (
		<>
			<Section title="Khmer voice-over" hint="Reads the Khmer subtitles aloud with a natural Khmer voice, timed to each line, over the original sound turned down. Free, and runs in the cloud.">
				<Label>Voice</Label>
				<div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
					{KHMER_VOICES.map((v) => (
						<button
							key={v.id}
							type="button"
							onClick={() => setVoice({ voice: v.id })}
							className={`rounded px-2 py-1.5 text-xs transition-colors ${voice.voice === v.id ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}
						>
							{v.label}
						</button>
					))}
				</div>
				<label className="mb-3 block">
					<span className="mb-1 flex justify-between text-xs text-muted">
						<span>Speed</span>
						<span className="tabular-nums text-fg">{voice.rate > 0 ? "+" : ""}{voice.rate}%</span>
					</span>
					<input type="range" min={-30} max={50} step={5} value={voice.rate} onChange={(e) => setVoice({ rate: Number(e.target.value) })} className="w-full accent-[var(--color-accent)]" />
				</label>
				<Button variant="primary" className="h-10 w-full text-sm" disabled={!translated || busy} onClick={() => void makeVoiceOver()}>
					<SpeakerHigh size={17} weight="fill" /> {voiced && missing ? `Voice the ${missing} new lines` : "Make voice-over"}
				</Button>
				<p className="mt-2 text-xs text-dim">
					{!translated ? "Make the Khmer subtitles first." : `${voiced} of ${translated} lines voiced.${voiced ? " Changing the voice or speed re-voices every line." : ""}`}
				</p>
				<TaskProgress prefix="voice" />
			</Section>

			<Section title="Mix">
				<label className="mb-4 flex cursor-pointer items-center gap-2.5 text-[13px]">
					<input type="checkbox" checked={voice.enabled} onChange={(e) => setVoice({ enabled: e.target.checked })} className="size-4 accent-[var(--color-accent)]" />
					Use the voice-over (preview and export)
				</label>
				<label className="block">
					<span className="mb-1 flex justify-between text-xs text-muted">
						<span>Original sound under the voice</span>
						<span className="tabular-nums text-fg">{Math.round(voice.originalVolume * 100)}%</span>
					</span>
					<input type="range" min={0} max={1} step={0.05} value={voice.originalVolume} onChange={(e) => setVoice({ originalVolume: Number(e.target.value) })} className="w-full accent-[var(--color-accent)]" />
				</label>
				<Button className="mt-3 w-full" disabled={!voiced} onClick={playSample}>
					<Play size={14} weight="fill" /> Hear the first line
				</Button>
			</Section>
		</>
	);
}
