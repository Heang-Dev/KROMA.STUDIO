"use client";

import { motion, useReducedMotion } from "motion/react";

/** Fades a block up into place the first time it scrolls into view (still for reduced motion). */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
	const reduced = useReducedMotion();
	if (reduced) return <div className={className}>{children}</div>;
	return (
		<motion.div className={className} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}>
			{children}
		</motion.div>
	);
}
