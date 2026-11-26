import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { type TaskState, useEditor } from "@/state/store";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
	primary: "bg-accent text-accent-ink hover:bg-accent-strong font-semibold",
	secondary: "bg-panel-2 text-fg border border-line hover:border-line-strong hover:bg-[#232731]",
	ghost: "text-muted hover:text-fg hover:bg-panel-2",
	danger: "text-danger hover:bg-danger/10",
};

export function Button({ variant = "secondary", className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
	return (
		<button
			type="button"
			className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

export function IconButton({ label, className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			className={`inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel-2 hover:text-fg disabled:pointer-events-none disabled:opacity-35 ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

export function Section({ title, hint, children, action }: { title: string; hint?: string; children: ReactNode; action?: ReactNode }) {
	return (
		<section className="border-b border-line px-4 py-4">
			<div className="mb-3 flex items-start justify-between gap-2">
				<div>
					<h3 className="text-[13px] font-semibold text-fg">{title}</h3>
					{hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

export function Label({ children }: { children: ReactNode }) {
	return <span className="mb-1 block text-xs font-medium text-muted">{children}</span>;
}

export const inputClass =
	"h-8 w-full rounded-md border border-line bg-bg px-2.5 text-[13px] text-fg placeholder:text-dim focus:border-accent focus:outline-none";

export function ProgressBar({ value }: { value: number }) {
	const indeterminate = value < 0;
	return (
		<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
			<div
				className={`absolute inset-y-0 left-0 rounded-full bg-accent ${indeterminate ? "w-1/3 animate-[slide_1.2s_ease-in-out_infinite]" : "transition-[width] duration-300"}`}
				style={indeterminate ? undefined : { width: `${Math.round(value * 100)}%` }}
			/>
			<style>{"@keyframes slide{0%{left:-33%}100%{left:100%}}"}</style>
		</div>
	);
}

/** Progress for the latest task whose id starts with `prefix`, with a cancel button while it runs. */
export function TaskProgress({ prefix }: { prefix: string }) {
	const task = useEditor((s) => latestTask(s.tasks, prefix));
	if (!task || task.status === "done") return null;
	return (
		<div className="mt-3 rounded-md bg-bg p-2.5" role="status">
			<div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
				<span className={task.status === "error" ? "text-danger" : "text-muted"}>{task.message}</span>
				{task.status === "running" && (
					<button type="button" onClick={() => window.kroma.cancel(task.id)} className="text-dim hover:text-fg" aria-label="Cancel" title="Cancel">
						<X size={14} />
					</button>
				)}
			</div>
			{task.status === "running" && <ProgressBar value={task.progress} />}
		</div>
	);
}

export function latestTask(tasks: Record<string, TaskState>, prefix: string): TaskState | undefined {
	return Object.values(tasks)
		.filter((t) => t.id.startsWith(prefix))
		.sort((a, b) => Number(b.id.split("-").pop()) - Number(a.id.split("-").pop()))[0];
}

export function useBusy(prefix: string): boolean {
	return useEditor((s) => latestTask(s.tasks, prefix)?.status === "running");
}
