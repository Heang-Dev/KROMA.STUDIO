import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/site/brand-icons";
import { communityLinks, wrap } from "@/components/site/chrome";
import { DownloadCards, HeroDownload } from "@/components/site/downloads";
import { Reveal } from "@/components/site/reveal";
import { Showcase } from "@/components/site/showcase";
import { VoiceGallery } from "@/components/site/voice-gallery";
import { WindowShot } from "@/components/site/window-shot";
import { GITHUB_URL, asset } from "@/lib/site";
import { cn } from "@/lib/utils";

// Kroma Studio's home page. Layout after orca.dev (announcement pill, tabbed product showcase, feature blocks,
// comparison table, FAQ) and getartcraft.com (numbered sections, a lineup of real items, principles grid, community
// band), on the app's own design tokens and components.

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
		id: "characters",
		title: "Every character gets a voice",
		text: "A drama has a narrator, a king, a hero and a mother. Kroma reads the dialogue, finds who says each line and suggests a voice for each one. Change any voice, or who says a line, with one click.",
		points: ["Find characters automatically, or add them yourself", "The original voices removed; music and effects stay", "Clone your own voice by reading a short text in the app"],
		shot: "/assets/editor-dark.jpg",
		alt: "The Characters panel: the Narrator and the Young man with their own voices, and coloured speaker names on the subtitles.",
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

const PRINCIPLES = [
	["Open source", "MIT licensed, on GitHub. Read the code, change it, build your own version."],
	["Light on your computer", "Speech-to-text, translation and voices run in the cloud: a 5-minute video is transcribed in about 3 seconds."],
	["Free to start", "Gemini and Groq have free tiers; Google Translate and the instant voices need no key at all."],
	["Your keys, your files", "Videos and projects stay on your computer. API keys are encrypted with your system's keychain."],
	["Made for Khmer", "Correct Khmer line breaking and shaping, common spellings, Khmer voices for every kind of character."],
	["Every platform", "macOS, Windows and Linux; 9:16 for TikTok and Reels, 16:9 for YouTube, 1:1, from the same project."],
];

const COMPARE: [string, string, string][] = [
	["Download the video", "A separate downloader site", "Built in, 1,000+ sites"],
	["Subtitles", "Type them by hand", "Speech-to-text in seconds"],
	["Khmer translation", "Copy and paste, line by line", "The whole video, timed to fit"],
	["A voice per character", "Record every part yourself", "36 voices, or your own clone"],
	["Remove the original voices", "Another app", "One switch"],
	["Hide burned-in subtitles", "Mask them by hand", "One click"],
	["Post to 3 platforms", "Upload 3 times, write 3 captions", "One click, captions written"],
	["Price", "Several subscriptions", "Free and open source"],
];

const FAQ = [
	["Is Kroma Studio free?", "Yes, free and open source (MIT). It uses AI services with your own keys: Gemini and Groq have free tiers, Google Translate and the instant voices need no key. One-click posting uses Upload-Post: free for YouTube and Facebook (10 posts a month); TikTok needs their paid plan."],
	["Do I need a powerful computer?", "No. Speech-to-text, translation and the instant voices run in the cloud. Removing the original voices runs on your computer and takes about 40 seconds per 5 minutes on a recent machine. The designed and cloned Khmer voices use the Khmer Voice Studio engine, on a free Google Colab GPU or your own machine."],
	["Which sites can I download from?", "Anything yt-dlp supports: YouTube, Bilibili, Douyin, Youku, iQiyi, Facebook, TikTok and over 1,000 more. Videos protected with DRM can't be downloaded."],
	["Which languages?", "From almost any spoken language (Chinese, English, Korean, Japanese…) into Khmer, Thai, Vietnamese, Lao, English, Indonesian or Malay. The 36 designed voices speak Khmer; the other languages use free instant voices."],
	["Does it run on Windows and Linux?", "Yes: macOS (Apple silicon), Windows 10/11 and Linux (AppImage or .deb). Windows and Linux builds include FFmpeg and yt-dlp."],
	["Can I post someone else's video?", "Only when you have the right to. Kroma is a tool for translating and voicing videos you made, have permission to use, or that are licensed for reuse. The same goes for cloned voices: only your own, or with the speaker's permission."],
];

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

