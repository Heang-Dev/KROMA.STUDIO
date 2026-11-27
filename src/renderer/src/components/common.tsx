import { keyLabel } from "@/lib/platform";
import type { ComponentProps, ReactNode } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SearchSelect } from "./SearchSelect";
import { type TaskState, useEditor } from "@/state/store";

// Building blocks in Orca's style (settings rows, cards, segmented controls), on the shadcn new-york primitives.

export interface Option<T extends string = string> {
	value: T;
	label: string;
	description?: string;
	/** Listed under this heading in a dropdown. */
	group?: string;
}

/** A titled block in a side panel: Orca's group header above its content. */
export function Section({ title, hint, children, action }: { title: string; hint?: string; children: ReactNode; action?: ReactNode }) {
	return (
		<section className="space-y-3 px-4 py-4">
			<div className="flex items-end justify-between gap-3 px-0.5">
				<div className="min-w-0 space-y-1">
					<h3 className="text-[13px] leading-tight font-semibold">{title}</h3>
					{hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
				</div>
				{action && <div className="shrink-0">{action}</div>}
			</div>
			{children}
		</section>
	);
}

/** Orca's settings card: rounded, bordered, rows divided by hairlines. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("overflow-hidden rounded-lg border bg-card/50 px-3.5 [&>*+*]:border-t", className)}>{children}</div>;
}

/**
 * Orca's settings row: label and description on the left, the control on the right. `stack` puts the control under
 * the label at full width, for side panels, where a switch group or picker should span the panel.
 */
export function Row({ label, description, control, htmlFor, alignTop, stack }: { label: ReactNode; description?: ReactNode; control?: ReactNode; htmlFor?: string; alignTop?: boolean; stack?: boolean }) {
	if (stack) {
		return (
			<div className="space-y-2 py-3">
				<div className="space-y-1">
					<Label htmlFor={htmlFor} className="text-[13px] font-normal">
						{label}
					</Label>
					{description && <p className="text-xs leading-relaxed text-muted-foreground select-text">{description}</p>}
				</div>
				{control !== undefined && <div className="w-full">{control}</div>}
			</div>
		);
	}
	return (
		<div className={cn("flex flex-wrap gap-x-4 gap-y-2", description ? "py-3" : "py-2.5", alignTop ? "items-start" : "items-center justify-between")}>
			<div className="min-w-0 grow basis-32 space-y-1">
				<Label htmlFor={htmlFor} className="text-[13px] font-normal">
					{label}
				</Label>
				{description && <p className="text-xs leading-relaxed text-muted-foreground select-text">{description}</p>}
			</div>
			{control !== undefined && <div className="max-w-full shrink-0">{control}</div>}
		</div>
	);
}

export function SwitchRow({ label, description, checked, onChange }: { label: ReactNode; description?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
	return <Row label={label} description={description} control={<Switch checked={checked} onCheckedChange={onChange} aria-label={typeof label === "string" ? label : undefined} />} />;
}

/** A row that opens something else (Orca's chevron rows). */
export function NavRow({ label, description, value, onClick }: { label: ReactNode; description?: ReactNode; value?: ReactNode; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className="-mx-3.5 flex w-[calc(100%+1.75rem)] items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-accent/50">
			<span className="min-w-0 flex-1 space-y-1">
				<span className="block text-[13px]">{label}</span>
				{description && <span className="block text-xs text-muted-foreground">{description}</span>}
			</span>
			{value && <span className="text-xs text-muted-foreground">{value}</span>}
			<ChevronRight className="size-4 text-muted-foreground" />
		</button>
	);
}

/** Orca's segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label, size = "md", equalWidth }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string; size?: "sm" | "md"; equalWidth?: boolean }) {
	return (
		<div role="radiogroup" aria-label={label} className={cn("inline-flex h-control items-center rounded-md border bg-background/50 p-0.5", equalWidth && "flex w-full")}>
			{options.map((o) => {
				const active = o.value === value;
				return (
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(o.value)}
						className={cn(
							"rounded-sm text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
							"flex h-full items-center justify-center text-xs",
							size === "sm" ? "px-2.5" : "px-3",
							equalWidth && "flex-1",
							active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:text-foreground",
						)}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}

/** Bigger choices with a line of help each (format, voice, service). */
export function ChoiceTiles<T extends string>({ value, options, onChange, label, columns = 2 }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string; columns?: 2 | 3 }) {
	return (
		<div role="radiogroup" aria-label={label} className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
			{options.map((o) => {
				const on = o.value === value;
				return (
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={on}
						onClick={() => onChange(o.value)}
						className={cn(
							"relative rounded-lg border p-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
							on ? "border-foreground/40 bg-accent/60" : "bg-card/50 hover:bg-accent/40",
						)}
					>
						<span className="block text-[13px] font-medium">{o.label}</span>
						{o.description && <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{o.description}</span>}
						{on && <Check className="absolute top-2.5 right-2.5 size-3.5" />}
					</button>
				);
			})}
		</div>
	);
}

/** Kroma's dropdown: the searchable select (SearchSelect.tsx); lists longer than 8 get a search box. */
export function AppSelect<T extends string>({ value, options, onChange, label, className, searchable, placeholder }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string; className?: string; searchable?: boolean; placeholder?: string }) {
	return <SearchSelect value={value} options={options} onChange={onChange} label={label} className={className} searchable={searchable} placeholder={placeholder} />;
}

