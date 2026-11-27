"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { type Lang, localize } from "@/lib/i18n";

/** The docs version menu: opens the same page in another version (or that version's start page if it has no such page). */
export function VersionPicker({ versions, current, slug, slugsByVersion, lang, latestLabel }: { versions: { version: string; label: string }[]; current: string; slug?: string; slugsByVersion: Record<string, string[]>; lang: Lang; latestLabel: string }) {
	const router = useRouter();
	const label = versions.find((v) => v.version === current)?.label ?? current;
	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left text-[13px] hover:bg-accent">
					<span>
						<span className="text-muted-foreground">v</span>
						{label}
						{current === versions[0].version && <span className="ml-2 rounded-full border border-success/40 px-1.5 py-px text-[10px] text-success">{latestLabel}</span>}
					</span>
					<ChevronsUpDown className="size-3.5 text-muted-foreground" />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
					{versions.map((v, i) => (
						<DropdownMenu.Item
							key={v.version}
							onSelect={() => {
								const hasPage = slug && slugsByVersion[v.version]?.includes(slug);
								router.push(localize(`/docs/${v.version}/${hasPage ? `${slug}/` : ""}`, lang));
							}}
							className="flex cursor-pointer items-center justify-between gap-6 rounded-md px-2.5 py-1.5 text-[13px] outline-none select-none data-[highlighted]:bg-accent"
						>
							<span>
								{v.label}
								{i === 0 && <span className="ml-2 text-[11px] text-muted-foreground">{latestLabel}</span>}
							</span>
							{v.version === current && <Check className="size-3.5" />}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
