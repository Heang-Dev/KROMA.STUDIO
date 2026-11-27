import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

import { generalScenes } from "./illustrations/general";
import { kromaScenes } from "./illustrations/kroma";
import { systemScenes } from "./illustrations/system";

// Empty states (ported from the School Management System's AppEmptyState): a line illustration drawn from the theme's
// tokens (outlines in the foreground colour, accents in the tone), a title, a short "what to do" line and an optional
// action. Laid out like the Download Center's empty queue: centred, calm, one clear next step.

const scenes = { ...generalScenes, ...systemScenes, ...kromaScenes };

export type EmptyScene = keyof typeof scenes;
export type EmptyTone = "primary" | "success" | "warning" | "destructive";

const accent: Record<EmptyTone, string> = {
	primary: "text-primary",
	success: "text-success",
	warning: "text-warning",
	destructive: "text-destructive",
};

export function EmptyIllustration({ scene = "empty", tone = "primary", className }: { scene?: EmptyScene; tone?: EmptyTone; className?: string }) {
	return (
		<svg viewBox="0 0 160 104" aria-hidden fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={cn("h-24 w-auto shrink-0", accent[tone], className)}>
			{scenes[scene]}
		</svg>
	);
}

export function EmptyState({
	scene = "empty",
	tone = "primary",
	title,
	description,
	action,
	compact = false,
	fill = true,
	className,
}: {
	scene?: EmptyScene;
	tone?: EmptyTone;
	title: ReactNode;
	description?: ReactNode;
	/** Buttons under the text (one clear next step). */
	action?: ReactNode;
	/** Smaller art and text, for popovers, side panels and inside cards. */
	compact?: boolean;
	/** Take the free space and centre in it (a page or panel body); off inside lists and cards. */
	fill?: boolean;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col items-center justify-center text-center text-balance", fill && "min-h-0 flex-1", compact ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-10", className)}>
			<EmptyIllustration scene={scene} tone={tone} className={cn("mb-1", compact && "h-16")} />
			<p className={cn("font-medium", compact ? "text-xs" : "text-[13px]")}>{title}</p>
			{description && <div className={cn("max-w-sm leading-relaxed text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>{description}</div>}
			{action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
		</div>
	);
}
