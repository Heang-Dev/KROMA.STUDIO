import type { Metadata } from "next";
import { HomePage } from "@/components/pages/home";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = { title: messages.en.meta.title, description: messages.en.meta.description, alternates: { languages: { en: "/", km: "/km/" } } };

export default function Page() {
	return <HomePage lang="en" />;
}
