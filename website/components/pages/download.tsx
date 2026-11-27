import Link from "next/link";
import { ArrowRight, ArrowUpRight, RotateCw } from "lucide-react";
import { DownloadCards } from "@/components/site/downloads";
import { Reveal } from "@/components/site/reveal";
import { releases } from "@/lib/github";
import { type Lang, localize, messages } from "@/lib/i18n";
import { RELEASES_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Notes } from "./changelog";

const wrap = "mx-auto w-[min(1180px,100%-32px)]";

/** The Download page: a card per system, requirements, what's new in the latest version, older versions. */
export async function DownloadPage({ lang }: { lang: Lang }) {
	const m = messages[lang];
	const t = m.downloadPage;
	const d = m.download;
	const L = (href: string) => localize(href, lang);
	const list = await releases();
	const latest = list[0];
	const date = (s: string) => new Date(s).toLocaleDateString(lang === "km" ? "km-KH" : "en", { year: "numeric", month: "long", day: "numeric" });
	return (
		<main>
			<section className={cn(wrap, "relative pt-12 md:pt-16")}>
				<div aria-hidden className="pointer-events-none absolute inset-x-[10%] -top-10 -z-10 h-[360px] bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
				<p className="text-[12.5px] font-medium tracking-[0.08em] text-brand uppercase">{t.kicker}</p>
				<h1 className="mt-2 text-[clamp(32px,5vw,52px)] font-semibold">{t.title}</h1>
				<p className="mt-4 max-w-[64ch] text-[16px] text-muted-foreground">{t.sub}</p>
				{latest && (
					<p className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] text-muted-foreground">
						<span className="size-1.5 rounded-full bg-success" />
						<span className="text-foreground tabular-nums">{latest.tag}</span> · {t.released} {date(latest.date)}
					</p>
				)}
				<DownloadCards lang={lang} />
			</section>

			<section className={cn(wrap, "grid gap-10 pt-20 lg:grid-cols-2")}>
				<Reveal>
					<h2 className="text-[22px] font-semibold">{t.requirementsTitle}</h2>
					<dl className="mt-5 divide-y rounded-lg border">
						{t.requirements.map(([k, v]) => (
							<div key={k} className="grid grid-cols-[110px_1fr] gap-4 px-4 py-3 text-[13.5px]">
								<dt className="text-muted-foreground">{k}</dt>
								<dd className="m-0">{v}</dd>
							</div>
						))}
					</dl>
					<Link href={L("/docs/0.1/installation/")} className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand no-underline hover:underline">
						{t.installGuide} <ArrowRight className="size-3.5" />
					</Link>
				</Reveal>
				<Reveal delay={0.05}>
					<h2 className="text-[22px] font-semibold">{d.after}</h2>
					<ol className="mt-5 grid list-none gap-3 p-0 text-[13.5px]">
						{[
							<>
								<strong className="font-medium">{d.afterSteps.key[0]}</strong>
								<span className="text-muted-foreground">{d.afterSteps.key[1]}</span>
							</>,
							<>
								<strong className="font-medium">{d.afterSteps.link[0]}</strong>
								<span className="text-muted-foreground">
									{d.afterSteps.link[1]}
									<em>{d.afterSteps.link[2]}</em>
									{d.afterSteps.link[3]}
								</span>
							</>,
							<>
								<strong className="font-medium">{d.afterSteps.guide[0]}</strong>
								<span className="text-muted-foreground">
									{d.afterSteps.guide[1]}
									<Link href={L("/docs/")} className="underline underline-offset-2">
										{d.afterSteps.guide[2]}
									</Link>
									{d.afterSteps.guide[3]}
								</span>
							</>,
						].map((step, i) => (
							<li key={i} className="flex gap-3">
								<span className="grid size-6 shrink-0 place-items-center rounded-full border text-xs text-muted-foreground tabular-nums">{i + 1}</span>
								<span className="pt-0.5">{step}</span>
							</li>
						))}
					</ol>
					<div className="mt-6 flex gap-3 rounded-lg border border-dashed p-4">
						<RotateCw className="mt-0.5 size-4 shrink-0 text-brand" />
						<div>
							<p className="text-[13.5px] font-medium">{t.updatesTitle}</p>
							<p className="mt-1 text-[13px] text-muted-foreground">{t.updatesText}</p>
						</div>
					</div>
				</Reveal>
			</section>

			{latest && (
				<section className={cn(wrap, "pt-20")}>
					<Reveal>
						<div className="rounded-lg border p-6 md:p-8">
							<div className="flex flex-wrap items-baseline justify-between gap-3">
								<h2 className="text-[22px] font-semibold">
									{t.whatsNew} <span className="text-brand">{latest.tag}</span>
								</h2>
								<Link href={L("/changelog/")} className="inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground no-underline hover:text-foreground">
									{m.nav.changelog} <ArrowRight className="size-3.5" />
								</Link>
							</div>
							<p className="mt-1 text-xs text-muted-foreground">{date(latest.date)}</p>
							<Notes body={latest.body} />
						</div>
					</Reveal>
				</section>
			)}

			{list.length > 1 && (
				<section className={cn(wrap, "pt-20")}>
					<Reveal>
						<h2 className="text-[22px] font-semibold">{t.olderTitle}</h2>
						<p className="mt-2 text-muted-foreground">{t.olderSub}</p>
						<ul className="mt-6 grid list-none divide-y rounded-lg border p-0">
							{list.slice(1).map((r) => (
								<li key={r.tag} className="flex items-center justify-between gap-4 px-4 py-3 text-[13.5px]">
									<span>
										<span className="font-medium tabular-nums">{r.tag}</span>
										<span className="ml-3 text-muted-foreground">{date(r.date)}</span>
									</span>
									<a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground no-underline hover:text-foreground">
										{t.view} <ArrowUpRight className="size-3.5" />
									</a>
								</li>
							))}
						</ul>
						<a href={RELEASES_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand no-underline hover:underline">
							{t.allReleases} <ArrowUpRight className="size-3.5" />
						</a>
					</Reveal>
				</section>
			)}
		</main>
	);
}
