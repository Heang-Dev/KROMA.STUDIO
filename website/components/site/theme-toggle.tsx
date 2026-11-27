"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

/**
 * Light / dark, remembered (the same `dark` class the app uses). The new theme spreads in a circle from the button
 * (View Transitions), and the icon spins from sun to moon. Instant where the browser can't, or for reduced motion.
 */
export function ThemeToggle({ label }: { label: string }) {
	const [dark, setDark] = useState<boolean | null>(null);
	useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

	const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
		const root = document.documentElement;
		const apply = () => {
			const next = !root.classList.contains("dark");
			root.classList.toggle("dark", next);
			setDark(next);
			try {
				localStorage.setItem("kroma-theme", next ? "dark" : "light");
			} catch {}
		};
		const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
		if (!doc.startViewTransition || reduced) return apply();

		const rect = e.currentTarget.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;
		const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		const transition = doc.startViewTransition(() => flushSync(apply));
		void transition.ready.then(() => {
			root.animate(
				{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
				{ duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
			);
		});
	};

	return (
		<Button variant="outline" size="icon-sm" aria-label={label} title={label} onClick={toggle} className="relative overflow-hidden">
			{dark === null ? (
				// Before the page knows its theme: plain icons, so nothing jumps.
				<>
					<Sun className="dark:hidden" />
					<Moon className="hidden dark:block" />
				</>
			) : (
				<AnimatePresence mode="wait" initial={false}>
					<motion.span
						key={dark ? "moon" : "sun"}
						initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
						animate={{ rotate: 0, scale: 1, opacity: 1 }}
						exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
						transition={{ duration: 0.22, ease: "easeOut" }}
						className="grid place-items-center"
					>
						{dark ? <Moon /> : <Sun />}
					</motion.span>
				</AnimatePresence>
			)}
		</Button>
	);
}
