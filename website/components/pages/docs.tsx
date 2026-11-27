import { CopyCode } from "@/components/site/downloads";
import { Rich } from "@/components/site/rich";
import type { Lang } from "@/lib/i18n";
import { docs } from "@/lib/i18n/docs";

const wrap = "mx-auto w-[min(1180px,100%-32px)]";

/** The guide, with a contents sidebar that stays in view. */
export function DocsPage({ lang }: { lang: Lang }) {
	const d = docs[lang];
	const text = "text-[14.5px] leading-7 text-muted-foreground";
	return (
		<main className={`${wrap} grid gap-10 pt-12 pb-10 md:grid-cols-[210px_1fr] md:pt-16`}>
			<aside className="md:sticky md:top-24 md:self-start">
				<p className="text-xs tracking-wider text-muted-foreground uppercase">{d.toc}</p>
				<nav aria-label={d.toc} className="mt-3 grid gap-1 text-[13.5px]">
					{d.sections.map((s) => (
						<a key={s.id} href={`#${s.id}`} className="rounded-md px-2 py-1 text-muted-foreground no-underline hover:bg-accent hover:text-foreground">
							{s.title}
						</a>
					))}
				</nav>
			</aside>
			<article className="max-w-[72ch]">
				<p className="text-[12.5px] tracking-[0.08em] text-muted-foreground uppercase">{d.kicker}</p>
				<h1 className="mt-2 text-[clamp(30px,4.5vw,44px)] font-semibold">{d.title}</h1>
				<p className={`mt-4 ${text}`}>
					<Rich text={d.intro} lang={lang} />
				</p>
				<div className="mt-12">
					{d.sections.map((s, i) => (
						<section key={s.id}>
							<h2 id={s.id} className={`${i ? "mt-14" : ""} scroll-mt-24 border-b pb-2 text-[22px] font-semibold`}>
								{s.title}
							</h2>
							{s.blocks.map((b, k) =>
								"p" in b ? (
									<p key={k} className={`mt-4 ${text}`}>
										<Rich text={b.p} lang={lang} />
									</p>
								) : "code" in b ? (
									<CopyCode key={k} code={b.code} lang={lang} />
								) : (
									<ol key={k} className={`mt-4 grid list-decimal gap-2.5 pl-5 marker:text-foreground ${text}`}>
										{b.steps.map((step, n) => (
											<li key={n}>
												<Rich text={typeof step === "string" ? step : step.text} lang={lang} />
												{typeof step !== "string" && <CopyCode code={step.code} lang={lang} />}
											</li>
										))}
									</ol>
								),
							)}
						</section>
					))}
				</div>
			</article>
		</main>
	);
}
