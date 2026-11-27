import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know Kroma's control sizes (tokens.css: h-control, h-control-xs), or `h-control` and a later
// `h-auto` both stay and the fixed height can win, clipping a button whose text wraps.
const twMerge = extendTailwindMerge({ extend: { theme: { spacing: ["control", "control-xs"] } } });

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
