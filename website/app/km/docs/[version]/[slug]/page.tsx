import type { Metadata } from "next";
import { DocsArticle } from "@/components/docs/docs-pages";
import { docPages, docsVersions } from "@/lib/docs";
import { messages } from "@/lib/i18n";

export const dynamicParams = false;
export const generateStaticParams = () => docsVersions().flatMap((v) => docPages(v.version, "km").map((p) => ({ version: v.version, slug: p.slug })));

export async function generateMetadata({ params }: { params: Promise<{ version: string; slug: string }> }): Promise<Metadata> {
	const { version, slug } = await params;
	const page = docPages(version, "km").find((p) => p.slug === slug);
	return { title: `${page?.title ?? slug} · v${version} · ${messages.km.meta.docsTitle}` };
}

export default async function Page({ params }: { params: Promise<{ version: string; slug: string }> }) {
	const { version, slug } = await params;
	return <DocsArticle version={version} lang="km" slug={slug} />;
}
