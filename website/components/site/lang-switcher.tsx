"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { LANGS, type Lang, langOf, switchPath } from "@/lib/i18n";

/** English / ខ្មែរ: opens the same page in the other language, and remembers the choice. */
export function LangSwitcher({ label }: { label: string }) {
	const pathname = usePathname();
	const router = useRouter();
	const current = langOf(pathname);

	// First visit from a Khmer browser to the English home page: show the Khmer one.
	useEffect(() => {
		try {
			if (localStorage.getItem("kroma-lang") || pathname !== "/") return;
			if (navigator.languages?.some((l) => l.toLowerCase().startsWith("km"))) router.replace(switchPath("/", "km"));
		} catch {}
	}, [pathname, router]);

	const choose = (lang: Lang) => {
		try {
			localStorage.setItem("kroma-lang", lang);
		} catch {}
		if (lang !== current) router.push(switchPath(pathname, lang) + window.location.hash);
	};

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<Button variant="outline" size="icon-sm" aria-label={label} title={label}>
					<Languages />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={6}
					className="z-50 min-w-36 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
				>
					{LANGS.map((l) => (
						<DropdownMenu.Item
							key={l.code}
							onSelect={() => choose(l.code)}
							lang={l.code}
							className="flex cursor-pointer items-center justify-between gap-6 rounded-md px-2.5 py-1.5 text-[13px] outline-none select-none data-[highlighted]:bg-accent"
						>
							<span className={l.code === "km" ? "font-khmer" : undefined}>{l.label}</span>
							{l.code === current && <Check className="size-3.5" />}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
