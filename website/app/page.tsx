import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadCards, HeroDownload } from "@/components/site/downloads";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { WindowShot } from "@/components/site/window-shot";
import { RELEASES_URL, asset } from "@/lib/site";
import { cn } from "@/lib/utils";

// Kroma Studio's site. Layout after orca.dev (announcement pill, big framed product shot, feature blocks, FAQ,
// closing call) and openclaw.ai (trust line, install facts, a card per system with direct downloads), on the app's
// own design tokens and components.

const STEPS = [
	["Paste a link", "YouTube, Bilibili, Douyin, Youku, iQiyi, TikTok and 1,000+ sites. Kroma even reads the title from a share message."],
	["Get the subtitles", "Uses the site's own subtitles, or cloud speech-to-text: a 5-minute video in seconds."],
	["Translate", "Natural, spoken Khmer, written short enough to read and to say in time. Thai, Vietnamese, Lao, English, Indonesian and Malay too."],
	["Characters & voices", "Kroma finds who says each line. Give the narrator, the king and the hero each their own voice."],
	["Style", "Khmer subtitles in your style, original subtitles blurred away, your logo on top."],
	["Export & post", "Small, Standard or High, sized for each platform, then posted everywhere in one click."],
];

const FEATURES = [
	{
		id: "translate",
		title: "Khmer that sounds like Khmer",
		text: "Gemini (free), Google Translate (free) or Claude translate the meaning the way people talk, with the right politeness, common spellings for foreign words, and every line kept to the time it's on screen.",
		points: ["Notes for the translator: names, who's who, the tone", "Lines in the wrong script are caught and translated again", "Find & replace across every line, remembered for next time"],
		shot: "/assets/translate-dark.jpg",
		alt: "The Translate panel with the spoken language and the target language, and Khmer subtitle lines.",
	},
	{
		id: "voices",
		title: "36 Khmer voices, one for every character",
		text: "Kings, queens, eunuchs, generals, heroes, mothers, monks, CEOs and kids. Each preset is a saved sample, so it sounds the same in every video. Clone your own voice by reading a short text, right in the app.",
		points: ["Find characters automatically, or add them yourself", "The original voices removed; music and effects stay", "Free instant voices for drafts and other languages"],
		shot: "/assets/voices-dark.jpg",
		alt: "The Voices library with preset voices such as King, Emperor, Queen, Prince and Princess, each with a waveform player.",
	},
	{
		id: "posting",
		title: "Post everywhere in one click",
		text: "The AI writes a title, text and hashtags for each platform. Connect YouTube, Facebook and TikTok once, tick where to post, and Kroma exports, uploads and follows each post to the end.",
		points: ["Posts saved with the project, edit them any time", "YouTube visibility, TikTok post or drafts, Facebook Reels", "A history with links to every post"],
		shot: "/assets/post-dark.jpg",
		alt: "The Post panel with Khmer titles, text and hashtags for YouTube, Facebook and TikTok.",
	},
];

const CARDS = [
	["No strong computer needed", "Speech-to-text, translation and voices run in the cloud. A 5-minute video is transcribed in about 3 seconds."],
	["Free AI to start", "Gemini and Groq have free tiers, Google Translate and the instant voices need no key at all."],
	["An editor, not a form", "A timeline with filmstrip and waveform, subtitles you can fix by typing, undo, and a live preview."],
	["Hide burned-in subtitles", "One click blurs the original Chinese subtitles. Add blur boxes, logos and text anywhere."],
	["Every format", "9:16 for TikTok and Reels, 16:9 for YouTube, 1:1, with blurred or black bars, from the same project."],
	["Your keys stay yours", "API keys are encrypted with your system's keychain and never leave your computer except to the service they're for."],
];

