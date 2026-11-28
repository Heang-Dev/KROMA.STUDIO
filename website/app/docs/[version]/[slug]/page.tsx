import type { Metadata } from "next";
import { DocsArticle } from "@/components/docs/docs-pages";
import { docPages, docsVersions } from "@/lib/docs";
import { DOCS_TEXT } from "@/components/docs/docs-shell";
import { messages } from "@/lib/i18n";
import { share } from "@/lib/share";

export const dynamicParams = false;
export const generateStaticParams = () => docsVersions().flatMap((v) => docPages(v.version, "en").map((p) => ({ version: v.version, slug: p.slug })));

export async function generateMetadata({ params }: { params: Promise<{ version: string; slug: string }> }): Promise<Metadata> {
	const { version, slug } = await params;
	const page = docPages(version, "en").find((p) => p.slug === slug);
	const title = `${page?.title ?? slug} · v${version} · ${messages.en.meta.docsTitle}`;
	return { title, ...share("en", "docs", title, DOCS_TEXT.en.intro) };
}

export default async function Page({ params }: { params: Promise<{ version: string; slug: string }> }) {
	const { version, slug } = await params;
	return <DocsArticle version={version} lang="en" slug={slug} />;
}
