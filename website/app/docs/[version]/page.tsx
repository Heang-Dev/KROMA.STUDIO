import type { Metadata } from "next";
import { DocsIndex } from "@/components/docs/docs-pages";
import { docsVersions } from "@/lib/docs";
import { messages } from "@/lib/i18n";

export const dynamicParams = false;
export const generateStaticParams = () => docsVersions().map((v) => ({ version: v.version }));
export const metadata: Metadata = { title: messages.en.meta.docsTitle };

export default async function Page({ params }: { params: Promise<{ version: string }> }) {
	const { version } = await params;
	return <DocsIndex version={version} lang="en" />;
}
