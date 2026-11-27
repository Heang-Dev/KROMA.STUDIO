"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { type Lang, messages } from "@/lib/i18n";
import { asset } from "@/lib/site";
import { cn } from "@/lib/utils";

// The hero showcase, like orca.dev's: a row of tabs under one big framed screenshot. It moves on by itself (paused
// while the pointer is over it, and off for reduced motion); clicking a tab picks it. All shots stay loaded and
// crossfade, so the page never jumps.

const TABS = [
	{ id: "characters", label: "Characters", src: "/assets/editor-dark.jpg", light: "/assets/editor-light.jpg", alt: "The editor with Khmer subtitles and the Characters panel: the Narrator and the Young man each with their own voice." },
	{ id: "download", label: "Download", src: "/assets/media-dark.jpg", alt: "The Media panel: paste a link from YouTube, Bilibili, Douyin and 1,000+ sites." },
	{ id: "translate", label: "Translate", src: "/assets/translate-dark.jpg", alt: "The Translate panel turning the Chinese lines into Khmer." },
	{ id: "voices", label: "Voices", src: "/assets/voices-dark.jpg", alt: "The Voices library: King, Emperor, Queen, Prince, Princess and more, each with a player." },
	{ id: "style", label: "Style", src: "/assets/style-dark.jpg", alt: "The Style panel for the Khmer subtitles." },
	{ id: "post", label: "Post", src: "/assets/post-dark.jpg", alt: "The Post panel with titles, text and hashtags for YouTube, Facebook and TikTok." },
];
const SECONDS = 6;

export function Showcase({ lang }: { lang: Lang }) {
	const t = messages[lang].showcase;
	const [active, setActive] = useState(0);
	const [paused, setPaused] = useState(false);
	const reduced = useReducedMotion();
	const auto = !paused && !reduced;

	useEffect(() => {
		if (!auto) return;
		const t = setTimeout(() => setActive((a) => (a + 1) % TABS.length), SECONDS * 1000);
		return () => clearTimeout(t);
	}, [active, auto]);

	return (
		<div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
			<div role="tablist" aria-label={t.label} className="mx-auto mb-5 flex w-fit max-w-full overflow-x-auto rounded-lg border bg-background p-1">
				{TABS.map((tab, i) => (
					<button
						key={tab.id}
						role="tab"
						type="button"
						aria-selected={i === active}
						aria-controls="showcase-shot"
						onClick={() => setActive(i)}
						className={cn("relative shrink-0 rounded-md px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors", i === active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
					>
						{i === active && <motion.span layoutId="showcase-pill" className="absolute inset-0 rounded-md bg-accent" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
						<span className="relative">{t.tabs[tab.id as keyof typeof t.tabs]}</span>
						{/* How long until the next tab. */}
						{i === active && auto && (
							<motion.span key={`bar-${active}`} className="absolute inset-x-2 bottom-0 h-px origin-left bg-foreground/50" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: SECONDS, ease: "linear" }} />
						)}
					</button>
				))}
			</div>

			<figure id="showcase-shot" role="tabpanel" className="relative m-0 aspect-[1600/1000] overflow-hidden rounded-[10px] bg-card shadow-[0_30px_80px_-30px_rgb(0_0_0/0.25),0_0_0_1px_var(--border)] dark:shadow-[0_30px_90px_-20px_rgb(0_0_0/0.8),0_0_0_1px_var(--border)]">
				{TABS.map((tab, i) => (
					<motion.div key={tab.id} className="absolute inset-0" initial={false} animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.012 }} transition={{ duration: 0.45, ease: "easeOut" }} aria-hidden={i !== active}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={asset(tab.src)} alt={tab.alt} width={2400} height={1500} loading={i === 0 ? "eager" : "lazy"} className={cn("block h-full w-full object-cover", tab.light && "hidden dark:block")} />
						{tab.light && (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={asset(tab.light)} alt={tab.alt} width={2400} height={1500} className="block h-full w-full object-cover dark:hidden" />
						)}
					</motion.div>
				))}
				{/* The window buttons, where macOS draws them (outside the captured page). */}
				<div aria-hidden className="absolute top-[1.15%] left-[1.05%] flex w-[6%] gap-[0.5%]">
					<span className="aspect-square w-[12.5%] rounded-full bg-[#ff5f57]" />
					<span className="aspect-square w-[12.5%] rounded-full bg-[#febc2e]" />
					<span className="aspect-square w-[12.5%] rounded-full bg-[#28c840]" />
				</div>
			</figure>
		</div>
	);
}
