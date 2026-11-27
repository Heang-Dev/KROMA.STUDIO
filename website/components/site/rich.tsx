import Link from "next/link";
import { type Lang, localize } from "@/lib/i18n";

/** Renders the docs' small markdown subset: **bold**, `code`, [link](url). Site links follow the language. */
export function Rich({ text, lang }: { text: string; lang: Lang }) {
	const parts: React.ReactNode[] = [];
	const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
	let last = 0;
	for (let m = re.exec(text); m; m = re.exec(text)) {
		if (m.index > last) parts.push(text.slice(last, m.index));
		const key = parts.length;
		if (m[1]) parts.push(<strong key={key} className="font-medium text-foreground">{m[1]}</strong>);
		else if (m[2]) parts.push(<code key={key} className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">{m[2]}</code>);
		else if (m[4].startsWith("/"))
			parts.push(
				<Link key={key} href={localize(m[4], lang)} className="underline underline-offset-2">
					{m[3]}
				</Link>,
			);
		else
			parts.push(
				<a key={key} href={m[4]} className="underline underline-offset-2">
					{m[3]}
				</a>,
			);
		last = m.index + m[0].length;
	}
	if (last < text.length) parts.push(text.slice(last));
	return <>{parts}</>;
}
