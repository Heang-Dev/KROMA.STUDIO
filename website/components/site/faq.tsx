"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The FAQ as an accordion: one answer open at a time. The answer's height eases open and closed, the plus turns
 * into a cross, and the open question is marked in Kroma's purple. Instant with reduced motion.
 */
export function Faq({ items }: { items: [string, string][] }) {
	const [open, setOpen] = useState<number | null>(0);
	const reduced = useReducedMotion();
	const id = useId();
	const ease = [0.22, 1, 0.36, 1] as const;

	return (
		<div className="mt-8 border-t">
			{items.map(([q, a], i) => {
				const on = open === i;
				return (
					<div key={q} className="border-b">
						<h3 className="m-0">
							<button
								type="button"
								id={`${id}-q${i}`}
								aria-expanded={on}
								aria-controls={`${id}-a${i}`}
								onClick={() => setOpen(on ? null : i)}
								className={cn("group flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] font-medium transition-colors", on ? "text-brand" : "hover:text-brand")}
							>
								{q}
								<span className={cn("grid size-7 shrink-0 place-items-center rounded-full border transition-colors", on ? "border-brand/40 bg-brand/10" : "text-muted-foreground group-hover:border-brand/40")}>
									<Plus className={cn("size-3.5 transition-transform duration-300 ease-out", on && "rotate-45")} />
								</span>
							</button>
						</h3>
						<AnimatePresence initial={false}>
							{on && (
								<motion.div
									id={`${id}-a${i}`}
									role="region"
									aria-labelledby={`${id}-q${i}`}
									key="answer"
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={reduced ? { duration: 0 } : { height: { duration: 0.35, ease }, opacity: { duration: 0.25, ease: "easeOut" } }}
									className="overflow-hidden"
								>
									<p className="max-w-[90ch] pr-12 pb-5 text-[14px] leading-7 text-muted-foreground">{a}</p>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				);
			})}
		</div>
	);
}
