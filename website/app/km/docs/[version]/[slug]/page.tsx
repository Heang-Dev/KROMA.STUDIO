import type { Metadata } from "next";
import { DocsArticle } from "@/components/docs/docs-pages";
import { docPages, docsVersions } from "@/lib/docs";
import { DOCS_TEXT } from "@/components/docs/docs-shell";
import { messages } from "@/lib/i18n";
import { share } from "@/lib/share";

export const dynamicParams = false;
export const generateStaticParams = () => docsVersions().flatMap((v) => docPages(v.version, "km").map((p) => ({ version: v.version, slug: p.slug })));

export async function generateMetadata({ params }: { params: Promise<{ version: string; slug: string }> }): Promise<Metadata> {
	const { version, slug } = await params;
	const page = docPages(version, "km").find((p) => p.slug === slug);
	const title = `${page?.title ?? slug} · v${version} · ${messages.km.meta.docsTitle}`;
	return { title, ...share("km", "docs", title, DOCS_TEXT.km.intro) };
}

export default async function Page({ params }: { params: Promise<{ version: string; slug: string }> }) {
	const { version, slug } = await params;
	return <DocsArticle version={version} lang="km" slug={slug} />;
}
