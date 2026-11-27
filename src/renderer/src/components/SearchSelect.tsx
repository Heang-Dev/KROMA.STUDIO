import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Kroma's select (the School Management System's AppSearchSelect, on Radix + cmdk): a field that looks like a text
// box, opening a list with a search box on top, ✓ beside the current choice (highlighted and scrolled into view when
// it opens), an optional muted second line per option, and optional groups. Search matches every word typed, anywhere
// in the label, value, description or group.

export interface SearchSelectOption<T extends string = string> {
	value: T;
	label: string;
	/** A second, muted line (a voice's description, a language's native name…). */
	description?: string;
	/** Options with the same group are listed under that heading, in the order they first appear. */
	group?: string;
	disabled?: boolean;
}

/**
 * Every typed word must match (any order, any case): a Latin word at the start of a word in the option ("king"
 * finds King, not "mocking"); Khmer, Chinese and other scripts written without spaces match anywhere.
 */
export function matchesAllWords(haystack: string, search: string): boolean {
	const text = haystack.toLowerCase();
	return search
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.every((word) => {
			if (!/^[a-z0-9]/.test(word)) return text.includes(word);
			const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			return new RegExp(`(^|[^a-z0-9])${escaped}`).test(text);
		});
}

/** More than this many options get a search box (a short fixed list is quicker without one). */
const SEARCH_FROM = 8;

export function SearchSelect<T extends string>({
	value,
	options,
	onChange,
	label,
	placeholder = "Choose…",
	searchPlaceholder = "Search…",
	searchable,
	icon,
	className,
	disabled,
}: {
	value: T | null;
	options: SearchSelectOption<T>[];
	onChange: (value: T) => void;
	/** Names the field for screen readers. */
	label: string;
	placeholder?: string;
	searchPlaceholder?: string;
	/** Defaults to on for lists longer than 8. */
	searchable?: boolean;
	icon?: ReactNode;
	className?: string;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => o.value === value);
	// cmdk keys items by a text value; make it unique and searchable (label, value, description, group).
	const itemValue = (o: SearchSelectOption<T>) => [o.label, o.description, o.group, o.value].filter(Boolean).join(" · ");
	const byGroup = new Map<string | undefined, SearchSelectOption<T>[]>();
	for (const o of options) byGroup.set(o.group, [...(byGroup.get(o.group) ?? []), o]);
	const groups = [...byGroup].map(([name, items]) => ({ name, items }));
	const withSearch = searchable ?? options.length > SEARCH_FROM;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				<button
					type="button"
					role="combobox"
					aria-label={label}
					aria-expanded={open}
					title={selected?.label}
					className={cn(
						"flex h-control w-full min-w-0 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-xs transition-colors outline-none",
						"hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:border-ring disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
						className,
					)}
				>
					{icon && <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{icon}</span>}
					<span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder}</span>
					<ChevronDown className="size-4 shrink-0 text-muted-foreground opacity-70" />
				</button>
			</PopoverTrigger>
			{/* As wide as the field, never narrower than a readable list. */}
			<PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
				<Command filter={(v, search) => (matchesAllWords(v, search) ? 1 : 0)} defaultValue={selected ? itemValue(selected) : undefined}>
					{withSearch && <CommandInput placeholder={searchPlaceholder} />}
					<CommandList className="max-h-72">
						<CommandEmpty>No results found.</CommandEmpty>
						{groups.map((g, i) => (
							<CommandGroup key={`${g.name ?? ""}-${i}`} heading={g.name}>
								{g.items.map((o) => {
									const isSelected = o.value === value;
									return (
										<CommandItem
											key={o.value}
											value={itemValue(o)}
											disabled={o.disabled}
											className="pl-8"
											onSelect={() => {
												onChange(o.value);
												setOpen(false);
											}}
										>
											<span className="absolute left-2 flex size-4 items-center justify-center">{isSelected && <Check className="size-3.5" />}</span>
											<span className="flex min-w-0 flex-1 flex-col">
												<span className={cn("truncate", isSelected && "font-medium")}>{o.label}</span>
												{o.description && <span className="truncate text-[11px] text-muted-foreground">{o.description}</span>}
											</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
