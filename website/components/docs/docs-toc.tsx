"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "On this page", following the reader: the heading whose section is on screen is marked in Kroma's purple, with a
 * bar beside it. A heading you click stays marked until you scroll yourself.
 */
export function DocsToc({ items }: { items: { depth: number; id: string; text: string }[] }) {
	const [active, setActive] = useState(items[0]?.id);
	// The heading you clicked (or opened the page at, with #id) stays marked until you scroll yourself. Near the end of
	// a page the browser can't bring it to the top, and the page-bottom rule below would otherwise mark the last one.
	const pinned = useRef<string | null>(null);

	useEffect(() => {
		const headings = items.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => Boolean(el));
		if (!headings.length) return;
		const fromHash = decodeURIComponent(location.hash.slice(1));
		if (items.some((h) => h.id === fromHash)) {
			pinned.current = fromHash;
			setActive(fromHash);
		}
		// The current section is the last heading above a line just under the sticky header (its scroll padding is
		// 72px), so a short section still counts once its heading reaches the top.
		const update = () => {
			if (pinned.current) return;
			const line = 96;
			let current = headings[0].id;
			for (const h of headings) {
				if (h.getBoundingClientRect().top <= line) current = h.id;
				else break;
			}
			// Scrolled right to the end: the last heading on screen is current, even if it never reached the line.
			if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
				const visible = headings.filter((h) => h.getBoundingClientRect().top < innerHeight);
				if (visible.length) current = visible[visible.length - 1].id;
			}
			setActive(current);
		};
		// Your own scrolling (wheel, trackpad, touch, keys) lets the list follow the page again.
		const unpin = () => {
			if (!pinned.current) return;
			pinned.current = null;
			requestAnimationFrame(update);
		};
		const onKey = (e: KeyboardEvent) => {
			if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) unpin();
		};
		update();
		addEventListener("scroll", update, { passive: true });
		addEventListener("resize", update);
		addEventListener("wheel", unpin, { passive: true });
		addEventListener("touchmove", unpin, { passive: true });
		addEventListener("keydown", onKey);
		return () => {
			removeEventListener("scroll", update);
			removeEventListener("resize", update);
			removeEventListener("wheel", unpin);
			removeEventListener("touchmove", unpin);
			removeEventListener("keydown", onKey);
		};
	}, [items]);

	return (
		<ul className="mt-3 grid list-none gap-0.5 border-l p-0 text-[13px]">
			{items.map((h) => (
				<li key={h.id}>
					<a
						href={`#${h.id}`}
						onClick={() => {
							pinned.current = h.id;
							setActive(h.id);
						}}
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
