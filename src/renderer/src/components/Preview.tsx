import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { ASPECT_SIZE } from "@shared/types";
import { planVoice } from "@shared/voice";
import { voiceCues, voiceSettings } from "@/lib/actions";
import { captionWords, drawCue, ensureFonts } from "@/lib/subtitleRender";
import { motionAt, wordShares } from "@shared/captionMotion";
import { type PlacedClip, cueAt, formatTime, placeClips, totalDuration } from "@/lib/timeline";
import { languageOf } from "@shared/languages";
import { useEditor } from "@/state/store";
import { ObjectLayer } from "./ObjectLayer";
import { IconButton } from "./common";

export { mediaUrl } from "@shared/media";
import { mediaUrl } from "@shared/media";
import { EmptyIllustration } from "@/components/empty/EmptyState";
import { t } from "@shared/i18n";

export function Preview() {
	const project = useEditor((s) => s.project);
	const seekVersion = useEditor((s) => s.seekVersion);
	const playing = useEditor((s) => s.playing);
	const videoRef = useRef<HTMLVideoElement>(null);
	const bgRef = useRef<HTMLCanvasElement>(null);
	const areaRef = useRef<HTMLDivElement>(null);
	const current = useRef<PlacedClip | null>(null);
	const switching = useRef(false);
	const [box, setBox] = useState({ width: 0, height: 0 });

	const output = ASPECT_SIZE[project.aspect];
	const placed = placeClips(project.clips);
	const total = totalDuration(project.clips);

	// Fit the output frame into the available area.
	useLayoutEffect(() => {
		const el = areaRef.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			const scale = Math.min(width / output.width, height / output.height);
			setBox({ width: Math.floor(output.width * scale), height: Math.floor(output.height * scale) });
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [output.width, output.height]);

	const drawBackground = useCallback(() => {
		const video = videoRef.current;
		const canvas = bgRef.current;
		if (!video || !canvas || project.fit !== "blur" || video.readyState < 2) return;
		const ctx = canvas.getContext("2d")!;
		const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
		const w = video.videoWidth * scale;
		const h = video.videoHeight * scale;
		ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
	}, [project.fit]);

	// Switching format or fit makes a fresh background canvas: paint it from the current frame.
	useEffect(() => {
		const frame = requestAnimationFrame(drawBackground);
		return () => cancelAnimationFrame(frame);
	}, [drawBackground, project.aspect, box.width, box.height]);

	/** Points the video element at timeline time t. */
	const loadAt = useCallback(
		(t: number, play: boolean) => {
			const video = videoRef.current;
			if (!video) return;
			const clips = placeClips(useEditor.getState().project.clips);
			const clip = clips.find((c) => t >= c.start && t < c.end) ?? clips[clips.length - 1];
			if (!clip) {
				video.removeAttribute("src");
				video.load();
				current.current = null;
				return;
			}
			const media = useEditor.getState().project.media.find((m) => m.id === clip.mediaId);
			if (!media) return;
			const src = mediaUrl(media.path);
			const target = clip.in + Math.max(0, Math.min(t, clip.end) - clip.start);
			current.current = clip;
			const start = () => {
				video.currentTime = target;
				if (play) void video.play().catch(() => useEditor.getState().setPlaying(false));
			};
			if (video.dataset.src !== src) {
				switching.current = true;
				video.dataset.src = src;
				video.src = src;
				video.addEventListener(
					"loadedmetadata",
					() => {
						start();
						switching.current = false;
					},
					{ once: true },
				);
			} else start();
		},
		[],
	);

	// User seeks and timeline edits move the video.
	useEffect(() => {
		loadAt(useEditor.getState().time, useEditor.getState().playing);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [seekVersion, project.clips, loadAt]);

	// Playback loop: follow the video, hop to the next clip at each clip's end.
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		if (!playing) {
			video.pause();
			return;
		}
		const state = useEditor.getState();
		const t0 = state.time >= total - 0.05 ? 0 : state.time;
		if (t0 !== state.time) state.setTime(0);
		loadAt(t0, true);

		let frame = 0;
		const tick = () => {
			frame = requestAnimationFrame(tick);
			const clip = current.current;
			if (!clip || switching.current || video.seeking) return;
			const clips = placeClips(useEditor.getState().project.clips);
			if (video.currentTime >= clip.out - 0.03 || video.ended) {
				const next = clips[clips.findIndex((c) => c.id === clip.id) + 1];
				if (!next) {
					useEditor.getState().setPlaying(false);
					useEditor.getState().setTime(clip.end);
					return;
				}
				if (next.mediaId === clip.mediaId && Math.abs(next.in - clip.out) < 0.05) current.current = next;
				else loadAt(next.start, true);
				return;
			}
			useEditor.getState().setTime(clip.start + (video.currentTime - clip.in));
			drawBackground();
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [playing, loadAt, drawBackground, total]);

	const togglePlay = () => total > 0 && useEditor.getState().setPlaying(!useEditor.getState().playing);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div ref={areaRef} className="relative flex min-h-0 flex-1 items-center justify-center p-4">
				{placed.length === 0 ? (
					<EmptyState />
				) : (
					<div className="relative overflow-hidden bg-black ring-1 ring-border" style={{ width: box.width, height: box.height }} onClick={togglePlay}>
						{project.fit === "blur" && (
							<canvas ref={bgRef} width={64} height={Math.round((64 * output.height) / output.width)} className="absolute inset-0 size-full scale-110 blur-xl brightness-75" />
						)}
						<video
							ref={videoRef}
							className="absolute inset-0 size-full"
							style={{ objectFit: project.fit === "fill" ? "cover" : "contain" }}
							playsInline
							onSeeked={drawBackground}
							onLoadedData={drawBackground}
						/>
						<ObjectLayer width={box.width} height={box.height} />
						<SubtitleCanvas width={box.width} height={box.height} />
						<VoicePlayer videoRef={videoRef} />
					</div>
				)}
			</div>
			<Transport total={total} playing={playing} onToggle={togglePlay} />
		</div>
	);
}

function SubtitleCanvas({ width, height }: { width: number; height: number }) {
	const ref = useRef<HTMLCanvasElement>(null);
	const time = useEditor((s) => s.time);
	const cues = useEditor((s) => s.project.cues);
	const style = useEditor((s) => s.project.style);
	const aspect = useEditor((s) => s.project.aspect);
	const index = cueAt(cues, time);
	const cue = index >= 0 ? cues[index] : null;
	// Draw again once the subtitle fonts have loaded (a style's font may not be in use anywhere yet).
	const [fontsReady, setFontsReady] = useState(false);
	useEffect(() => {
		void ensureFonts().then(() => setFontsReady(true));
	}, []);

	// An animated caption changes while it's on screen: work out the moment (rounded, so it redraws only when it shows).
	const output = ASPECT_SIZE[aspect];
	const shares = useMemo(() => (cue && style.animation && style.animation !== "none" ? wordShares(captionWords(cue, style, output)) : []), [cue, style, output]);
	const motion = cue ? motionAt(style.animation, shares, cue.end - cue.start, time - cue.start) : undefined;
	const motionKey = motion ? `${motion.word ?? ""}:${motion.enter === undefined ? "" : Math.round(motion.enter * 20)}` : "";

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		const ctx = canvas.getContext("2d")!;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (!cue) return;
		ctx.scale(canvas.width / output.width, canvas.height / output.height);
		drawCue(ctx, cue, style, output, motion);
		// motion is read through motionKey (it changes only when what's drawn changes).
	}, [cue, style, output, width, height, fontsReady, motionKey]);

	return <canvas ref={ref} className="pointer-events-none absolute inset-0 size-full" />;
}

