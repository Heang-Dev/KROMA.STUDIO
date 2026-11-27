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
				{/* Every action button is the same small outline button: community, GitHub, language, theme. */}
				<div className="ml-auto flex items-center gap-1.5">
					{communityLinks().map((c) => (
						<Button key={c.name} asChild variant="outline" size="icon-sm" className="hidden sm:inline-flex">
							<a href={c.href} target="_blank" rel="noreferrer" aria-label={c.label} title={c.label}>
								<BrandIcon name={c.name} />
							</a>
						</Button>
					))}
					<Button asChild variant="outline" size={showStars ? "sm" : "icon-sm"} className={cn("hidden sm:inline-flex", showStars && "gap-1.5 px-2.5")}>
						<a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={`GitHub${showStars ? `, ${stars} stars` : ""}`} title="GitHub">
							<BrandIcon name="github" />
							{showStars && (
								<span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
									<Star className="size-3" /> {compact(stars!)}
								</span>
							)}
						</a>
					</Button>
					<LangSwitcher label={t.language} />
					<ThemeToggle label={t.theme} />
					<Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
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

export function FooterBar() {
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
				<span>© {new Date().getFullYear()} Kroma Studio · MIT</span>
				<span>{t.madeFor}</span>
			</div>
		</footer>
	);
}