export default function Home() {
	const community = communityLinks();
	return (
		<main id="top">
			{/* Hero */}
			<section className={cn(wrap, "relative flex flex-col items-center pt-14 pb-11 text-center md:pt-22")}>
				<div aria-hidden className="pointer-events-none absolute inset-x-[10%] -top-10 -z-10 h-[420px] bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
				<Reveal>
					<Link href="/#posting" className="inline-flex items-center gap-2.5 rounded-full border bg-background py-1 pr-3 pl-1 text-[12.5px] text-muted-foreground no-underline hover:text-foreground">
						<span className="rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">New</span>
						Post to YouTube, Facebook and TikTok in one click <ArrowRight className="size-3.5" />
					</Link>
				</Reveal>
				<Reveal delay={0.05}>
					<p className="mt-7 text-[12.5px] tracking-wide text-muted-foreground">Open source · MIT · macOS · Windows · Linux</p>
					<h1 className="mx-auto mt-3.5 max-w-[21ch] text-[clamp(36px,6vw,64px)] font-semibold">
						Turn any video into a{" "}
						<span lang="km" className="font-khmer tracking-normal">
							ខ្មែរ
						</span>{" "}
						video.
					</h1>
					<p className="mx-auto mt-5 max-w-[62ch] text-[16.5px] text-muted-foreground">
						Download from YouTube, Bilibili, Douyin and 1,000+ sites. Get the subtitles, translate them to Khmer, give every character their own voice, and post to YouTube, Facebook and TikTok. All in one app.
					</p>
				</Reveal>
				<Reveal delay={0.1}>
					<HeroDownload />
					<p className="mx-auto mt-6 max-w-[60ch] text-[12.5px] text-muted-foreground">No subscription. Your own AI keys, many free. Runs on your computer; the heavy AI work happens in the cloud.</p>
				</Reveal>
			</section>

			{/* Product showcase */}
			<section className={cn(wrap, "pb-4")}>
				<Reveal delay={0.15}>
					<Showcase />
				</Reveal>
			</section>

			{/* 01 Workflow */}
			<section id="workflow" className={section}>
				<SectionHead n={1} kicker="How it works" title="From a link to a finished post, step by step." sub="The step bar at the top of Kroma shows what's done and what's next, so a new video is easy from start to end." />
				<Reveal>
					<ol className="mt-10 grid list-none gap-px overflow-hidden rounded-lg border bg-border p-0 md:grid-cols-3">
						{STEPS.map(([title, text], i) => (
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
				<SectionHead n={2} kicker="Features" title={'Everything between "found a video" and "posted it".'} />
				{FEATURES.map((f, i) => (
					<Reveal key={f.id}>
						<article id={f.id} className={cn("mt-16 grid scroll-mt-20 items-center gap-6 md:gap-12", i % 2 ? "md:grid-cols-[7fr_5fr]" : "md:grid-cols-[5fr_7fr]")}>
							<div className={cn(i % 2 && "md:order-2")}>
								<h3 className="text-[22px] font-semibold">{f.title}</h3>
								<p className="mt-3 text-muted-foreground">{f.text}</p>
								<Checks items={f.points} />
							</div>
							<WindowShot src={f.shot} alt={f.alt} className="rounded-lg" />
						</article>
					</Reveal>
				))}
			</section>

			{/* 03 Voices */}
			<section id="voices" className={section}>
				<SectionHead n={3} kicker="Voices" title="36 Khmer voices. Press play." sub="Kings, queens, heroes, monks, villains and kids, each a saved voice that sounds the same in every video. Here are twelve of them, straight from Kroma." />
				<Reveal>
					<VoiceGallery />
				</Reveal>
			</section>

			{/* 04 Principles */}
			<section className={section}>
				<SectionHead n={4} kicker="Principles" title="Built for creators, the open way." />
				<div className="mt-10 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
					{PRINCIPLES.map(([title, text], i) => (
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
				<SectionHead n={5} kicker="Compare" title="Hours of work, a few clicks." sub="What making one Khmer video takes by hand, and in Kroma." />
				<Reveal>
					<div className="mt-10 overflow-x-auto rounded-lg border">
						<table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]">
							<thead>
								<tr className="border-b bg-muted/50">
									<th className="px-5 py-3 font-medium text-muted-foreground">Task</th>
									<th className="px-5 py-3 font-medium text-muted-foreground">By hand</th>
									<th className="px-5 py-3 font-semibold">Kroma Studio</th>
								</tr>
							</thead>
							<tbody>
								{COMPARE.map(([task, hand, kroma]) => (
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
				<SectionHead n={6} kicker="Download" title="Install Kroma Studio" sub="Download the app for your computer. FFmpeg and yt-dlp come with it on Windows and Linux." />
				<Reveal>
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
								<strong className="font-medium text-foreground">Read the guide</strong>: the{" "}
								<Link href="/docs/" className="underline underline-offset-2">
									docs
								</Link>{" "}
								walk through characters, voices and posting.
							</li>
						</ol>
					</div>
				</Reveal>
			</section>

			{/* 07 FAQ */}
			<section id="faq" className="mx-auto w-[min(780px,100%-32px)] pt-20 md:pt-28">
				<SectionHead n={7} kicker="FAQ" title="Questions" />
				<Reveal>
					<div className="mt-8 border-t">
						{FAQ.map(([q, a]) => (
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
					<h2 className="text-[clamp(26px,3.6vw,36px)] font-semibold">Build it with us.</h2>
					<p className="max-w-[58ch] text-muted-foreground">Kroma Studio is free and open source. Star it on GitHub, report a problem, suggest a feature, or send a fix.</p>
					<div className="mt-2 flex flex-wrap justify-center gap-2.5">
						<Button asChild size="lg" className="h-11 px-5 text-[15px]">
							<Link href="/#download">Download</Link>
						</Button>
						<Button asChild size="lg" variant="outline" className="h-11 px-5 text-[15px]">
							<a href={GITHUB_URL} target="_blank" rel="noreferrer">
								<BrandIcon name="github" /> Star on GitHub
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
