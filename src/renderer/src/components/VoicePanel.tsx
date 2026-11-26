import { useRef } from "react";
import { Play, Volume2 } from "lucide-react";
import { KHMER_VOICES } from "@shared/types";
import { Button } from "@/components/ui/button";
import { linesNeedingVoice, makeVoiceOver, setVoice, voiceSettings } from "@/lib/actions";
import { useEditor } from "@/state/store";
import { mediaUrl } from "./Preview";
import { Card, ChoiceTiles, ProgressBar, Section, SliderField, SwitchRow, TaskProgress, useBusy } from "./common";

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
			<Section title="Khmer voice-over" hint="Reads the Khmer subtitles aloud with a natural Khmer voice, timed to each line, over the original sound. Free, runs in the cloud.">
				<ChoiceTiles
					label="Voice"
					value={voice.voice}
					options={KHMER_VOICES.map((v) => ({ value: v.id, label: v.label.split(" ")[0], description: v.label.includes("female") ? "Female" : "Male" }))}
					onChange={(id) => setVoice({ voice: id })}
				/>
				<Card>
					<SliderField label="Speed" value={voice.rate} min={-30} max={50} step={5} format={(v) => `${v > 0 ? "+" : ""}${v}%`} onChange={(v) => setVoice({ rate: v })} />
				</Card>
				<Button className="h-auto min-h-9 w-full whitespace-normal py-2 leading-snug" disabled={!translated || busy} onClick={() => void makeVoiceOver()}>
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
						{voiced > 0 && <p className="text-xs text-muted-foreground">Changing the voice or speed re-voices every line.</p>}
					</div>
				) : (
					<p className="text-xs text-muted-foreground">Make the Khmer subtitles first.</p>
				)}
				<TaskProgress prefix="voice" />
			</Section>

			<Section title="Mix">
				<Card>
					<SwitchRow label="Use the voice-over" description="In the preview and the export." checked={voice.enabled} onChange={(v) => setVoice({ enabled: v })} />
					<SliderField label="Original sound" value={voice.originalVolume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setVoice({ originalVolume: v })} />
				</Card>
				<Button variant="outline" size="sm" className="w-full h-auto min-h-8 whitespace-normal py-1.5 leading-snug" disabled={!voiced} onClick={playSample}>
					<Play /> Hear the first line
				</Button>
			</Section>
		</>
	);
}
