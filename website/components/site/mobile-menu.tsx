"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The nav on a phone: a menu button that opens the links in a sheet under the header. */
export function MobileMenu({ links, labels }: { links: { href: string; label: string }[]; labels: { open: string; close: string } }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="md:hidden">
			<Button variant="ghost" size="icon-sm" aria-label={open ? labels.close : labels.open} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
				{open ? <X /> : <Menu />}
			</Button>
			{open && (
				<nav aria-label="Menu" className="absolute inset-x-0 top-[60px] grid gap-1 border-b bg-background p-3 shadow-lg">
					{links.map((l) => (
						<Link key={`${l.href}-${l.label}`} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm no-underline hover:bg-accent">
							{l.label}
						</Link>
					))}
				</nav>
			)}
		</div>
	);
}
