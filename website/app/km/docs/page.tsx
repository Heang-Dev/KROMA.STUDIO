import type { Metadata } from "next";
import { DocsIndex } from "@/components/docs/docs-pages";
import { latestVersion } from "@/lib/docs";
import { messages } from "@/lib/i18n";

// /docs/: the latest version's start page.
export const metadata: Metadata = { title: messages.km.meta.docsTitle };

export default function Page() {
	return <DocsIndex version={latestVersion()} lang="km" />;
}
