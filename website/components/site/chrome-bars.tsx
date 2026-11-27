"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { langOf, localize, messages } from "@/lib/i18n";
import { GITHUB_URL, RELEASES_URL, asset, communityLinks } from "@/lib/site";
import { cn } from "@/lib/utils";
import { BrandIcon } from "./brand-icons";
import { LangSwitcher } from "./lang-switcher";
import { MobileMenu } from "./mobile-menu";

// One button in the header toolbar: quiet until hovered or open.
const TOOL = "h-7 rounded-sm text-muted-foreground shadow-none hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground";
import { ThemeToggle } from "./theme-toggle";

const wrap = "mx-auto w-[min(1180px,100%-32px)]";

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export function HeaderBar({ stars }: { stars: number | null }) {
	const lang = langOf(usePathname());
	const t = messages[lang].nav;
	const nav = [
		{ href: localize("/#features", lang), label: t.features },
		{ href: localize("/#voices", lang), label: t.voices },
		{ href: localize("/docs/", lang), label: t.docs },
		{ href: localize("/changelog/", lang), label: t.changelog },
		{ href: localize("/#faq", lang), label: t.faq },
	];
	const showStars = stars !== null && stars > 0;
	return (
		<header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
			<div className={cn(wrap, "relative flex h-[60px] items-center gap-6")}>
				<Logo href={localize("/", lang)} />
				<nav aria-label="Main" className="hidden gap-5 text-[13.5px] md:flex">
					{nav.map((l) => (
						<Link key={l.href} href={l.href} className="text-muted-foreground no-underline hover:text-foreground">
							{l.label}
						</Link>
					))}
				</nav>
				{/* GitHub, language and theme sit together in one slim toolbar, as tall as the Download button. */}
				<div className="ml-auto flex items-center gap-2">
					<div className="flex h-8 items-center rounded-md border bg-background p-0.5">
						{communityLinks().map((c) => (
							<Button key={c.name} asChild variant="ghost" size="icon-sm" className={cn(TOOL, "hidden w-7 sm:inline-flex")}>
								<a href={c.href} target="_blank" rel="noreferrer" aria-label={c.label} title={c.label}>
									<BrandIcon name={c.name} />
								</a>
							</Button>
						))}
						<Button asChild variant="ghost" size="sm" className={cn(TOOL, "hidden gap-1.5 px-2 sm:inline-flex", !showStars && "w-7 px-0")}>
							<a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={`GitHub${showStars ? `, ${stars} stars` : ""}`} title="GitHub">
								<BrandIcon name="github" />
								{showStars && (
									<span className="flex items-center gap-1 text-xs tabular-nums">
										<Star className="size-3" /> {compact(stars!)}
									</span>
								)}
							</a>
						</Button>
						<span aria-hidden className="mx-0.5 hidden h-4 w-px bg-border sm:block" />
						<LangSwitcher label={t.language} className={TOOL} />
						<span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
						<ThemeToggle label={t.theme} className={cn(TOOL, "w-7")} />
					</div>
					<Button asChild size="sm" className="hidden sm:inline-flex">
						<Link href={localize("/#download", lang)}>{t.download}</Link>
					</Button>
					<MobileMenu
						labels={{ open: t.menuOpen, close: t.menuClose }}
						links={[...nav, { href: localize("/#download", lang), label: t.download }, { href: GITHUB_URL, label: t.github }, ...communityLinks().map((c) => ({ href: c.href, label: c.label }))]}
					/>
				</div>
			</div>
		</header>
	);
}

export function Logo({ size = 28, href = "/" }: { size?: number; href?: string }) {
	return (
		<Link href={href} className="inline-flex items-center gap-2.5 font-semibold tracking-tight no-underline">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={asset("/assets/icon.png")} alt="" width={size} height={size} className="rounded-md" />
			<span>Kroma Studio</span>
		</Link>
	);
}

export function FooterBar({ latest }: { latest: { version: string; date: string } | null }) {
	const lang = langOf(usePathname());
	const m = messages[lang];
	const t = m.footer;
	const columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
		{
			title: t.product,
			links: [
				{ href: localize("/#features", lang), label: m.nav.features },
				{ href: localize("/#voices", lang), label: m.nav.voices },
				{ href: localize("/#download", lang), label: m.nav.download },
				{ href: localize("/changelog/", lang), label: m.nav.changelog },
			],
		},
		{
			title: t.resources,
			links: [
				{ href: localize("/docs/", lang), label: m.nav.docs },
				{ href: localize("/#faq", lang), label: m.nav.faq },
				{ href: RELEASES_URL, label: t.releases, external: true },
				{ href: `${GITHUB_URL}/blob/main/LICENSE`, label: t.license, external: true },
			],
		},
		{
			title: t.community,
			links: [{ href: GITHUB_URL, label: "GitHub", external: true }, { href: `${GITHUB_URL}/issues`, label: t.report, external: true }, ...communityLinks().map((c) => ({ href: c.href, label: c.label, external: true }))],
		},
	];
	return (
		<footer className="mt-24 border-t text-[13px] text-muted-foreground">
			<div className={cn(wrap, "grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]")}>
				<div className="text-foreground">
					<Logo size={24} href={localize("/", lang)} />
					<p className="mt-3 max-w-[36ch] text-muted-foreground">{t.tagline}</p>
				</div>
				{columns.map((col) => (
					<div key={col.title}>
						<p className="text-xs tracking-wider text-foreground uppercase">{col.title}</p>
						<ul className="mt-3 grid list-none gap-2 p-0">
							{col.links.map((l) => (
								<li key={l.label}>
									{l.external ? (
										<a href={l.href} target="_blank" rel="noreferrer" className="no-underline hover:text-foreground">
											{l.label}
										</a>
									) : (
										<Link href={l.href} className="no-underline hover:text-foreground">
											{l.label}
										</Link>
									)}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<div className={cn(wrap, "flex flex-wrap justify-between gap-2 border-t py-6 text-xs")}>
				<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span>© {new Date().getFullYear()} Kroma Studio · MIT</span>
					{latest && (
						<Link
							href={localize("/changelog/", lang)}
							title={new Date(latest.date).toLocaleDateString(lang === "km" ? "km-KH" : "en", { year: "numeric", month: "long", day: "numeric" })}
							className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 no-underline hover:text-foreground"
						>
							<span className="relative flex size-1.5">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
								<span className="relative inline-flex size-1.5 rounded-full bg-success" />
							</span>
							v{latest.version} · {t.latest}
						</Link>
					)}
				</span>
				<span>{t.madeFor}</span>
			</div>
		</footer>
	);
}
