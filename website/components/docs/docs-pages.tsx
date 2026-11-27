import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { type Lang, localize } from "@/lib/i18n";
import { docGroups, docPage, docsVersions } from "@/lib/docs";
import { DOCS_TEXT, DocsShell } from "./docs-shell";

/** A version's start page: every group and its pages, like Laravel's docs home. */
export function DocsIndex({ version, lang }: { version: string; lang: Lang }) {
	const t = DOCS_TEXT[lang];
	const label = docsVersions().find((v) => v.version === version)?.label ?? version;
	return (
		<DocsShell version={version} lang={lang}>
			<p className="text-[12.5px] tracking-[0.08em] text-muted-foreground uppercase">v{label}</p>
			<h1 className="mt-2 text-[clamp(30px,4.5vw,44px)] font-semibold">{t.docs}</h1>
			<p className="mt-3 max-w-[60ch] text-muted-foreground">{t.intro}</p>
			<div className="mt-10 grid gap-3 sm:grid-cols-2">
				{docGroups(version, lang).map((g) => (
					<div key={g.group} className="rounded-lg border bg-card p-5">
						<h2 className="text-[15px] font-semibold">{g.group}</h2>
						<ul className="mt-3 grid list-none gap-1.5 p-0 text-[13.5px]">
							{g.pages.map((p) => (
								<li key={p.slug}>
									<Link href={localize(`/docs/${version}/${p.slug}/`, lang)} className="group inline-flex items-center gap-1.5 text-muted-foreground no-underline hover:text-foreground">
										{p.title} <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</DocsShell>
	);
}

/** One docs page. */
export async function DocsArticle({ version, lang, slug }: { version: string; lang: Lang; slug: string }) {
	const page = await docPage(version, lang, slug);
	return (
		<DocsShell version={version} lang={lang} page={page}>
			<p className="text-[12.5px] tracking-[0.08em] text-muted-foreground uppercase">{page.group}</p>
			<h1 className="mt-2 text-[clamp(28px,4vw,40px)] font-semibold">{page.title}</h1>
			<div className="docs-prose mt-6" dangerouslySetInnerHTML={{ __html: page.html }} />
		</DocsShell>
	);
}
