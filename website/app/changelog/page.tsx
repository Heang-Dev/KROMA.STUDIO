import type { Metadata } from "next";
import { ChangelogPage } from "@/components/pages/changelog";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = { title: messages.en.meta.changelogTitle, alternates: { languages: { en: "/changelog/", km: "/km/changelog/" } } };

export default function Page() {
	return <ChangelogPage lang="en" />;
}
