"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import voices from "@/lib/voices.json";
import { asset } from "@/lib/site";
import { cn } from "@/lib/utils";

// A lineup of Kroma's preset Khmer voices (after getartcraft.com's numbered cards): press play to hear each one.

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

// Fixed bar heights per card, so the server and the browser draw the same thing.
const bars = (seed: number) => Array.from({ length: 28 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(seed * 7.1 + i * 1.37) * Math.cos(i * 0.61 + seed)));

export function VoiceGallery() {
	const [playing, setPlaying] = useState<number | null>(null);
	const [progress, setProgress] = useState(0);
	const audio = useRef<HTMLAudioElement | null>(null);

	useEffect(() => () => audio.current?.pause(), []);

	const toggle = (i: number) => {
		if (playing === i) {
			audio.current?.pause();
			setPlaying(null);
			return;
		}
		audio.current?.pause();
		const el = new Audio(asset(voices[i].file));
		audio.current = el;
		el.ontimeupdate = () => setProgress(el.duration ? el.currentTime / el.duration : 0);
		el.onended = () => setPlaying((p) => (p === i ? null : p));
		setProgress(0);
		setPlaying(i);
		void el.play().catch(() => setPlaying(null));
	};

	return (
		<div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{voices.map((v, i) => {
				const on = playing === i;
				return (
					<div key={v.name} className={cn("group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors", on && "border-ring")}>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<p className="text-[11px] text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</p>
								<h3 className="truncate text-[14px] font-semibold">{v.name}</h3>
							</div>
							<span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{GROUP[v.name] ?? "Preset"}</span>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => toggle(i)}
								aria-label={on ? `Pause ${v.name}` : `Play ${v.name}`}
								className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
							>
								{on ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
							</button>
							<div className="flex h-8 flex-1 items-center gap-[3px]" aria-hidden>
								{bars(i + 1).map((h, b) => (
									<motion.span
										key={b}
										className={cn("w-full rounded-full", on && b / 28 < progress ? "bg-foreground" : "bg-foreground/25")}
										style={{ height: `${Math.round(h * 100)}%` }}
										animate={on ? { scaleY: [1, 0.55 + (b % 3) * 0.2, 1] } : { scaleY: 1 }}
										transition={on ? { duration: 0.7 + (b % 5) * 0.08, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
									/>
								))}
							</div>
							<span className="w-9 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">{v.seconds.toFixed(0)}s</span>
						</div>
						<p lang="km" className="line-clamp-2 font-khmer text-[13px] leading-relaxed text-muted-foreground">
							{v.transcript}
						</p>
					</div>
				);
			})}
		</div>
	);
}