export function SliderField({ label, value, min, max, step, format, onChange, onStart }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void; onStart?: () => void }) {
	return (
		<div className="py-3">
			<div className="mb-2.5 flex justify-between text-[13px]">
				<span>{label}</span>
				<span className="text-xs tabular-nums text-muted-foreground">{format(value)}</span>
			</div>
			<Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} onPointerDown={onStart} aria-label={label} />
		</div>
	);
}

/** Icon-only button with a tooltip (the label doubles as its accessible name). */
export function IconButton({ label, shortcut, children, size = "icon-sm", ...props }: ComponentProps<typeof Button> & { label: string; shortcut?: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size={size} aria-label={label} {...props}>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{label}
				{shortcut && <span className="ml-1.5 opacity-60">{keyLabel(shortcut)}</span>}
			</TooltipContent>
		</Tooltip>
	);
}

/** Progress bar; a negative value means "working, length unknown". */
export function ProgressBar({ value }: { value: number }) {
	if (value < 0) {
		return (
			<div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/15" role="progressbar" aria-busy="true">
				<div className="absolute inset-y-0 w-1/3 animate-[kroma-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
				<style>{"@keyframes kroma-slide{0%{left:-33%}100%{left:100%}}"}</style>
			</div>
		);
	}
	return <Progress value={Math.round(value * 100)} className="h-1" />;
}

/** Progress for the latest task whose id starts with `prefix`, with a cancel button while it runs. */
export function TaskProgress({ prefix }: { prefix: string }) {
	const task = useEditor((s) => latestTask(s.tasks, prefix));
	if (!task || task.status === "done") return null;
	const failed = task.status === "error";
	return (
		<div className={cn("rounded-lg border p-2.5", failed ? "border-destructive/30 bg-destructive/10" : "bg-card/50")} role="status">
			<div className="mb-2 flex items-center justify-between gap-2 text-xs">
				<span className={failed ? "text-destructive" : "text-muted-foreground"}>{task.message}</span>
				{task.status === "running" && (
					<Button variant="ghost" size="icon-xs" onClick={() => window.kroma.cancel(task.id)} aria-label="Cancel">
						<X />
					</Button>
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

/** A titled group of cards (Orca's SettingsGroup header). */
export function Group({ title, description, children, action }: { title: string; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
	return (
		<section className="space-y-2.5">
			<div className="flex items-end justify-between gap-3 px-0.5">
				<div className="min-w-0 space-y-1">
					<h3 className="text-[13px] leading-tight font-semibold">{title}</h3>
					{description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
				</div>
				{action && <div className="shrink-0">{action}</div>}
			</div>
			{children}
		</section>
	);
}
