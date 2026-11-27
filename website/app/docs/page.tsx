import type { Metadata } from "next";
import Link from "next/link";
import { CopyCode } from "@/components/site/downloads";
import { wrap } from "@/components/site/chrome";
import { GITHUB_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Docs · Kroma Studio", description: "Install Kroma Studio, add your keys, and make your first Khmer video with characters, voices and one-click posting." };

const TOC = [
	["install", "Install"],
	["keys", "Add your keys"],
	["first-video", "Your first Khmer video"],
	["characters", "Characters & voices"],
	["voice-engine", "The Khmer voice engine"],
	["style", "Style & objects"],
	["export", "Export"],
	["posting", "Posting"],
	["languages", "Other languages"],
	["troubleshooting", "Troubleshooting"],
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
	return (
		<h2 id={id} className="mt-14 scroll-mt-24 border-b pb-2 text-[22px] font-semibold first:mt-0">
			{children}
		</h2>
	);
}
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-[14.5px] leading-7 text-muted-foreground">{children}</p>;
const Steps = ({ children }: { children: React.ReactNode }) => <ol className="mt-4 grid list-decimal gap-2.5 pl-5 text-[14.5px] leading-7 text-muted-foreground marker:text-foreground">{children}</ol>;
const B = ({ children }: { children: React.ReactNode }) => <strong className="font-medium text-foreground">{children}</strong>;
const K = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">{children}</code>;

export default function Docs() {
	return (
		<main className={cn(wrap, "grid gap-10 pt-12 pb-10 md:grid-cols-[200px_1fr] md:pt-16")}>
			<aside className="md:sticky md:top-24 md:self-start">
				<p className="text-xs tracking-wider text-muted-foreground uppercase">Docs</p>
				<nav aria-label="On this page" className="mt-3 grid gap-1 text-[13.5px]">
					{TOC.map(([id, label]) => (
						<a key={id} href={`#${id}`} className="rounded-md px-2 py-1 text-muted-foreground no-underline hover:bg-accent hover:text-foreground">
							{label}
						</a>
					))}
				</nav>
			</aside>

			<article className="max-w-[72ch]">
				<p className="text-[12.5px] tracking-[0.08em] text-muted-foreground uppercase">Getting started</p>
				<h1 className="mt-2 text-[clamp(30px,4.5vw,44px)] font-semibold">Kroma Studio guide</h1>
				<P>From installing the app to posting your first Khmer video. Something missing or wrong? <a href={`${GITHUB_URL}/issues`} className="underline underline-offset-2">Open an issue on GitHub</a>.</P>

				<div className="mt-12">
					<H2 id="install">Install</H2>
					<P>
						Download the app for your system from the <Link href="/#download" className="underline underline-offset-2">download section</Link>. Windows and Linux builds include FFmpeg and yt-dlp. The installers aren&apos;t code-signed yet, so your system may warn you the first time:
					</P>
					<Steps>
						<li>
							<B>macOS</B>: move Kroma Studio to Applications. If it says the app is damaged or won&apos;t open, run this once in Terminal:
							<CopyCode code={'xattr -cr "/Applications/Kroma Studio.app"'} />
							On a Mac, also install the tools with <a href="https://brew.sh" className="underline underline-offset-2">Homebrew</a>: <K>brew install ffmpeg yt-dlp</K>
						</li>
						<li>
							<B>Windows</B>: on &ldquo;Windows protected your PC&rdquo;, click <B>More info</B>, then <B>Run anyway</B>.
						</li>
						<li>
							<B>Linux</B>: make the AppImage executable, or install the .deb:
							<CopyCode code="chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage" />
						</li>
					</Steps>

					<H2 id="keys">Add your keys</H2>
					<P>Kroma uses AI services with your own keys, so you pay nothing to Kroma and only what a service charges, which for most is nothing to start. Keys are encrypted with your system&apos;s keychain. The first time, Kroma opens Settings → Translation.</P>
					<Steps>
						<li>
							<B>Translation and posts</B>: a free <a href="https://aistudio.google.com/apikey" className="underline underline-offset-2">Gemini key</a> from Google AI Studio. Or choose Google Translate, which needs no key, or Claude for the best wording (paid).
						</li>
						<li>
							<B>Speech to text</B>: a free <a href="https://console.groq.com/keys" className="underline underline-offset-2">Groq key</a> (Whisper large-v3: a whole movie in seconds), in Settings → Speech to Text.
						</li>
					</Steps>

					<H2 id="first-video">Your first Khmer video</H2>
					<P>The step bar at the top of the editor shows what&apos;s done and what&apos;s next.</P>
					<Steps>
						<li>
							<B>Video</B>: in Media, paste a link (YouTube, Bilibili, Douyin and 1,000+ sites, even a whole share message) and press Get. Or import a file.
						</li>
						<li>
							<B>Subtitles &amp; Khmer</B>: in Translate, check the spoken language and press <B>Make Khmer subtitles</B>. Kroma uses the site&apos;s own subtitles when it has them, otherwise speech-to-text, then translates.
						</li>
						<li>
							<B>Fix anything</B> by typing in the Subtitles list. <B>Find &amp; replace</B> fixes a word in every line and can remember it for future translations. Notes for the translator (names, who&apos;s who, tone) improve the next translation.
						</li>
						<li>
							<B>Export</B>: press Export at the top right and pick a size.
						</li>
					</Steps>

					<H2 id="characters">Characters &amp; voices</H2>
					<P>In Voice, the Characters section gives every person in the video their own voice.</P>
					<Steps>
						<li>
							<B>Find automatically</B> reads the dialogue (about 20 seconds) and suggests a voice for each character, or <B>Add a character</B> yourself.
						</li>
						<li>Pick a voice for each character. ▶ plays a sample. Voices come grouped: Narration, Palace &amp; royalty, Heroes &amp; fighters, Modern drama, Family &amp; elders, Children &amp; teens, Villains &amp; mood.</li>
						<li>To change who says a line, click the coloured name on that line in the Subtitles list.</li>
						<li>
							Press <B>Make voice-over</B>. The original voices are removed automatically (music and effects stay); switch that off in Voice → Mix. Removing voices needs <a href="https://docs.astral.sh/uv/" className="underline underline-offset-2">uv</a>; Settings → About shows the install command for your system.
						</li>
						<li>
							<B>Clone a voice</B> in Voices → Clone voice: read the text on screen for about 15 seconds, listen back, and clone. Only clone your own voice, or with the speaker&apos;s permission.
						</li>
					</Steps>

					<H2 id="voice-engine">The Khmer voice engine</H2>
					<P>
						The 36 designed voices and cloned voices come from the Khmer Voice Studio engine (VoxCPM2). It needs a GPU to be quick: run it on a free Google Colab GPU and paste the address and token it prints into Settings → Voice Engine, or run it on your own computer. The free instant voices (Microsoft) need no engine and work in every language.
					</P>

					<H2 id="style">Style &amp; objects</H2>
					<P>
						In Style, set the subtitle font size, colours, background and position, and show the original line above the Khmer one if you like. In Objects, <B>Cover original subtitles</B> blurs the burned-in Chinese subtitles in one click; add blur boxes, your logo or text anywhere, for the whole video or part of it.
					</P>

					<H2 id="export">Export</H2>
					<P>Export at the top right (or the Export step) offers three sizes, each with an estimated file size:</P>
					<Steps>
						<li>
							<B>Small</B>: about 75 MB per 5 minutes at 1080p, for TikTok and Facebook (they shrink videos anyway).
						</li>
						<li>
							<B>Standard</B>: quick to export, good for YouTube.
						</li>
						<li>
							<B>High</B>: the best quality, about 3× slower.
						</li>
					</Steps>

					<H2 id="posting">Posting</H2>
					<P>Kroma posts through Upload-Post, which YouTube, Facebook and TikTok have already approved, so your posts go out publicly.</P>
					<Steps>
						<li>
							Make a free account at <a href="https://app.upload-post.com/" className="underline underline-offset-2">upload-post.com</a>, create an API key, and paste it into Settings → Posting.
						</li>
						<li>Press Connect and sign in to YouTube, Facebook and TikTok in your browser. Pick your Facebook Page (Facebook only allows posting to Pages).</li>
						<li>
							In Post, press <B>Write the posts</B> (edit anything), tick the platforms and press <B>Post</B>. Kroma exports (or reuses your last export), uploads once, and keeps a history with links.
						</li>
					</Steps>
					<P>YouTube and Facebook work on Upload-Post&apos;s free plan (10 posts a month); TikTok needs their Basic plan.</P>

					<H2 id="languages">Other languages</H2>
					<P>In Translate, choose <B>Translate to</B>: Khmer, Thai, Vietnamese, Lao, English, Indonesian or Malay. The posts and the instant voices follow the language. The designed voices are made for Khmer.</P>

					<H2 id="troubleshooting">Troubleshooting</H2>
					<Steps>
						<li>
							<B>&ldquo;Missing ffmpeg / yt-dlp&rdquo;</B>: on a Mac run <K>brew install ffmpeg yt-dlp</K>; Windows and Linux builds include them. Settings → About shows what&apos;s found.
						</li>
						<li>
							<B>A download fails</B>: some sites need you to be signed in. In Settings → Downloads choose the browser you&apos;re signed in with. Videos with DRM can&apos;t be downloaded.
						</li>
						<li>
							<B>&ldquo;The KVS voice engine isn&apos;t reachable&rdquo;</B>: start the engine (Colab or your computer) and check its address in Settings → Voice Engine, or use the instant voices.
						</li>
						<li>
							<B>Gemini is busy</B>: free keys have a daily limit. Kroma falls back to Google Translate for the lines it couldn&apos;t do and tells you; translate again later for Gemini&apos;s wording.
						</li>
						<li>
							<B>An export failed</B>: the full log is saved as <K>last-export-error.log</K> in Kroma&apos;s settings folder. Attach it to a <a href={`${GITHUB_URL}/issues`} className="underline underline-offset-2">GitHub issue</a>.
						</li>
					</Steps>
				</div>
			</article>
		</main>
	);
}
