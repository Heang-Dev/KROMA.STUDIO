import { useEffect, useRef, useState } from "react";
import { Mic, RefreshCw, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WaveformPlayer } from "./WaveformPlayer";
import { t } from "@shared/i18n";

// Record a voice to clone, right in the app: read the text aloud (about 15 s), watch the level, listen back, redo.
// Reading a known text means the engine needn't write down what was said .

/** Everyday Khmer to read aloud, ~15 s each, varied sounds and tones, no numbers or names. */
export const READ_ALOUD = [
	"ព្រឹកនេះ អាកាសធាតុស្រស់ស្រាយណាស់។ ខ្ញុំក្រោកពីដំណេកលឿន ហើយដើរទៅផ្សារជាមួយមិត្តភក្ដិ។ យើងទិញបន្លែ ត្រីស្រស់ និងផ្លែឈើខ្លះ។ ពេលត្រឡប់មកផ្ទះវិញ ខ្ញុំចម្អិនសម្លកកូរ ហើយក្រុមគ្រួសារអង្គុយញ៉ាំបាយជុំគ្នាយ៉ាងសប្បាយ។",
	"ពេលល្ងាច ខ្យល់បក់ត្រជាក់ពីមាត់ទន្លេ។ ក្មេងៗរត់លេងនៅលើវាលស្មៅ ចំណែកចាស់ៗអង្គុយផឹកតែ ហើយជជែកគ្នាលេងយ៉ាងរីករាយ។ មេឃប្រែជាពណ៌ទឹកក្រូច រួចក្លាយជាពណ៌ស្វាយ។ ខ្ញុំចូលចិត្តពេលវេលាស្ងប់ស្ងាត់បែបនេះណាស់ ព្រោះវាធ្វើឱ្យចិត្តខ្ញុំធូរស្រាល។",
	"សូមអរគុណដែលបានមកលេងផ្ទះខ្ញុំថ្ងៃនេះ។ តើអ្នកចង់ផឹកកាហ្វេទឹកដោះគោ ឬទឹកក្រូចឆ្មារត្រជាក់? បើអ្នកឃ្លាន ខ្ញុំមាននំបញ្ចុកដែលម្ដាយខ្ញុំទើបតែធ្វើរួច។ ចាំបន្តិចណា ខ្ញុំទៅយកចាន និងស្លាបព្រាមកឱ្យ។ សុំទោសផង ផ្ទះខ្ញុំរញ៉េរញ៉ៃបន្តិច!",
];

const MAX_SECONDS = 20;
const MIN_SECONDS = 5;
const BARS = 32;

type State = { kind: "idle" } | { kind: "asking" } | { kind: "recording"; since: number } | { kind: "saving" } | { kind: "done"; path: string; seconds: number } | { kind: "error"; message: string; settings?: boolean };

