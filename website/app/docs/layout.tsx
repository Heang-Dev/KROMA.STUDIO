import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DOCS_TEXT } from "@/components/docs/docs-shell";
import { messages } from "@/lib/i18n";
import { share } from "@/lib/share";

// Link previews for the English docs: a picture of the docs. Each page also puts its own title in its preview.
export const metadata: Metadata = share("en", "docs", messages.en.meta.docsTitle, DOCS_TEXT.en.intro);

export default function Layout({ children }: { children: ReactNode }) {
	return children;
}
