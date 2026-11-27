import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMMUNITY, GITHUB_URL, RELEASES_URL, asset, githubStars } from "@/lib/site";
import { cn } from "@/lib/utils";
import { type Brand, BrandIcon } from "./brand-icons";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

// The header and footer on every page (after orca.dev's header and getartcraft.com's footer columns).

export const wrap = "mx-auto w-[min(1180px,100%-32px)]";

const NAV = [
	{ href: "/#features", label: "Features" },
	{ href: "/#voices", label: "Voices" },
	{ href: "/docs/", label: "Docs" },
	{ href: "/changelog/", label: "Changelog" },
	{ href: "/#faq", label: "FAQ" },
];

/** Community channels that have a link (Discord, Telegram, YouTube). */
export const communityLinks = (): { name: Brand; label: string; href: string }[] =>
	(
		[
			{ name: "discord", label: "Discord", href: COMMUNITY.discord },
			{ name: "telegram", label: "Telegram", href: COMMUNITY.telegram },
			{ name: "youtube", label: "YouTube", href: COMMUNITY.youtube },
		] as const
	).filter((c) => c.href) as { name: Brand; label: string; href: string }[];

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export async function Header() {
	const stars = await githubStars();
	return (
		<header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
			<div className={cn(wrap, "relative flex h-[60px] items-center gap-6")}>
				<Logo />
				<nav aria-label="Main" className="hidden gap-5 text-[13.5px] md:flex">
					{NAV.map((l) => (
						<Link key={l.href} href={l.href} className="text-muted-foreground no-underline hover:text-foreground">
							{l.label}
						</Link>
					))}
				</nav>
				<div className="ml-auto flex items-center gap-1.5">
					{communityLinks().map((c) => (
						<Button key={c.name} asChild variant="ghost" size="icon-sm" className="hidden sm:inline-flex">
							<a href={c.href} target="_blank" rel="noreferrer" aria-label={c.label} title={c.label}>
								<BrandIcon name={c.name} />
							</a>
						</Button>
					))}
					<Button asChild variant="ghost" size="sm" className="hidden gap-1.5 px-2 sm:inline-flex">
						<a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={`Kroma Studio on GitHub${stars !== null ? `, ${stars} stars` : ""}`}>
							<BrandIcon name="github" />
							{stars !== null && stars > 0 && (
								<span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
									<Star className="size-3" /> {compact(stars)}
								</span>
							)}
						</a>
					</Button>
					<ThemeToggle />
					<Button asChild size="sm" className="ml-1">
						<Link href="/#download">Download</Link>
					</Button>
					<MobileMenu links={[...NAV, { href: GITHUB_URL, label: "GitHub" }, ...communityLinks().map((c) => ({ href: c.href, label: c.label }))]} />
				</div>
			</div>
		</header>
	);
}

export function Logo({ size = 28 }: { size?: number }) {
	return (
		<Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight no-underline">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={asset("/assets/icon.png")} alt="" width={size} height={size} className="rounded-md" />
			<span>Kroma Studio</span>
		</Link>
	);
}

export function Footer() {
	const columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
		{
			title: "Product",
			links: [
				{ href: "/#features", label: "Features" },
				{ href: "/#voices", label: "Voices" },
				{ href: "/#download", label: "Download" },
				{ href: "/changelog/", label: "Changelog" },
			],
		},
		{
			title: "Resources",
			links: [
				{ href: "/docs/", label: "Docs" },
				{ href: "/#faq", label: "FAQ" },
				{ href: RELEASES_URL, label: "All releases", external: true },
				{ href: `${GITHUB_URL}/blob/main/LICENSE`, label: "MIT License", external: true },
			],
		},
		{
			title: "Community",
			links: [{ href: GITHUB_URL, label: "GitHub", external: true }, { href: `${GITHUB_URL}/issues`, label: "Report a problem", external: true }, ...communityLinks().map((c) => ({ href: c.href, label: c.label, external: true }))],
		},
	];
	return (
		<footer className="mt-24 border-t text-[13px] text-muted-foreground">
			<div className={cn(wrap, "grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]")}>
				<div className="text-foreground">
					<Logo size={24} />
					<p className="mt-3 max-w-[36ch] text-muted-foreground">Turn any video into a Khmer video. Free and open source for macOS, Windows and Linux.</p>
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
				<span>© {new Date().getFullYear()} Kroma Studio · MIT License</span>
				<span>Made for Khmer creators</span>
			</div>
		</footer>
	);
}
