"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "On this page", following the reader: the heading whose section is on screen is marked in Kroma's purple, with a
 * bar beside it. Clicking a heading marks it straight away.
 */
export function DocsToc({ items }: { items: { depth: number; id: string; text: string }[] }) {
	const [active, setActive] = useState(items[0]?.id);

	useEffect(() => {
		const headings = items.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => Boolean(el));
		if (!headings.length) return;
		// The current section is the last heading above a line a little below the header.
		const update = () => {
			const line = 120;
			let current = headings[0].id;
			for (const h of headings) {
				if (h.getBoundingClientRect().top <= line) current = h.id;
				else break;
			}
			// At the very bottom, the last heading is current even if it never reaches the line.
			if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = headings[headings.length - 1].id;
			setActive(current);
		};
		update();
		addEventListener("scroll", update, { passive: true });
		addEventListener("resize", update);
		return () => {
			removeEventListener("scroll", update);
			removeEventListener("resize", update);
		};
	}, [items]);

	return (
		<ul className="mt-3 grid list-none gap-0.5 border-l p-0 text-[13px]">
			{items.map((h) => (
				<li key={h.id}>
					<a
						href={`#${h.id}`}
						onClick={() => setActive(h.id)}
						aria-current={active === h.id ? "location" : undefined}
						className={cn(
							"-ml-px block border-l-2 py-1 leading-snug no-underline transition-colors",
							h.depth === 3 ? "pl-6" : "pl-3",
							active === h.id ? "border-brand font-medium text-brand" : "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{h.text}
					</a>
				</li>
			))}
		</ul>
	);
}
