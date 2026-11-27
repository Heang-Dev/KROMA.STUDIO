import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "./Preview";

// A KVS-style player: play button, waveform bars that fill as it plays (click to seek), and the times.
// Only one player sounds at a time across the app. Every player looks the same at any width: bars are always
// BAR_PX wide with GAP_PX between them, and a wider player shows more of them (not fatter ones).

/** Detail kept per recording; bars are made from it for whatever width the player has. */
const DETAIL = 1024;
const BAR_PX = 2;
const GAP_PX = 2;
const peaksCache = new Map<string, number[]>();
let current: HTMLAudioElement | null = null;

async function loadPeaks(url: string): Promise<number[]> {
	const cached = peaksCache.get(url);
	if (cached) return cached;
	const data = await (await fetch(url)).arrayBuffer();
	const ctx = new AudioContext();
	try {
		const buffer = await ctx.decodeAudioData(data);
		const samples = buffer.getChannelData(0);
		const per = Math.floor(samples.length / DETAIL) || 1;
		const peaks: number[] = [];
		for (let i = 0; i < DETAIL; i++) {
			let peak = 0;
			for (let j = i * per; j < Math.min(samples.length, (i + 1) * per); j += 8) peak = Math.max(peak, Math.abs(samples[j]));
			peaks.push(peak);
		}
		const loudest = Math.max(...peaks, 0.01);
		const normalised = peaks.map((p) => Math.max(0.06, p / loudest));
		peaksCache.set(url, normalised);
		return normalised;
	} finally {
		void ctx.close();
	}
}

/** `count` bars from the detailed outline: each bar is the loudest point of its stretch. */
export function barsFrom(detail: number[], count: number): number[] {
	if (count <= 0) return [];
	if (!detail.length) return Array.from({ length: count }, () => 0.08);
	return Array.from({ length: count }, (_, i) => {
		const from = Math.floor((i * detail.length) / count);
		const to = Math.max(from + 1, Math.floor(((i + 1) * detail.length) / count));
		let peak = 0;
		for (let j = from; j < to && j < detail.length; j++) peak = Math.max(peak, detail[j]);
		return peak;
	});
}

/** How many bars fit in an element, kept current as it resizes. */
function useBarCount(): [React.RefCallback<HTMLDivElement>, number] {
	const [count, setCount] = useState(0);
	const observer = useRef<ResizeObserver | null>(null);
	const ref = useCallback((el: HTMLDivElement | null) => {
		observer.current?.disconnect();
		if (!el) return;
		const measure = () => setCount(Math.max(8, Math.floor((el.clientWidth + GAP_PX) / (BAR_PX + GAP_PX))));
		measure();
		observer.current = new ResizeObserver(measure);
		observer.current.observe(el);
	}, []);
	return [ref, count];
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** `path` is a local file; `resolve` fetches one on demand (e.g. an Instant voice sample made on first play). */
export function WaveformPlayer({ path, resolve, className }: { path?: string | null; resolve?: () => Promise<string | null>; className?: string }) {
	const [file, setFile] = useState(path ?? null);
	const [peaks, setPeaks] = useState<number[] | null>(null);
	const [playing, setPlaying] = useState(false);
	const [loading, setLoading] = useState(false);
	const [time, setTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const audio = useRef<HTMLAudioElement | null>(null);
	const [barsRef, barCount] = useBarCount();

	useEffect(() => setFile(path ?? null), [path]);
	useEffect(() => {
		if (!file) return;
		let alive = true;
		const url = mediaUrl(file);
		void loadPeaks(url)
			.then((p) => alive && setPeaks(p))
			.catch(() => alive && setPeaks(null));
		const el = new Audio(url);
		el.preload = "metadata";
		el.onloadedmetadata = () => setDuration(el.duration);
		el.ontimeupdate = () => setTime(el.currentTime);
		el.onended = () => {
			setPlaying(false);
			setTime(0);
		};
		el.onpause = () => setPlaying(false);
		el.onplay = () => setPlaying(true);
		audio.current = el;
		return () => {
			alive = false;
			el.pause();
			if (current === el) current = null;
		};
	}, [file]);

	const toggle = useCallback(async () => {
		let el = audio.current;
		if (!file && resolve) {
			setLoading(true);
			try {
				const got = await resolve();
				setFile(got);
			} finally {
				setLoading(false);
			}
			return; // the effect above makes the element; the next click plays (or we play right away below)
		}
		if (!el) return;
		if (!el.paused) return el.pause();
		if (current && current !== el) current.pause();
		current = el;
		await el.play().catch(() => undefined);
	}, [file, resolve]);

	// Play right after an on-demand sample arrives.
	const wantPlay = useRef(false);
	useEffect(() => {
		if (wantPlay.current && audio.current) {
			wantPlay.current = false;
			if (current && current !== audio.current) current.pause();
			current = audio.current;
			void audio.current.play().catch(() => undefined);
		}
	}, [file]);

	const seek = (e: React.MouseEvent<HTMLDivElement>) => {
		const el = audio.current;
		if (!el || !duration) return;
		const rect = e.currentTarget.getBoundingClientRect();
		el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
		setTime(el.currentTime);
	};

	const progress = duration ? time / duration : 0;
	const bars = barsFrom(peaks ?? [], barCount);
	return (
		<div className={cn("space-y-1", className)}>
			<div className="flex items-center gap-3">
				<button
					type="button"
					aria-label={playing ? "Pause" : "Play"}
					onClick={() => {
						if (!file && resolve) wantPlay.current = true;
						void toggle();
					}}
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105"
				>
					{loading ? <Loader2 className="size-4 animate-spin" /> : playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
				</button>
				<div
					ref={barsRef}
					className="flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-between overflow-hidden"
					onClick={seek}
					role="slider"
					aria-label="Position"
					aria-valuenow={Math.round(time)}
					aria-valuemax={Math.round(duration)}
				>
					{bars.map((p, i) => (
						<span key={i} className={cn("shrink-0 rounded-full", (i + 0.5) / bars.length < progress ? "bg-foreground" : "bg-foreground/25")} style={{ width: BAR_PX, height: `${Math.round(p * 100)}%` }} />
					))}
				</div>
			</div>
			<div className="flex justify-between pl-11 text-[10px] tabular-nums text-muted-foreground">
				<span>{clock(time)}</span>
				<span>{duration ? clock(duration) : "--:--"}</span>
			</div>
		</div>
	);
}