/** Plays the Khmer voice line under the playhead while the timeline plays, with the original sound turned down. */
function VoicePlayer({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
	const playing = useEditor((s) => s.playing);
	const project = useEditor((s) => s.project);
	// Which voice line is playing now, by the planned timing (a long line may start a little after its subtitle).
	const lines = useMemo(() => voiceCues(project), [project]);
	const plan = useMemo(() => planVoice(lines), [lines]);
	const activeIndex = useEditor((s) => {
		const t = s.time;
		for (let i = 0; i < plan.length; i++) if (t >= plan[i].start && t < plan[i].end) return i;
		return -1;
	});
	const audio = useRef<HTMLAudioElement | null>(null);
	const voice = voiceSettings(project);
	const enabled = voice.enabled && Object.keys(voice.lines).length > 0;

	// With "Remove the original voices", the video is muted and its voice-free background plays in step with it.
	const replacing = voice.enabled && Boolean(voice.removeVoices);
	const background = useRef<HTMLAudioElement | null>(null);
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		video.muted = replacing;
		if (!replacing) video.volume = enabled ? voice.originalVolume : 1;
	});
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !replacing) {
			background.current?.pause();
			return;
		}
		const sync = () => {
			const src = video.dataset.src ?? "";
			const media = useEditor.getState().project.media.find((m) => mediaUrl(m.path) === src);
			const path = media ? voiceSettings(useEditor.getState().project).backgrounds?.[media.id] : undefined;
			if (!path) return background.current?.pause();
			const el = background.current ?? (background.current = new Audio());
			const url = mediaUrl(path);
			if (el.dataset.src !== url) {
				el.dataset.src = url;
				el.src = url;
			}
			el.volume = Math.min(1, voiceSettings(useEditor.getState().project).backgroundVolume ?? 1);
			if (Math.abs(el.currentTime - video.currentTime) > 0.25) el.currentTime = video.currentTime;
			if (video.paused) el.pause();
			else if (el.paused) void el.play().catch(() => undefined);
		};
		const events = ["play", "pause", "seeked", "timeupdate", "loadedmetadata"] as const;
		events.forEach((e) => video.addEventListener(e, sync));
		sync();
		return () => {
			events.forEach((e) => video.removeEventListener(e, sync));
			background.current?.pause();
		};
	}, [replacing, videoRef]);

	useEffect(() => {
		if (!playing || !enabled) {
			audio.current?.pause();
			return;
		}
		if (activeIndex < 0) return; // between lines: let the last one finish
		const line = lines[activeIndex];
		const { start, tempo } = plan[activeIndex];
		audio.current?.pause();
		const el = new Audio(mediaUrl(line.path));
		el.playbackRate = tempo;
		el.currentTime = Math.max(0, useEditor.getState().time - start) * tempo;
		audio.current = el;
		void el.play().catch(() => undefined);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeIndex, playing, enabled]);

	useEffect(() => () => audio.current?.pause(), []);
	return null;
}

