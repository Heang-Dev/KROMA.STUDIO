import type { Metadata } from "next";
import { DocsPage } from "@/components/pages/docs";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = { title: messages.km.meta.docsTitle, alternates: { languages: { en: "/docs/", km: "/km/docs/" } } };

export default function Page() {
	return <DocsPage lang="km" />;
}
