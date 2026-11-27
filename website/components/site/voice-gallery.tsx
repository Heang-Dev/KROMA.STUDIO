"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import voices from "@/lib/voices.json";
import { type Lang, messages } from "@/lib/i18n";
import { asset } from "@/lib/site";
import { cn } from "@/lib/utils";

// A lineup of Kroma's preset Khmer voices (after getartcraft.com's numbered cards): press play to hear each one.
// The player is the same as Kroma's (WaveformPlayer): the sample's real waveform fills as it plays, click or drag on
// it to jump, the times underneath, and only one voice sounds at a time.

const GROUP: Record<string, string> = {
	"Narrator (deep male)": "Narration",
	"Narrator (clear female)": "Narration",
	"Storyteller (warm grandfather)": "Narration",
	"King (majestic)": "Palace",
	"Queen (elegant)": "Palace",
	"Princess (gentle)": "Palace",
	"Young man (hero)": "Heroes",
	"General (bold warrior)": "Heroes",
	"Old monk (wise)": "Family",
	"Young girl": "Children",
	"Villainess (cruel)": "Villains",
	"Ghost story (whisper)": "Mood",
};

let current: HTMLAudioElement | null = null;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function VoicePlayer({ file, seconds, peaks, label, playText, pauseText, onPlaying }: { file: string; seconds: number; peaks: number[]; label: string; playText: string; pauseText: string; onPlaying: (on: boolean) => void }) {
	const [playing, setPlaying] = useState(false);
	const [time, setTime] = useState(0);
	const [duration, setDuration] = useState(seconds);
	const audio = useRef<HTMLAudioElement | null>(null);
	const dragging = useRef(false);

	useEffect(() => () => audio.current?.pause(), []);
	useEffect(() => onPlaying(playing), [playing, onPlaying]);

	// The sound loads on first use, so the page doesn't download every sample up front.
	const element = () => {
		if (audio.current) return audio.current;
		const el = new Audio(asset(file));
		el.preload = "auto";
		el.onloadedmetadata = () => setDuration(el.duration);
		el.ontimeupdate = () => !dragging.current && setTime(el.currentTime);
		el.onplay = () => setPlaying(true);
		el.onpause = () => setPlaying(false);
		el.onended = () => {
			setPlaying(false);
			setTime(0);
			el.currentTime = 0;
		};
		audio.current = el;
		return el;
	};
	const play = (el: HTMLAudioElement) => {
		if (current && current !== el) current.pause();
		current = el;
		void el.play().catch(() => setPlaying(false));
	};
	const toggle = () => {
		const el = element();
		if (!el.paused) el.pause();
		else play(el);
	};

	const at = (e: React.PointerEvent<HTMLDivElement>) => {
		const r = e.currentTarget.getBoundingClientRect();
		return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * duration;
	};
	const seekTo = (t: number, start: boolean) => {
		const el = element();
		setTime(t);
		// Before the sound has loaded, jumping is ignored by the browser: jump once it knows the length.
		if (el.readyState >= 1) el.currentTime = t;
		else el.addEventListener("loadedmetadata", () => (el.currentTime = t), { once: true });
		if (start && el.paused) play(el);
	};

	const progress = duration ? time / duration : 0;
	return (
		<div className="space-y-1">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={toggle}
					aria-label={`${playing ? pauseText : playText} ${label}`}
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
				>
					{playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
				</button>
				<div
					role="slider"
					tabIndex={0}
					aria-label={label}
					aria-valuemin={0}
					aria-valuemax={Math.round(duration)}
					aria-valuenow={Math.round(time)}
					aria-valuetext={`${clock(time)} / ${clock(duration)}`}
					className="flex h-9 min-w-0 flex-1 cursor-pointer touch-none items-center gap-[2px] rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
					onPointerDown={(e) => {
						dragging.current = true;
						e.currentTarget.setPointerCapture(e.pointerId);
						setTime(at(e));
					}}
					onPointerMove={(e) => dragging.current && setTime(at(e))}
					onPointerUp={(e) => {
						if (!dragging.current) return;
						dragging.current = false;
						seekTo(at(e), true);
					}}
					onPointerCancel={() => (dragging.current = false)}
					onKeyDown={(e) => {
						const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
						if (step) {
							e.preventDefault();
							seekTo(Math.min(duration, Math.max(0, time + step)), false);
						} else if (e.key === " " || e.key === "Enter") {
							e.preventDefault();
							toggle();
						}
					}}
				>
					{peaks.map((p, i) => (
						<span key={i} className={cn("pointer-events-none w-full rounded-full transition-colors duration-100", i / peaks.length < progress ? "bg-foreground" : "bg-foreground/25")} style={{ height: `${Math.round(p * 100)}%` }} />
					))}
				</div>
			</div>
			<div className="flex justify-between pl-11 text-[10px] tabular-nums text-muted-foreground">
				<span>{clock(time)}</span>
				<span>{clock(duration)}</span>
			</div>
		</div>
	);
}

export function VoiceGallery({ lang }: { lang: Lang }) {
	const t = messages[lang].voices;
	const [playing, setPlaying] = useState<number | null>(null);
	const setters = useRef(new Map<number, (on: boolean) => void>());
	const onPlaying = (i: number) => {
		let f = setters.current.get(i);
		if (!f) {
			f = (on: boolean) => setPlaying((p) => (on ? i : p === i ? null : p));
			setters.current.set(i, f);
		}
		return f;
	};

	return (
		<div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{voices.map((v, i) => (
				<div key={v.name} className={cn("flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors", playing === i && "border-ring")}>
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="text-[11px] text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</p>
							<h3 className="truncate text-[14px] font-semibold">{v.name}</h3>
						</div>
						<span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{GROUP[v.name] ? t.groups[GROUP[v.name] as keyof typeof t.groups] : "Preset"}</span>
					</div>
					<VoicePlayer file={v.file} seconds={v.seconds} peaks={v.peaks} label={v.name} playText={t.play} pauseText={t.pause} onPlaying={onPlaying(i)} />
					<p lang="km" className="line-clamp-2 font-khmer text-[13px] leading-relaxed text-muted-foreground">
						{v.transcript}
					</p>
				</div>
			))}
		</div>
	);
}
