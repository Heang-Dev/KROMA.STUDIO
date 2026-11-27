import type { ReactNode } from "react";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Kroma's step track (the School Management System's AppSteps): numbered circles joined by a line — done ones ticked
// in the accent colour, the current one ringed in it, the rest muted. Kroma adds two states for work that runs on its
// own: "running" (a spinner in the ring) and "failed" (a red cross). Borders only, no fills that shout.

export type StepStatus = "done" | "current" | "running" | "failed" | "waiting";

export interface Step {
	key: string;
	label: string;
	description?: string;
	/** Overrides the status worked out from `current`. */
	status?: StepStatus;
	/** Hover text (defaults to the label and description). */
	title?: string;
	/** Makes the step's circle and label a button (e.g. a failed step: run again from here). */
	onClick?: () => void;
	/** `vertical` only: shown at the right of the label (a time, a status word). */
	meta?: ReactNode;
	/** `vertical` only: shown under the label (a message, buttons). */
	children?: ReactNode;
}

function statusOf(step: Step, index: number, current: number): StepStatus {
	if (step.status) return step.status;
	return index < current ? "done" : index === current ? "current" : "waiting";
}

function StepNumber({ index, status, size }: { index: number; status: StepStatus; size: "sm" | "md" }) {
	return (
		<span
			className={cn(
				"relative z-10 flex shrink-0 items-center justify-center rounded-full border bg-card font-semibold tabular-nums transition-colors",
				size === "sm" ? "size-5 text-[10px]" : "size-6 text-[11px]",
				status === "done" && "border-primary bg-primary text-primary-foreground",
				(status === "current" || status === "running") && "border-primary bg-primary/10 text-primary",
				status === "failed" && "border-destructive bg-destructive/10 text-destructive",
				status === "waiting" && "border-border text-muted-foreground",
			)}
		>
			{status === "done" ? (
				<Check className="size-3" strokeWidth={3} />
			) : status === "failed" ? (
				<X className="size-3" strokeWidth={3} />
			) : status === "running" ? (
				<Loader2 className="size-3 animate-spin" />
			) : (
				index + 1
			)}
		</span>
	);
}

const labelClass = (status: StepStatus) =>
	cn(
		"text-xs font-medium",
		status === "failed" ? "text-destructive" : status === "current" || status === "running" ? "text-foreground" : status === "done" ? "text-foreground/80" : "text-muted-foreground",
	);

/**
 * `inline` (default): number beside the label, a line to the next step. `stacked`: number above, label and description
 * centred under it. `size="sm"` for dense rows (a queue of videos).
 */
export function Steps({
	steps,
	current = 0,
	variant = "inline",
	size = "md",
	className,
}: {
	steps: Step[];
	/** Index of the step in progress; earlier steps show as done (unless a step sets its own status). */
	current?: number;
	/** `vertical`: one step per line, top to bottom, each with room for its details (a side sheet, a log). */
	variant?: "inline" | "stacked" | "vertical";
	size?: "sm" | "md";
	className?: string;
}) {
	const half = size === "sm" ? "0.625rem" : "0.75rem";
	if (variant === "vertical") {
		return (
			<ol aria-label="Progress" className={cn("flex flex-col", className)}>
				{steps.map((step, index) => {
					const status = statusOf(step, index, current);
					const last = index === steps.length - 1;
					return (
						<li key={step.key} aria-current={status === "current" || status === "running" ? "step" : undefined} className="relative flex gap-3">
							{/* The line down to the next step, from this circle's bottom to the next one's top. */}
							{!last && <span aria-hidden className={cn("absolute w-px", status === "done" ? "bg-primary" : "bg-border")} style={{ left: `calc(${half} - 0.5px)`, top: `calc(2 * ${half} + 0.125rem)`, bottom: "0.125rem" }} />}
							<StepNumber index={index} status={status} size={size} />
							<div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-5")}>
								<div className={cn("flex min-w-0 items-center gap-2", size === "sm" ? "h-5" : "h-6")}>
									<span className={cn("min-w-0 flex-1 truncate", labelClass(status))}>{step.label}</span>
									{step.meta && <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground tabular-nums">{step.meta}</span>}
								</div>
								{step.description && <p className="text-[11px] text-muted-foreground">{step.description}</p>}
								{step.children && <div className="mt-1.5 space-y-2">{step.children}</div>}
							</div>
						</li>
					);
				})}
			</ol>
		);
	}
	if (variant === "stacked") {
		return (
			<ol aria-label="Progress" className={cn("flex items-start", className)}>
				{steps.map((step, index) => {
					const status = statusOf(step, index, current);
					return (
						<li key={step.key} aria-current={status === "current" || status === "running" ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 px-2 text-center">
							{index < steps.length - 1 && (
								<span
									aria-hidden
									className={cn("absolute h-px", status === "done" ? "bg-primary" : "bg-border")}
									style={{ top: half, left: `calc(50% + ${half} + 0.125rem)`, width: `calc(100% - 2 * ${half} - 0.25rem)` }}
								/>
							)}
							<StepNumber index={index} status={status} size={size} />
							<span className={cn("max-w-full truncate", labelClass(status))}>{step.label}</span>
							{step.description && <span className="max-w-full truncate text-[11px] text-muted-foreground">{step.description}</span>}
						</li>
					);
				})}
			</ol>
		);
	}

	// Small rows: a name never shrinks to "Subt…"; when the track is too narrow for every name, only the circles show.
	// About 95 px per named step: 6 steps need 36rem, more need 48rem.
	const nameClass = size !== "sm" ? "truncate" : cn("hidden shrink-0 whitespace-nowrap", steps.length <= 6 ? "@xl/steps:inline" : "@3xl/steps:inline");
	return (
		<ol aria-label="Progress" className={cn("@container/steps flex min-w-0 items-start gap-2", className)}>
			{steps.map((step, index) => {
				const status = statusOf(step, index, current);
				// The last step is only as wide as its text (capped at its fair share), so the lines take the rest.
				const last = index === steps.length - 1;
				return (
					<li
						key={step.key}
						aria-current={status === "current" || status === "running" ? "step" : undefined}
						title={step.title ?? (step.description ? `${step.label} — ${step.description}` : step.label)}
						style={last ? { maxWidth: `${100 / steps.length}%` } : undefined}
						className={cn("flex min-w-0 items-start gap-2", last ? "flex-none" : "flex-1")}
					>
						<StepNumber index={index} status={status} size={size} />
						<span className={cn("flex min-w-0 flex-1 flex-col gap-0.5", size === "sm" ? "pt-px" : "pt-0.5")}>
							<span className={cn("flex items-center gap-2", size === "sm" ? "h-[18px]" : "h-5")}>
								{step.onClick ? (
									<button
										type="button"
										className={cn(nameClass, "underline-offset-2 hover:underline", labelClass(status))}
										onClick={(e) => {
											e.stopPropagation();
											step.onClick?.();
										}}
									>
										{step.label}
									</button>
								) : (
									<span className={cn(nameClass, labelClass(status))}>{step.label}</span>
								)}
								{!last && <span aria-hidden className={cn("h-px min-w-2 flex-1", status === "done" ? "bg-primary" : "bg-border")} />}
							</span>
							{step.description && <span className="truncate text-[11px] text-muted-foreground">{step.description}</span>}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
