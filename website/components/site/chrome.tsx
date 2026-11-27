import { githubStars, releases } from "@/lib/github";
import { FooterBar, HeaderBar } from "./chrome-bars";

// The header and footer on every page. The star count is read when the site is built; the bars follow the page's
// language (English at /, Khmer at /km/).

export const wrap = "mx-auto w-[min(1180px,100%-32px)]";

export async function Header() {
	return <HeaderBar stars={await githubStars()} />;
}

export async function Footer() {
	const latest = (await releases())[0];
	return <FooterBar latest={latest ? { version: latest.tag.replace(/^v/, ""), date: latest.date } : null} />;
}
