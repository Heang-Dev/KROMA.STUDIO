import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DOCS_TEXT } from "@/components/docs/docs-shell";
import { messages } from "@/lib/i18n";
import { share } from "@/lib/share";

// Link previews for the Khmer docs: a picture of the docs. Each page also puts its own title in its preview.
export const metadata: Metadata = share("km", "docs", messages.km.meta.docsTitle, DOCS_TEXT.km.intro);

export default function Layout({ children }: { children: ReactNode }) {
	return children;
}
