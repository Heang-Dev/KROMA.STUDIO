import type { Metadata } from "next";
import { DownloadPage } from "@/components/pages/download";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = { title: messages.km.downloadPage.metaTitle, alternates: { languages: { en: "/download/", km: "/km/download/" } } };

export default function Page() {
	return <DownloadPage lang="km" />;
}
