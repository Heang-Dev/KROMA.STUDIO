import type { Metadata } from "next";
import { VoicesPage } from "@/components/pages/voices";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = { title: messages.en.voicesPage.metaTitle, alternates: { languages: { en: "/voices/", km: "/km/voices/" } } };

export default function Page() {
	return <VoicesPage lang="en" />;
}