const FAQ = [
	["Is Kroma Studio free?", "Yes, the app is free. It uses AI services with your own keys: Gemini and Groq have free tiers, Google Translate and the instant voices need no key. One-click posting uses Upload-Post: free for YouTube and Facebook (10 posts a month); TikTok needs their paid plan."],
	["Do I need a powerful computer?", "No. Speech-to-text, translation and the instant voices run in the cloud. Removing the original voices runs on your computer and takes about 40 seconds per 5 minutes on a recent machine. The designed and cloned Khmer voices use the Khmer Voice Studio engine, on a free Google Colab GPU or your own machine."],
	["Which sites can I download from?", "Anything yt-dlp supports: YouTube, Bilibili, Douyin, Youku, iQiyi, Facebook, TikTok and over 1,000 more. Videos protected with DRM can't be downloaded."],
	["Which languages?", "From almost any spoken language (Chinese, English, Korean, Japanese…) into Khmer, Thai, Vietnamese, Lao, English, Indonesian or Malay. The 36 designed voices speak Khmer; the other languages use free instant voices."],
	["Does it run on Windows and Linux?", "Yes: macOS (Apple silicon), Windows 10/11 and Linux (AppImage or .deb). Windows and Linux builds include FFmpeg and yt-dlp."],
	["Can I post someone else's video?", "Only when you have the right to. Kroma is a tool for translating and voicing videos you made, have permission to use, or that are licensed for reuse. The same goes for cloned voices: only your own, or with the speaker's permission."],
];

const wrap = "mx-auto w-[min(1180px,100%-32px)]";

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
	return (
		<>
			<p className="text-[12.5px] tracking-[0.08em] text-muted-foreground uppercase">{kicker}</p>
			<h2 className="mt-2.5 max-w-[32ch] text-[clamp(26px,3.6vw,38px)] font-semibold">{title}</h2>
			{sub && <p className="mt-3.5 max-w-[64ch] text-muted-foreground">{sub}</p>}
		</>
	);
}

function Checks({ items }: { items: string[] }) {
	return (
		<ul className="mt-5 grid list-none gap-2.5 p-0 text-[13.5px]">
			{items.map((item) => (
				<li key={item} className="relative pl-6 before:absolute before:top-1.5 before:left-0.5 before:h-1.5 before:w-2.5 before:-rotate-45 before:border-b-2 before:border-l-2 before:border-success before:content-['']">
					{item}
				</li>
			))}
		</ul>
	);
}

function Brand({ size = 28 }: { size?: number }) {
	return (
		<a href="#top" className="inline-flex items-center gap-2.5 font-semibold tracking-tight no-underline">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={asset("/assets/icon.png")} alt="" width={size} height={size} className="rounded-md" />
			<span>Kroma Studio</span>
		</a>
	);
}

