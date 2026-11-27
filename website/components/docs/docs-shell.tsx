import Link from "next/link";
import { ArrowLeft, ArrowRight, Pencil, TriangleAlert } from "lucide-react";
import { type Lang, localize } from "@/lib/i18n";
import { type DocPage, docGroups, docPages, docsVersions } from "@/lib/docs";
import { GITHUB_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { CodeCopy } from "./code-copy";
import { VersionPicker } from "./version-picker";

// The docs layout, like Laravel's and Tailwind's: versions and pages on the left, the page in the middle,
// "On this page" on the right, previous / next at the bottom.

export const DOCS_TEXT = {
	en: { docs: "Documentation", latest: "latest", onThisPage: "On this page", edit: "Edit this page on GitHub", prev: "Previous", next: "Next", old: (v: string, latest: string) => `You're reading the docs for Kroma ${v}. The latest version is ${latest}.`, toLatest: "Go to the latest docs", intro: "Everything about Kroma Studio, from installing it to posting your videos.", copy: "Copy", copied: "Copied" },
	km: { docs: "ឯកសារណែនាំ", latest: "ថ្មីបំផុត", onThisPage: "នៅលើទំព័រនេះ", edit: "កែទំព័រនេះនៅលើ GitHub", prev: "មុន", next: "បន្ទាប់", old: (v: string, latest: string) => `អ្នកកំពុងអានឯកសារណែនាំសម្រាប់ Kroma ${v}។ កំណែថ្មីបំផុតគឺ ${latest}។`, toLatest: "ទៅកាន់ឯកសារណែនាំថ្មីបំផុត", intro: "គ្រប់យ៉ាងអំពី Kroma Studio ចាប់ពីការដំឡើង រហូតដល់ការបង្ហោះវីដេអូរបស់អ្នក។", copy: "ចម្លង", copied: "បានចម្លង" },
};

const wrap = "mx-auto w-[min(1280px,100%-32px)]";

export function DocsShell({ version, lang, page, children }: { version: string; lang: Lang; page?: DocPage; children: React.ReactNode }) {
	const t = DOCS_TEXT[lang];
	const versions = docsVersions();
	const latest = versions[0];
	const groups = docGroups(version, lang);
	const slugsByVersion = Object.fromEntries(versions.map((v) => [v.version, docPages(v.version, lang).map((p) => p.slug)]));
	const href = (slug: string) => localize(`/docs/${version}/${slug}/`, lang);
	const all = groups.flatMap((g) => g.pages);
	const at = page ? all.findIndex((p) => p.slug === page.slug) : -1;
	const prev = at > 0 ? all[at - 1] : undefined;
	const next = at >= 0 && at < all.length - 1 ? all[at + 1] : undefined;

	return (
		<div className={cn(wrap, "grid gap-10 pt-10 pb-10 lg:grid-cols-[230px_1fr] xl:grid-cols-[230px_1fr_200px]")}>
			<aside className="lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-100px)] lg:self-start lg:overflow-y-auto lg:pr-2">
				<Link href={localize(`/docs/${version}/`, lang)} className="mb-3 block text-xs tracking-wider text-muted-foreground uppercase no-underline hover:text-foreground">
					{t.docs}
				</Link>
				<VersionPicker versions={versions} current={version} slug={page?.slug} slugsByVersion={slugsByVersion} lang={lang} latestLabel={t.latest} />
				<nav aria-label={t.docs} className="mt-5 grid gap-5">
					{groups.map((g) => (
						<div key={g.group}>
							<p className="mb-1.5 px-2 text-[12px] font-semibold">{g.group}</p>
							<ul className="grid list-none gap-0.5 border-l p-0">
								{g.pages.map((p) => (
									<li key={p.slug}>
										<Link
											href={href(p.slug)}
											aria-current={p.slug === page?.slug ? "page" : undefined}
											className={cn("-ml-px block border-l py-1 pl-3 text-[13px] no-underline transition-colors", p.slug === page?.slug ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground")}
										>
											{p.title}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</nav>
			</aside>

			<main className="min-w-0">
				{version !== latest.version && (
					<div role="note" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-[13px]">
						<TriangleAlert className="size-4 shrink-0 text-warning" />
						<span>{t.old(version, latest.label)}</span>
						<Link href={localize(`/docs/${latest.version}/${page && slugsByVersion[latest.version]?.includes(page.slug) ? `${page.slug}/` : ""}`, lang)} className="font-medium underline underline-offset-2">
							{t.toLatest} →
						</Link>
					</div>
				)}
				{children}
				{page && (
					<>
						<CodeCopy copy={t.copy} copied={t.copied} />
						<div className="mt-14 grid gap-3 border-t pt-6 sm:grid-cols-2">
							{prev ? (
								<Link href={href(prev.slug)} className="group rounded-lg border p-4 no-underline hover:bg-accent/50">
									<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<ArrowLeft className="size-3.5" /> {t.prev}
									</span>
									<span className="mt-1 block text-[14px] font-medium">{prev.title}</span>
								</Link>
							) : (
								<span />
							)}
							{next && (
								<Link href={href(next.slug)} className="group rounded-lg border p-4 text-right no-underline hover:bg-accent/50">
									<span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
										{t.next} <ArrowRight className="size-3.5" />
									</span>
									<span className="mt-1 block text-[14px] font-medium">{next.title}</span>
								</Link>
							)}
						</div>
						<a href={`${GITHUB_URL}/edit/main/website/content/docs/${version}/${lang}/${page.slug}.md`} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground no-underline hover:text-foreground">
							<Pencil className="size-3.5" /> {t.edit}
						</a>
					</>
				)}
			</main>

			{page && page.toc.length > 0 && (
				<aside className="hidden xl:sticky xl:top-[84px] xl:block xl:self-start">
					<p className="text-xs tracking-wider text-muted-foreground uppercase">{t.onThisPage}</p>
					<ul className="mt-3 grid list-none gap-1.5 p-0 text-[13px]">
						{page.toc.map((h) => (
							<li key={h.id} className={h.depth === 3 ? "pl-3" : undefined}>
								<a href={`#${h.id}`} className="text-muted-foreground no-underline hover:text-foreground">
									{h.text}
								</a>
							</li>
						))}
					</ul>
				</aside>
			)}
		</div>
	);
}
