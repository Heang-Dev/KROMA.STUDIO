"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GITHUB_URL, RELEASES_REPO, RELEASES_URL } from "@/lib/site";
import { BrandIcon } from "./brand-icons";
import { cn } from "@/lib/utils";

// Download links from the latest GitHub release, with the visitor's system picked out.

type Os = "mac" | "windows" | "linux";
type Kind = "dmg" | "exe" | "appimage" | "deb";
const OS_NAMES: Record<Os, string> = { mac: "macOS", windows: "Windows", linux: "Linux" };
const OS_FILE: Record<Os, Kind> = { mac: "dmg", windows: "exe", linux: "appimage" };
const PATTERNS: Record<Kind, RegExp> = { dmg: /\.dmg$/i, exe: /\.exe$/i, appimage: /\.appimage$/i, deb: /\.deb$/i };

function detectOs(): Os | null {
	const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
	const p = (nav.userAgentData?.platform || navigator.platform || navigator.userAgent).toLowerCase();
	if (p.includes("mac")) return "mac";
	if (p.includes("win")) return "windows";
	if (p.includes("linux") && !/android/i.test(navigator.userAgent)) return "linux";
	return null;
}

interface Downloads {
	os: Os | null;
	urls: Partial<Record<Kind, string>>;
	version: string | null;
}

function useDownloads(): Downloads {
	const [state, setState] = useState<Downloads>({ os: null, urls: {}, version: null });
	useEffect(() => {
		const os = detectOs();
		setState((s) => ({ ...s, os }));
		fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases/latest`)
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((release: { tag_name?: string; published_at?: string; assets?: { name: string; browser_download_url: string }[] }) => {
				const urls: Downloads["urls"] = {};
				for (const [kind, re] of Object.entries(PATTERNS) as [Kind, RegExp][]) {
					const a = release.assets?.find((x) => re.test(x.name) && !/blockmap/i.test(x.name));
					if (a) urls[kind] = a.browser_download_url;
				}
				const date = release.published_at ? ` · ${new Date(release.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : "";
				setState({ os, urls, version: release.tag_name ? `${release.tag_name}${date}` : null });
			})
			// No release yet, or the API is busy: the buttons open the releases page instead.
			.catch(() => undefined);
	}, []);
	return state;
}

const link = (d: Downloads, kind: Kind) => d.urls[kind] ?? `${RELEASES_URL}/latest`;

/** The hero's button: "Download for macOS", with the other systems below. */
export function HeroDownload() {
	const d = useDownloads();
	const others = (Object.keys(OS_NAMES) as Os[]).filter((o) => o !== d.os).map((o) => OS_NAMES[o]);
	return (
		<>
			<div className="mt-8 flex flex-wrap justify-center gap-2.5">
				<Button asChild size="lg" className="h-11 px-5 text-[15px]">
					<a href={d.os ? link(d, OS_FILE[d.os]) : "#download"}>
						<Download /> {d.os ? `Download for ${OS_NAMES[d.os]}` : "Download Kroma Studio"}
					</a>
				</Button>
				<Button asChild size="lg" variant="outline" className="h-11 px-5 text-[15px]">
					<a href={GITHUB_URL} target="_blank" rel="noreferrer">
						<BrandIcon name="github" /> View on GitHub
					</a>
				</Button>
			</div>
			<p className="mt-3 text-[12.5px] text-muted-foreground">
				{d.os ? (
					<>
						Also for{" "}
						<a href="#download" className="underline underline-offset-2">
							{others.join(" · ")}
						</a>
					</>
				) : (
					"For macOS, Windows and Linux"
				)}
			</p>
		</>
	);
}

const LOGOS: Record<Os, React.ReactNode> = {
	mac: <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5a4.3 4.3 0 0 0-3.4-1.8c-1.4-.1-2.8.9-3.5.9s-1.9-.9-3.1-.8a4.6 4.6 0 0 0-3.9 2.4c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4s1.6-.8 3-.8 1.8.8 3 .7 2-1.2 2.8-2.3a10 10 0 0 0 1.3-2.6 4 4 0 0 1-2.3-3.6ZM14.2 5.6a4 4 0 0 0 .9-3 4 4 0 0 0-2.6 1.4 3.8 3.8 0 0 0-1 2.8 3.4 3.4 0 0 0 2.7-1.2Z" />,
	windows: <path d="M3 5.5 10 4.5v7H3v-6Zm0 13 7 1v-7H3v6Zm8 1.2 10 1.3v-8.5H11v7.2Zm0-15.4v7.2h10V3L11 4.3Z" />,
	linux: <path d="M12 2c-2.2 0-3.6 1.9-3.6 4.6 0 1.6.4 2.8-.6 4.4-1.3 2-2.8 4.2-2.6 6.6.1 1.3.9 2 1.9 2.3.8.3 1.6.9 2.4 1.5.6.4 1.5.6 2.5.6s1.9-.2 2.5-.6c.8-.6 1.6-1.2 2.4-1.5 1-.3 1.8-1 1.9-2.3.2-2.4-1.3-4.6-2.6-6.6-1-1.6-.6-2.8-.6-4.4C15.6 3.9 14.2 2 12 2Z" />,
};

