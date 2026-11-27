import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/site/brand-icons";
import { DownloadCards, HeroDownload } from "@/components/site/downloads";
import { Reveal } from "@/components/site/reveal";
import { Showcase } from "@/components/site/showcase";
import { VoiceGallery } from "@/components/site/voice-gallery";
import { WindowShot } from "@/components/site/window-shot";
import { type Lang, localize, messages } from "@/lib/i18n";
import { GITHUB_URL, asset, communityLinks } from "@/lib/site";
import { cn } from "@/lib/utils";

const wrap = "mx-auto w-[min(1180px,100%-32px)]";

// The images for the feature blocks, in the order of the dictionary's features.
const FEATURE_SHOTS = ["/assets/translate-dark.jpg", "/assets/editor-dark.jpg", "/assets/post-dark.jpg"];
const FEATURE_IDS = ["translate", "characters", "posting"];

// Kroma Studio's home page. Layout after orca.dev (announcement pill, tabbed product showcase, feature blocks,
// comparison table, FAQ) and getartcraft.com (numbered sections, a lineup of real items, principles grid, community
// band), on the app's own design tokens and components.






/** "01 / How it works", a heading and a line under it (getartcraft.com's numbered sections). */
function SectionHead({ n, kicker, title, sub }: { n: number; kicker: string; title: string; sub?: string }) {
	return (
		<Reveal>
			<p className="text-[12.5px] tracking-[0.08em] text-muted-foreground uppercase">
				<span className="text-foreground tabular-nums">{String(n).padStart(2, "0")}</span> / {kicker}
			</p>
			<h2 className="mt-2.5 max-w-[32ch] text-[clamp(26px,3.6vw,38px)] font-semibold">{title}</h2>
			{sub && <p className="mt-3.5 max-w-[64ch] text-muted-foreground">{sub}</p>}
		</Reveal>
	);
}

function Checks({ items }: { items: string[] }) {
	return (
		<ul className="mt-5 grid list-none gap-2.5 p-0 text-[13.5px]">
			{items.map((item) => (
				<li key={item} className="flex gap-2.5">
					<Check className="mt-0.5 size-4 shrink-0 text-success" />
					{item}
				</li>
			))}
		</ul>
	);
}

const section = cn(wrap, "pt-20 md:pt-28");