/** Calls onChange with the saved WAV and the text that was read (or null after "Record again"). */
export function VoiceRecorder({ onChange }: { onChange: (recording: { path: string; transcript: string } | null) => void }) {
	const [script, setScript] = useState(0);
	const [state, setState] = useState<State>({ kind: "idle" });
	const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
	const [elapsed, setElapsed] = useState(0);
	const [device, setDevice] = useState("");
	const stop = useRef<(() => void) | null>(null);
	const text = READ_ALOUD[script];

	// Leaving the dialog mid-recording releases the microphone.
	useEffect(() => () => stop.current?.(), []);

	const start = async () => {
		setState({ kind: "asking" });
		const access = await window.kroma.micAccess();
		if (access !== "granted") {
			setState({ kind: "error", message: t("Kroma isn't allowed to use the microphone. Turn it on in System Settings → Privacy & Security → Microphone, then try again."), settings: true });
			return;
		}
		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
		} catch (err) {
			setState({ kind: "error", message: t("Couldn't open the microphone: {error}", { error: (err as Error).message }) });
			return;
		}
		setDevice(stream.getAudioTracks()[0]?.label ?? "");
		const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
		const chunks: Blob[] = [];
		recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

		// Level meter: the loudness of the last moments, scrolling left.
		const ctx = new AudioContext();
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 1024;
		ctx.createMediaStreamSource(stream).connect(analyser);
		const samples = new Float32Array(analyser.fftSize);
		const since = performance.now();
		let frame = 0;
		let lastBar = 0;
		const tick = (now: number) => {
			analyser.getFloatTimeDomainData(samples);
			let peak = 0;
			for (const v of samples) peak = Math.max(peak, Math.abs(v));
			const seconds = (now - since) / 1000;
			setElapsed(seconds);
			if (now - lastBar > 90) {
				lastBar = now;
				setLevels((l) => [...l.slice(1), Math.min(1, peak * 1.6)]);
			}
			if (seconds >= MAX_SECONDS) return finish();
			frame = requestAnimationFrame(tick);
		};

		const release = () => {
			cancelAnimationFrame(frame);
			for (const track of stream.getTracks()) track.stop();
			void ctx.close();
			stop.current = null;
		};
		const finish = () => {
			if (recorder.state === "inactive") return;
			recorder.onstop = async () => {
				release();
				const seconds = (performance.now() - since) / 1000;
				if (seconds < MIN_SECONDS) {
					setState({ kind: "error", message: t("That was only {seconds} s. Read the whole text: at least {min} seconds.", { seconds: seconds.toFixed(1), min: MIN_SECONDS }) });
					return;
				}
				setState({ kind: "saving" });
				try {
					const bytes = new Uint8Array(await new Blob(chunks, { type: "audio/webm" }).arrayBuffer());
					const path = await window.kroma.saveRecording(bytes);
					setState({ kind: "done", path, seconds });
					onChange({ path, transcript: text });
				} catch (err) {
					setState({ kind: "error", message: t("Couldn't save the recording: {error}", { error: (err as Error).message }) });
				}
			};
			recorder.stop();
		};
		stop.current = () => {
			recorder.onstop = null;
			if (recorder.state !== "inactive") recorder.stop();
			release();
		};

		recorder.start(250);
		setLevels(Array(BARS).fill(0));
		setState({ kind: "recording", since });
		frame = requestAnimationFrame(tick);
		// The Stop button calls this.
		stopRecording.current = finish;
	};
	const stopRecording = useRef<(() => void) | null>(null);

	const again = () => {
		setState({ kind: "idle" });
		setElapsed(0);
		onChange(null);
	};

	const recording = state.kind === "recording";
	return (
		<div className="space-y-3">
			<div className="rounded-lg border bg-muted/40 p-3">
				<div className="mb-1.5 flex items-center justify-between">
					<span className="text-[11px] text-muted-foreground">{t("Read this aloud, clearly and at an easy pace")}</span>
					<Button variant="ghost" size="xs" disabled={recording || state.kind === "done"} onClick={() => setScript((s) => (s + 1) % READ_ALOUD.length)}>
						<RefreshCw /> {t("Another text")}
					</Button>
				</div>
				<p lang="km" className={cn("font-khmer text-[15px] leading-loose select-text", recording && "text-foreground")}>
					{text}
				</p>
			</div>

			{state.kind === "done" ? (
				<div className="space-y-2 rounded-lg border p-3">
					<WaveformPlayer path={state.path} />
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>{t("Recorded {seconds} s. Listen back: it should be clear, with no music or echo.", { seconds: state.seconds.toFixed(1) })}</span>
						<Button variant="outline" size="xs" onClick={again}>
							<RotateCcw /> {t("Record again")}
						</Button>
					</div>
				</div>
			) : (
				<div className="flex items-center gap-3 rounded-lg border p-3">
					<button
						type="button"
						aria-label={recording ? t("Stop recording") : t("Start recording")}
						disabled={state.kind === "asking" || state.kind === "saving"}
						onClick={() => (recording ? stopRecording.current?.() : void start())}
						className={cn(
							"flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-50",
							recording ? "bg-destructive" : "bg-red-500",
						)}
					>
						{recording ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
					</button>
					<div className="min-w-0 flex-1">
						<div className="flex h-8 items-center gap-[3px]" aria-hidden>
							{levels.map((l, i) => (
								<span key={i} className={cn("w-full rounded-full transition-[height]", recording ? "bg-red-500/80" : "bg-foreground/15")} style={{ height: `${Math.max(8, l * 100)}%` }} />
							))}
						</div>
						<div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
							<span>
								{recording
									? elapsed < MIN_SECONDS
										? t("Recording… keep reading")
										: t("Recording… press stop when you finish the text")
									: state.kind === "asking"
										? t("Asking for the microphone…")
										: state.kind === "saving"
											? t("Saving…")
											: t("Press the red button and start reading")}
							</span>
							<span>
								{elapsed.toFixed(0)} / {MAX_SECONDS} s
							</span>
						</div>
					</div>
				</div>
			)}
			{device && recording && <p className="text-[11px] text-muted-foreground">{t("Microphone: {device}", { device })}</p>}
			{state.kind === "error" && (
				<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
					{state.message}
					{state.settings && (
						<Button variant="outline" size="xs" className="mt-2 block" onClick={() => void window.kroma.openMicSettings()}>
							{t("Open Microphone settings")}
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
