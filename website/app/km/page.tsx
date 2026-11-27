import type { Metadata } from "next";
import { HomePage } from "@/components/pages/home";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = { title: messages.km.meta.title, description: messages.km.meta.description, alternates: { languages: { en: "/", km: "/km/" } } };

export default function Page() {
	return <HomePage lang="km" />;
}