export default function Home() {
	return (
		<>
			<header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
				<div className={cn(wrap, "flex h-[60px] items-center gap-6")}>
					<Brand />
					<nav aria-label="Main" className="hidden gap-5 text-[13.5px] md:flex">
						{[
							["#features", "Features"],
							["#voices", "Voices"],
							["#workflow", "How it works"],
							["#faq", "FAQ"],
						].map(([href, label]) => (
							<a key={href} href={href} className="text-muted-foreground no-underline hover:text-foreground">
								{label}
							</a>
						))}
					</nav>
					<div className="ml-auto flex items-center gap-2">
						<ThemeToggle />
						<Button asChild size="sm">
							<a href="#download">Download</a>
						</Button>
					</div>
				</div>
			</header>

			<main id="top">
				{/* Hero */}
				<section className={cn(wrap, "relative flex flex-col items-center pt-14 pb-11 text-center md:pt-22")}>
					<div aria-hidden className="pointer-events-none absolute inset-x-[10%] -top-10 -z-10 h-[420px] bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
					<a href="#posting" className="inline-flex items-center gap-2.5 rounded-full border bg-background py-1 pr-3 pl-1 text-[12.5px] text-muted-foreground no-underline hover:text-foreground">
						<span className="rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">New</span>
						Post to YouTube, Facebook and TikTok in one click <ArrowRight className="size-3.5" />
					</a>
					<p className="mt-7 text-[12.5px] tracking-wide text-muted-foreground">Desktop app · macOS · Windows · Linux · Free</p>
					<h1 className="mt-3.5 max-w-[21ch] text-[clamp(36px,6vw,64px)] font-semibold">
						Turn any video into a{" "}
						<span lang="km" className="font-khmer tracking-normal">
							ខ្មែរ
						</span>{" "}
						video.
					</h1>
					<p className="mt-5 max-w-[62ch] text-[16.5px] text-muted-foreground">
						Download from YouTube, Bilibili, Douyin and 1,000+ sites. Get the subtitles, translate them to Khmer, give every character their own voice, and post to YouTube, Facebook and TikTok. All in one app.
					</p>
					<HeroDownload />
					<p className="mt-6 max-w-[60ch] text-[12.5px] text-muted-foreground">No subscription. Your own AI keys, many free. Runs on your computer; the heavy AI work happens in the cloud.</p>
				</section>

				{/* Product shot */}
				<section className={cn(wrap, "pb-6")}>
					<WindowShot
						src="/assets/editor-dark.jpg"
						srcLight="/assets/editor-light.jpg"
						priority
						alt="Kroma Studio editor: a vertical video with Khmer subtitles, the Characters panel giving the Narrator and the Young man their own voices, and the subtitle list with each speaker."
					/>
					<ul aria-label="What Kroma does" className="mt-5 flex list-none flex-wrap justify-center gap-2 p-0">
						{["Download", "Subtitles", "Translate", "Characters", "Voices", "Export", "Post"].map((p) => (
							<li key={p} className="rounded-full border px-3 py-1 text-[12.5px] text-muted-foreground">
								{p}
							</li>
						))}
					</ul>
				</section>

				{/* Workflow */}
				<section id="workflow" className={cn(wrap, "pt-18 md:pt-26")}>
					<SectionHead kicker="How it works" title="From a link to a finished post, step by step." sub="The step bar at the top of Kroma shows what's done and what's next, so a new video is easy from start to end." />
					<ol className="mt-10 grid list-none gap-px overflow-hidden rounded-lg border bg-border p-0 md:grid-cols-3">
						{STEPS.map(([title, text], i) => (
							<li key={title} className="group bg-background p-6">
								<span className="inline-grid size-6 place-items-center rounded-full border text-xs text-muted-foreground transition-colors group-hover:border-success group-hover:bg-success group-hover:text-white">{i + 1}</span>
								<h3 className="mt-3.5 text-base font-semibold">{title}</h3>
								<p className="mt-2 text-[13.5px] text-muted-foreground">{text}</p>
							</li>
						))}
					</ol>
				</section>

				{/* Feature blocks */}
				<section id="features" className={cn(wrap, "pt-18 md:pt-26")}>
					<SectionHead kicker="Features" title={'Everything between "found a video" and "posted it".'} />
					{FEATURES.map((f, i) => (
						<article key={f.id} id={f.id} className={cn("mt-14 grid items-center gap-6 md:gap-12", i % 2 ? "md:grid-cols-[7fr_5fr]" : "md:grid-cols-[5fr_7fr]")}>
							<div className={cn(i % 2 && "md:order-2")}>
								<h3 className="text-[22px] font-semibold">{f.title}</h3>
								<p className="mt-3 text-muted-foreground">{f.text}</p>
								<Checks items={f.points} />
							</div>
							<WindowShot src={f.shot} alt={f.alt} className="rounded-lg" />
						</article>
					))}
				</section>

				{/* Grid */}
				<section className={cn(wrap, "pt-18 md:pt-26")}>
					<SectionHead kicker="Built for creators" title="Made for real work, on the computer you have." />
					<div className="mt-10 grid gap-3 md:grid-cols-3">
						{CARDS.map(([title, text]) => (
							<div key={title} className="rounded-lg border bg-card p-5">
								<h3 className="text-[15px] font-semibold">{title}</h3>
								<p className="mt-2 text-[13.5px] text-muted-foreground">{text}</p>
							</div>
						))}
					</div>
				</section>

				{/* Download */}
				<section id="download" className={cn(wrap, "pt-18 md:pt-26")}>
					<SectionHead kicker="Download" title="Install Kroma Studio" sub="Download the app for your computer. FFmpeg and yt-dlp come with it on Windows and Linux." />
					<DownloadCards />
					<div className="mt-7 rounded-lg border border-dashed p-5">
						<h3 className="text-[15px] font-semibold">After installing</h3>
						<ol className="mt-3 grid list-decimal gap-2 pl-5 text-[13.5px] text-muted-foreground">
							<li>
								<strong className="font-medium text-foreground">Add a free AI key</strong>: Kroma opens Settings → Translation the first time. A free Gemini key covers translation and posts.
							</li>
							<li>
								<strong className="font-medium text-foreground">Paste a video link</strong> in Media, then press <em>Make Khmer subtitles</em>.
							</li>
							<li>
								<strong className="font-medium text-foreground">Optional</strong>: install <code className="rounded bg-muted px-1.5 py-0.5">uv</code> to remove the original voices (Settings → About shows the command for your system).
							</li>
						</ol>
					</div>
				</section>

				{/* FAQ */}
				<section id="faq" className="mx-auto w-[min(780px,100%-32px)] pt-18 md:pt-26">
					<SectionHead kicker="FAQ" title="Questions" />
					<div className="mt-8 border-t">
						{FAQ.map(([q, a]) => (
							<details key={q} className="group border-b py-4.5">
								<summary className="flex cursor-pointer list-none justify-between gap-4 font-medium after:text-muted-foreground after:content-['+'] group-open:after:content-['−']">{q}</summary>
								<p className="mt-2.5 text-sm text-muted-foreground">{a}</p>
							</details>
						))}
					</div>
				</section>

				{/* Closing */}
				<section className={cn(wrap, "mt-30 flex flex-col items-center gap-3.5 rounded-lg border bg-card bg-[radial-gradient(closest-side,var(--glow),transparent)] bg-[length:70%_120%] bg-center bg-no-repeat px-6 py-16 text-center")}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={asset("/assets/icon.png")} alt="" width={64} height={64} className="rounded-[14px]" />
					<h2 className="text-[clamp(26px,3.6vw,36px)] font-semibold">Get Kroma Studio</h2>
					<p className="mb-2 text-muted-foreground">Free, for macOS, Windows and Linux. From any video to a Khmer post in minutes.</p>
					<Button asChild size="lg" className="h-11 px-5 text-[15px]">
						<a href="#download">Download</a>
					</Button>
				</section>
			</main>

			<footer className="mt-24 border-t text-[13px] text-muted-foreground">
				<div className={cn(wrap, "flex flex-wrap justify-between gap-8 py-9")}>
					<div className="text-foreground">
						<Brand size={24} />
						<p className="mt-2.5 max-w-[40ch] text-muted-foreground">Turn any video into a Khmer video. Free for macOS, Windows and Linux.</p>
					</div>
					<nav aria-label="Footer" className="flex flex-wrap gap-5">
						{[
							["#features", "Features"],
							["#voices", "Voices"],
							["#download", "Download"],
							["#faq", "FAQ"],
							[RELEASES_URL, "All releases"],
						].map(([href, label]) => (
							<a key={label} href={href} className="no-underline hover:text-foreground">
								{label}
							</a>
						))}
					</nav>
				</div>
				<div className={cn(wrap, "pb-9 text-xs")}>© {new Date().getFullYear()} Kroma Studio</div>
			</footer>
		</>
	);
}
