"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * On phones and tablets the page list folds into a "Menu" button that shows where you are, so the article comes
 * first; it closes again when you pick a page. On wide screens the list is always shown as the sidebar.
 */
export function DocsNavToggle({ current, label, children }: { current?: string; label: string; children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	useEffect(() => setOpen(false), [pathname]);
	return (
		<>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="mt-3 flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-[13px] lg:hidden"
			>
				<span className="flex min-w-0 items-center gap-2">
					<Menu className="size-4 shrink-0 text-muted-foreground" />
					<span className="truncate">{current ?? label}</span>
				</span>
				<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>
			<div className={cn(open ? "block" : "hidden", "lg:block")}>{children}</div>
		</>
	);
}