function Transport({ total, playing, onToggle }: { total: number; playing: boolean; onToggle: () => void }) {
	const time = useEditor((s) => s.time);
	const seek = useEditor((s) => s.seek);
	return (
		<div className="flex h-11 shrink-0 items-center justify-center gap-1 border-t border-border">
			<span className="w-28 text-right font-mono text-xs tabular-nums text-foreground">{formatTime(time, true)}</span>
			<IconButton label={t("Back 5 seconds (Shift + ←)")} onClick={() => seek(time - 5)} disabled={!total}>
				<SkipBack className="size-4" />
			</IconButton>
			<IconButton label={playing ? t("Pause (Space)") : t("Play (Space)")} onClick={onToggle} disabled={!total} className="size-9 text-foreground">
				{playing ? <Pause className="size-5" /> : <Play className="size-5" />}
			</IconButton>
			<IconButton label={t("Forward 5 seconds (Shift + →)")} onClick={() => seek(time + 5)} disabled={!total}>
				<SkipForward className="size-4" />
			</IconButton>
			<span className="w-28 font-mono text-xs tabular-nums text-muted-foreground">{formatTime(total, true)}</span>
		</div>
	);
}

function EmptyState() {
	const target = languageOf(useEditor((s) => s.project.language));
	const [before, after] = t("Paste a video link or import a file on the left. Then press {button}.").split("{button}");
	return (
		<div className="flex max-w-sm flex-col items-center text-center">
			<EmptyIllustration scene="video" className="mb-3 h-28" />
			<p className="font-khmer text-2xl font-semibold text-foreground">សូមស្វាគមន៍</p>
			<p className="mt-2 text-sm text-muted-foreground">
				{before}
				<span className="text-primary">{t("Make {language} subtitles", { language: t(target.name) })}</span>
				{after}
			</p>
		</div>
	);
}
