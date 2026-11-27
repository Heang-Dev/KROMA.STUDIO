import Link from "next/link";
import { ArrowRight, Mic, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";
import { VoiceGallery } from "@/components/site/voice-gallery";
import { type Lang, localize, messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import voiceList from "@/lib/voice-list.json";
import samples from "@/lib/voices.json";

const wrap = "mx-auto w-[min(1180px,100%-32px)]";
const KIND_ICONS = [Sparkles, Zap, Mic];

/** The Voices page: the samples to listen to, all 36 preset voices by kind, the three kinds, and how to use them. */
export function VoicesPage({ lang }: { lang: Lang }) {
	const t = messages[lang].voicesPage;
	const v = messages[lang].voices;
	const L = (href: string) => localize(href, lang);
	const withSample = new Set(samples.map((s) => s.name));
	return (
		<main>
			<section className={cn(wrap, "relative pt-12 md:pt-16")}>
				<div aria-hidden className="pointer-events-none absolute inset-x-[10%] -top-10 -z-10 h-[360px] bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
				<p className="text-[12.5px] font-medium tracking-[0.08em] text-brand uppercase">{t.kicker}</p>
				<h1 className="mt-2 max-w-[24ch] text-[clamp(32px,5vw,52px)] font-semibold">{t.title}</h1>
				<p className="mt-4 max-w-[64ch] text-[16px] text-muted-foreground">{t.sub}</p>
			</section>

			<section className={cn(wrap, "pt-14")}>
				<h2 className="text-[22px] font-semibold">{t.samplesTitle}</h2>
				<p className="mt-2 text-muted-foreground">{t.samplesSub}</p>
				<Reveal>
					<VoiceGallery lang={lang} />
				</Reveal>
			</section>

			<section className={cn(wrap, "pt-20")}>
				<h2 className="text-[22px] font-semibold">{t.allTitle}</h2>
				<p className="mt-2 text-muted-foreground">{t.allSub}</p>
				<div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-2">
					{voiceList.map((g) => (
						<Reveal key={g.title}>
							<div>
								<h3 className="flex items-baseline justify-between border-b pb-2 text-[14px] font-semibold">
									{t.groups[g.title] ?? g.title}
									<span className="text-xs font-normal text-muted-foreground tabular-nums">{g.voices.length}</span>
								</h3>
								<ul className="grid list-none divide-y p-0">
									{g.voices.map((voice) => (
										<li key={voice.name} className="py-3">
											<p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
												{voice.name}
												{withSample.has(voice.name) && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-normal text-brand">{t.samples}</span>}
											</p>
											<p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{voice.description}</p>
										</li>
									))}
								</ul>
							</div>
						</Reveal>
					))}
				</div>
			</section>

			<section className={cn(wrap, "pt-20")}>
				<h2 className="text-[22px] font-semibold">{t.kindsTitle}</h2>
				<div className="mt-8 grid gap-3 md:grid-cols-3">
					{t.kinds.map(([title, text], i) => {
						const Icon = KIND_ICONS[i];
						return (
							<Reveal key={title} delay={i * 0.05}>
								<div className="h-full rounded-lg border bg-card p-5">
									<span className="grid size-8 place-items-center rounded-md bg-brand/10 text-brand">
										<Icon className="size-4" />
									</span>
									<h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
									<p className="mt-2 text-[13.5px] text-muted-foreground">{text}</p>
								</div>
							</Reveal>
						);
					})}
				</div>
			</section>

			<section className={cn(wrap, "pt-20")}>
				<div className="grid gap-8 rounded-lg border p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
					<div>
						<h2 className="text-[22px] font-semibold">{t.howTitle}</h2>
						<ol className="mt-5 grid list-none gap-3 p-0">
							{t.howSteps.map((step, i) => (
								<li key={step} className="flex gap-3 text-[14px]">
									<span className="grid size-6 shrink-0 place-items-center rounded-full border text-xs text-muted-foreground tabular-nums">{i + 1}</span>
									<span className="pt-0.5">{step}</span>
								</li>
							))}
						</ol>
					</div>
					<div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
						<Button asChild>
							<Link href={L("/download/")}>{t.cta}</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href={L("/docs/0.1/characters-and-voices/")}>
								{t.guide} <ArrowRight />
							</Link>
						</Button>
					</div>
				</div>
				<p className="sr-only">{v.title}</p>
			</section>
		</main>
	);
}