export function HomePage({ lang }: { lang: Lang }) {
	const community = communityLinks();
	const t = messages[lang];
	const L = (href: string) => localize(href, lang);
	return (
		<main id="top">
			{/* Hero */}
			<section className={cn(wrap, "relative flex flex-col items-center pt-14 pb-11 text-center md:pt-22")}>
				<div aria-hidden className="pointer-events-none absolute inset-x-[10%] -top-10 -z-10 h-[420px] bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
				<Reveal>
					<Link href={L("/#posting")} className="inline-flex items-center gap-2.5 rounded-full border bg-background py-1 pr-3 pl-1 text-[12.5px] text-muted-foreground no-underline hover:text-foreground">
						<span className="rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">{t.hero.pillTag}</span>
						{t.hero.pill} <ArrowRight className="size-3.5" />
					</Link>
				</Reveal>
				<Reveal delay={0.05}>
					<p className="mt-7 text-[12.5px] tracking-wide text-muted-foreground">{t.hero.eyebrow}</p>
					<h1 className="mx-auto mt-3.5 max-w-[21ch] text-[clamp(36px,6vw,64px)] font-semibold">
						{t.hero.titleBefore}{" "}
						<span lang="km" className="font-khmer tracking-normal">
							ខ្មែរ
						</span>
						{t.hero.titleAfter ? ` ${t.hero.titleAfter}` : ""}
					</h1>
					<p className="mx-auto mt-5 max-w-[62ch] text-[16.5px] text-muted-foreground">
						{t.hero.lead}
					</p>
				</Reveal>
				<Reveal delay={0.1}>
					<HeroDownload lang={lang} />
					<p className="mx-auto mt-6 max-w-[60ch] text-[12.5px] text-muted-foreground">{t.hero.trust}</p>
				</Reveal>
			</section>

			{/* Product showcase */}
			<section className={cn(wrap, "pb-4")}>
				<Reveal delay={0.15}>
					<Showcase lang={lang} />
				</Reveal>
			</section>

			{/* 01 Workflow */}
			<section id="workflow" className={section}>
				<SectionHead n={1} kicker={t.workflow.kicker} title={t.workflow.title} sub={t.workflow.sub} />
				<Reveal>
					<ol className="mt-10 grid list-none gap-px overflow-hidden rounded-lg border bg-border p-0 md:grid-cols-3">
						{t.workflow.steps.map(([title, text], i) => (
							<li key={title} className="group bg-background p-6">
								<span className="inline-grid size-6 place-items-center rounded-full border text-xs text-muted-foreground transition-colors group-hover:border-success group-hover:bg-success group-hover:text-white">{i + 1}</span>
								<h3 className="mt-3.5 text-base font-semibold">{title}</h3>
								<p className="mt-2 text-[13.5px] text-muted-foreground">{text}</p>
							</li>
						))}
					</ol>
				</Reveal>
			</section>

			{/* 02 Features */}
			<section id="features" className={section}>
				<SectionHead n={2} kicker={t.features.kicker} title={t.features.title} />
				{t.features.items.map((f, i) => (
					<Reveal key={FEATURE_IDS[i]}>
						<article id={FEATURE_IDS[i]} className={cn("mt-16 grid scroll-mt-20 items-center gap-6 md:gap-12", i % 2 ? "md:grid-cols-[7fr_5fr]" : "md:grid-cols-[5fr_7fr]")}>
							<div className={cn(i % 2 && "md:order-2")}>
								<h3 className="text-[22px] font-semibold">{f.title}</h3>
								<p className="mt-3 text-muted-foreground">{f.text}</p>
								<Checks items={f.points} />
							</div>
							<WindowShot src={FEATURE_SHOTS[i]} alt={f.alt} className="rounded-lg" />
						</article>
					</Reveal>
				))}
			</section>

			{/* 03 Voices */}
			<section id="voices" className={section}>
				<SectionHead n={3} kicker={t.voices.kicker} title={t.voices.title} sub={t.voices.sub} />
				<Reveal>
					<VoiceGallery lang={lang} />
				</Reveal>
			</section>

			{/* 04 Principles */}
			<section className={section}>
				<SectionHead n={4} kicker={t.principles.kicker} title={t.principles.title} />
				<div className="mt-10 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
					{t.principles.items.map(([title, text], i) => (
						<Reveal key={title} delay={(i % 3) * 0.05} className="bg-background p-6">
							<p className="text-[11px] text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</p>
							<h3 className="mt-2 text-[15px] font-semibold">{title}</h3>
							<p className="mt-2 text-[13.5px] text-muted-foreground">{text}</p>
						</Reveal>
					))}
				</div>
			</section>

			{/* 05 Compare */}
			<section className={section}>
				<SectionHead n={5} kicker={t.compare.kicker} title={t.compare.title} sub={t.compare.sub} />
				<Reveal>
					<div className="mt-10 overflow-x-auto rounded-lg border">
						<table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]">
							<thead>
								<tr className="border-b bg-muted/50">
									<th className="px-5 py-3 font-medium text-muted-foreground">{t.compare.head[0]}</th>
									<th className="px-5 py-3 font-medium text-muted-foreground">{t.compare.head[1]}</th>
									<th className="px-5 py-3 font-semibold">{t.compare.head[2]}</th>
								</tr>
							</thead>
							<tbody>
								{t.compare.rows.map(([task, hand, kroma]) => (
									<tr key={task} className="border-b last:border-0">
										<td className="px-5 py-3">{task}</td>
										<td className="px-5 py-3 text-muted-foreground">
											<span className="flex items-center gap-2">
												<Minus className="size-3.5 shrink-0" /> {hand}
											</span>
										</td>
										<td className="px-5 py-3">
											<span className="flex items-center gap-2">
												<Check className="size-3.5 shrink-0 text-success" /> {kroma}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Reveal>
			</section>

			{/* 06 Download */}
			<section id="download" className={section}>
				<SectionHead n={6} kicker={t.download.kicker} title={t.download.title} sub={t.download.sub} />
				<Reveal>
					<DownloadCards lang={lang} />
					<div className="mt-7 rounded-lg border border-dashed p-5">
						<h3 className="text-[15px] font-semibold">{t.download.after}</h3>
						<ol className="mt-3 grid list-decimal gap-2 pl-5 text-[13.5px] text-muted-foreground">
							<li>
								<strong className="font-medium text-foreground">{t.download.afterSteps.key[0]}</strong>
								{t.download.afterSteps.key[1]}
							</li>
							<li>
								<strong className="font-medium text-foreground">{t.download.afterSteps.link[0]}</strong>
								{t.download.afterSteps.link[1]}
								<em>{t.download.afterSteps.link[2]}</em>
								{t.download.afterSteps.link[3]}
							</li>
							<li>
								<strong className="font-medium text-foreground">{t.download.afterSteps.guide[0]}</strong>
								{t.download.afterSteps.guide[1]}
								<Link href={L("/docs/")} className="underline underline-offset-2">
									{t.download.afterSteps.guide[2]}
								</Link>
								{t.download.afterSteps.guide[3]}
							</li>
						</ol>
					</div>
				</Reveal>
			</section>

			{/* 07 FAQ */}
			<section id="faq" className="mx-auto w-[min(780px,100%-32px)] pt-20 md:pt-28">
				<SectionHead n={7} kicker={t.faq.kicker} title={t.faq.title} />
				<Reveal>
					<div className="mt-8 border-t">
						{t.faq.items.map(([q, a]) => (
							<details key={q} className="group border-b py-4.5">
								<summary className="flex cursor-pointer list-none justify-between gap-4 font-medium after:text-muted-foreground after:content-['+'] group-open:after:content-['−']">{q}</summary>
								<p className="mt-2.5 text-sm text-muted-foreground">{a}</p>
							</details>
						))}
					</div>
				</Reveal>
			</section>

			{/* Community band */}
			<section className={cn(wrap, "mt-28")}>
				<Reveal className="flex flex-col items-center gap-4 rounded-lg border bg-card bg-[radial-gradient(closest-side,var(--glow),transparent)] bg-[length:70%_120%] bg-center bg-no-repeat px-6 py-16 text-center">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={asset("/assets/icon.png")} alt="" width={64} height={64} className="rounded-[14px]" />
					<h2 className="text-[clamp(26px,3.6vw,36px)] font-semibold">{t.community.title}</h2>
					<p className="max-w-[58ch] text-muted-foreground">{t.community.text}</p>
					<div className="mt-2 flex flex-wrap justify-center gap-2.5">
						<Button asChild size="lg" className="h-11 px-5 text-[15px]">
							<Link href={L("/download/")}>{t.nav.download}</Link>
						</Button>
						<Button asChild size="lg" variant="outline" className="h-11 px-5 text-[15px]">
							<a href={GITHUB_URL} target="_blank" rel="noreferrer">
								<BrandIcon name="github" /> {t.community.star}
							</a>
						</Button>
						{community.map((c) => (
							<Button key={c.name} asChild size="lg" variant="outline" className="h-11 px-5 text-[15px]">
								<a href={c.href} target="_blank" rel="noreferrer">
									<BrandIcon name={c.name} /> {c.label}
								</a>
							</Button>
						))}
					</div>
				</Reveal>
			</section>
		</main>
	);
}
