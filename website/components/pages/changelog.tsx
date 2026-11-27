import { Reveal } from "@/components/site/reveal";
import { type Lang, messages } from "@/lib/i18n";
import { RELEASES_URL, releases } from "@/lib/site";
import { cn } from "@/lib/utils";


/** A release's notes: "- " lines become a list, the rest paragraphs. */
function Notes({ body }: { body: string }) {
	const blocks: React.ReactNode[] = [];
	let list: string[] = [];
	const flush = () => {
		if (list.length) blocks.push(<ul key={blocks.length} className="mt-3 grid list-disc gap-1.5 pl-5">{list.map((l) => <li key={l}>{l}</li>)}</ul>);
		list = [];
	};
	for (const raw of body.split(/\r?\n/)) {
		const line = raw.trim();
		if (/^[-*] /.test(line)) list.push(line.slice(2));
		else {
			flush();
			if (line) blocks.push(<p key={blocks.length} className="mt-3">{line.replace(/^#+\s*/, "")}</p>);
		}
	}
	flush();
	return <div className="text-[14px] leading-7 text-muted-foreground">{blocks}</div>;
}

export async function ChangelogPage({ lang }: { lang: Lang }) {
	const list = await releases();
	const t = messages[lang].changelog;
	return (
		<main className={cn("mx-auto w-[min(780px,100%-32px)] pt-12 md:pt-16")}>
			<p className="text-[12.5px] tracking-[0.08em] text-muted-foreground uppercase">{t.kicker}</p>
			<h1 className="mt-2 text-[clamp(30px,4.5vw,44px)] font-semibold">{t.title}</h1>
			<p className="mt-3 text-muted-foreground">
				{t.sub}{" "}
				<a href={RELEASES_URL} className="underline underline-offset-2">
					{t.releases}
				</a>
				.
			</p>
			<div className="mt-12 grid gap-12 border-l pl-6">
				{list.length === 0 && <p className="text-muted-foreground">{t.none}</p>}
				{list.map((r) => (
					<Reveal key={r.tag}>
						<article className="relative">
							<span aria-hidden className="absolute top-2 -left-[29px] size-2.5 rounded-full border-2 border-background bg-foreground" />
							<p className="text-xs text-muted-foreground tabular-nums">{new Date(r.date).toLocaleDateString(lang === "km" ? "km-KH" : "en", { year: "numeric", month: "long", day: "numeric" })}</p>
							<h2 className="mt-1 text-xl font-semibold">
								<a href={r.url} className="no-underline hover:underline">
									{r.name}
								</a>{" "}
								<span className="ml-1 rounded-full border px-2 py-0.5 align-middle text-[11px] font-normal text-muted-foreground">{r.tag}</span>
							</h2>
							<Notes body={r.body} />
						</article>
					</Reveal>
				))}
			</div>
		</main>
	);
}
