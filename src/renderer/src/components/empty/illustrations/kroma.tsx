import type { ReactNode } from "react";

import { Dot, Ground, line, Plus, Sparkle, tint } from "./parts";

/** Kroma's own scenes: videos, downloads, voices, stories, subtitles, characters, posts and the batch queue. */
export const kromaScenes = {
	// A film frame with a play button — "no videos yet".
	video: (
		<>
			<Ground />
			<path d="M40 28h80v56H40z" className={line} />
			<path d="M46 34h68v44H46z" {...tint} className="stroke-none" />
			{[32, 44, 56, 68, 80].map((y) => (
				<path key={y} d={`M42.5 ${y}h0M117.5 ${y}h0`} className="stroke-foreground/50" strokeWidth="2.5" />
			))}
			<circle cx="80" cy="56" r="12" className="fill-card stroke-current" strokeWidth="1.5" />
			<path d="M76 50v12l10-6z" className="fill-current stroke-current" fillOpacity={0.6} />
			<Plus x={28} y={26} />
			<Dot x={132} y={84} />
			<Sparkle x={130} y={24} />
		</>
	),
	// A tray with an arrow coming down — "nothing downloading".
	download: (
		<>
			<Ground />
			<path d="M46 64h68v24H46z" className={line} />
			<path d="M46 64l10-14h48l10 14" {...tint} className="stroke-foreground/70" />
			<path d="M62 74h36" className="stroke-foreground/30" />
			<path d="M80 18v36m-12-12l12 12 12-12" className="fill-none stroke-current" strokeWidth="2.5" />
			<Plus x={30} y={30} />
			<Dot x={130} y={36} />
			<Sparkle x={124} y={18} />
		</>
	),
	// A microphone with sound waves — "no voices yet".
	voice: (
		<>
			<Ground rx={36} />
			<path d="M70 26a10 10 0 0 1 20 0v26a10 10 0 0 1-20 0z" {...tint} className="stroke-foreground/70" />
			<path d="M76 30h8M76 37h8M76 44h8" className="stroke-foreground/30" />
			<path d="M62 50a18 18 0 0 0 36 0" className="fill-none stroke-foreground/70" />
			<path d="M80 68v16m-10 0h20" className="stroke-foreground/70" />
			<path d="M108 34a14 14 0 0 1 0 22M116 28a24 24 0 0 1 0 34" className="fill-none stroke-current" strokeWidth="1.5" />
			<path d="M52 34a14 14 0 0 0 0 22M44 28a24 24 0 0 0 0 34" className="fill-none stroke-current" strokeWidth="1.5" />
			<Plus x={28} y={84} />
			<Dot x={134} y={84} />
		</>
	),
	// An open book with a bookmark — "no stories yet".
	story: (
		<>
			<Ground rx={48} />
			<path d="M80 34c-10-6-24-8-38-6v54c14-2 28 0 38 6z" className={line} />
			<path d="M80 34c10-6 24-8 38-6v54c-14-2-28 0-38 6z" {...tint} className="stroke-foreground/70" />
			<path d="M50 40c8-1 16 0 22 3M50 50c8-1 16 0 22 3M50 60c8-1 16 0 22 3" className="fill-none stroke-foreground/30" />
			<path d="M88 43c6-3 14-4 22-3M88 53c6-3 14-4 22-3" className="fill-none stroke-foreground/30" />
			<path d="M100 29v22l5-4 5 4V28" className="fill-current stroke-current" fillOpacity={0.4} />
			<Sparkle x={30} y={22} />
			<Dot x={134} y={20} />
		</>
	),
	// A screen with subtitle lines — "no subtitles yet".
	subtitles: (
		<>
			<Ground />
			<path d="M36 22h88v58H36z" className={line} />
			<path d="M42 28h76v46H42z" {...tint} className="stroke-none" />
			<path d="M60 58h40v6H60zM52 67h56" className="stroke-current" strokeWidth="1.5" />
			<path d="M60 61h40" className="stroke-current" strokeWidth="3" strokeOpacity={0.3} />
			<path d="M70 80l-4 8m24-8l4 8" className="stroke-foreground/70" />
			<Plus x={24} y={30} />
			<Dot x={138} y={30} />
		</>
	),
	// Two speech bubbles — "no characters / no posts yet".
	chat: (
		<>
			<Ground />
			<path d="M38 26h54v32H58l-10 10V58H38z" className={line} />
			<path d="M46 36h38M46 44h26" className="stroke-foreground/30" />
			<path d="M72 50h52v30h-10v10l-10-10H72z" {...tint} className="stroke-current" />
			<path d="M80 60h36M80 68h22" className="stroke-current" strokeOpacity={0.5} />
			<Sparkle x={128} y={28} />
			<Dot x={28} y={84} />
		</>
	),
	// A stack of cards with steps ticked on top — "nothing to process".
	queue: (
		<>
			<Ground />
			<path d="M52 66h60v20H52z" className={line} />
			<path d="M46 50h68v20H46z" className={line} />
			<path d="M40 30h80v24H40z" {...tint} className="stroke-foreground/70" />
			{[50, 64, 78].map((x) => (
				<circle key={x} cx={x} cy="42" r="4" className="fill-card stroke-current" />
			))}
			<path d="M48 42l1.5 1.5 3-3M62 42l1.5 1.5 3-3" className="fill-none stroke-current" />
			<path d="M88 42h24" className="stroke-foreground/30" />
			<path d="M54 60h30M60 76h24" className="stroke-foreground/30" />
			<Plus x={26} y={28} />
			<Dot x={134} y={76} />
		</>
	),
} satisfies Record<string, ReactNode>;