function OsCard({ os, current, title, detail, children, help }: { os: Os; current: boolean; title: string; detail: string; children: React.ReactNode; help: React.ReactNode }) {
	return (
		<div className={cn("flex flex-col gap-4 rounded-lg border bg-card p-5", current && "border-ring")}>
			<div className="flex items-center gap-3">
				<svg viewBox="0 0 24 24" aria-hidden className="size-6 flex-none fill-current">
					{LOGOS[os]}
				</svg>
				<div>
					<h3 className="text-base font-semibold">{title}</h3>
					<p className="text-[12.5px] text-muted-foreground">{detail}</p>
				</div>
				{current && <span className="ml-auto rounded-full border border-success/40 px-2 py-0.5 text-[11px] whitespace-nowrap text-success">Your system</span>}
			</div>
			{children}
			<details className="text-[13px] text-muted-foreground">{help}</details>
		</div>
	);
}

export function CopyCode({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="mt-2.5 flex items-center gap-2 rounded-lg border bg-muted py-2 pr-2 pl-3">
			<code className="flex-1 overflow-x-auto text-[12.5px] whitespace-nowrap text-foreground">{code}</code>
			<Button
				variant="outline"
				size="xs"
				onClick={() => {
					void navigator.clipboard.writeText(code).then(() => {
						setCopied(true);
						setTimeout(() => setCopied(false), 1500);
					});
				}}
			>
				{copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}

const summary = "cursor-pointer";

/** The install section: facts, a card per system with its downloads, and help for unsigned installers. */
export function DownloadCards() {
	const d = useDownloads();
	return (
		<>
			<dl className="mt-8 grid gap-x-10 gap-y-2 sm:grid-cols-[repeat(3,auto)] sm:justify-start">
				{[
					["Platforms", "macOS (Apple silicon) · Windows 10/11 x64 · Linux x64"],
					["Size", "About 200 MB"],
					["Version", d.version ?? "Latest release"],
				].map(([k, v]) => (
					<div key={k} className="grid gap-0.5">
						<dt className="text-xs tracking-wider text-muted-foreground uppercase">{k}</dt>
						<dd className="m-0 text-sm">{v}</dd>
					</div>
				))}
			</dl>
			<div className="mt-8 grid gap-3 md:grid-cols-3">
				<OsCard
					os="mac"
					current={d.os === "mac"}
					title="macOS"
					detail="Apple silicon (M1 and later)"
					help={
						<>
							<summary className={summary}>&ldquo;Kroma Studio is damaged&rdquo; or won&apos;t open?</summary>
							<p className="mt-2">The app isn&apos;t signed with an Apple certificate yet. After moving it to Applications, run this once in Terminal:</p>
							<CopyCode code={'xattr -cr "/Applications/Kroma Studio.app"'} />
						</>
					}
				>
					<Button asChild>
						<a href={link(d, "dmg")}>Download .dmg</a>
					</Button>
				</OsCard>
				<OsCard
					os="windows"
					current={d.os === "windows"}
					title="Windows"
					detail="Windows 10 and 11 · x64"
					help={
						<>
							<summary className={summary}>&ldquo;Windows protected your PC&rdquo;?</summary>
							<p className="mt-2">
								The installer isn&apos;t code-signed yet. Click <strong className="text-foreground">More info</strong>, then <strong className="text-foreground">Run anyway</strong>.
							</p>
						</>
					}
				>
					<Button asChild>
						<a href={link(d, "exe")}>Download installer</a>
					</Button>
				</OsCard>
				<OsCard
					os="linux"
					current={d.os === "linux"}
					title="Linux"
					detail="x64 · AppImage or Debian package"
					help={
						<>
							<summary className={summary}>Running the AppImage</summary>
							<CopyCode code="chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage" />
						</>
					}
				>
					<div className="grid grid-cols-2 gap-2">
						<Button asChild>
							<a href={link(d, "appimage")}>AppImage</a>
						</Button>
						<Button asChild variant="outline">
							<a href={link(d, "deb")}>.deb</a>
						</Button>
					</div>
				</OsCard>
			</div>
		</>
	);
}
