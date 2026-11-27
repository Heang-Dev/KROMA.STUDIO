/**
 * Building blocks of the empty-state scenes (AppEmptyIllustration): every scene is drawn on a 160 × 104 canvas with
 * outlines in the foreground colour, accents and tints in the tone (currentColor), and a soft shadow on the ground.
 */

/** Outlined shape filled with the card colour, so it covers what is drawn behind it. */
export const line = "fill-card stroke-foreground/70";

/** A light wash of the tone colour. */
export const tint = { fill: "currentColor", fillOpacity: 0.12 };

/** The soft shadow every scene stands on. */
export function Ground({ rx = 44, ry = 5 }: { rx?: number; ry?: number }) {
	return <ellipse cx="80" cy="96" rx={rx} ry={ry} className="fill-muted" />;
}

/** Small accent cross. */
export function Plus({ x, y }: { x: number; y: number }) {
	return <path d={`M${x} ${y - 4}v8m-4-4h8`} className="stroke-current" />;
}

/** Small accent ring. */
export function Dot({ x, y }: { x: number; y: number }) {
	return <circle cx={x} cy={y} r="2" className="fill-none stroke-current" />;
}

/** Four-point sparkle. */
export function Sparkle({ x, y }: { x: number; y: number }) {
	return <path d={`M${x} ${y - 5}l1.5 3.5L${x + 5} ${y}l-3.5 1.5L${x} ${y + 5}l-1.5-3.5L${x - 5} ${y}l3.5-1.5z`} className="fill-current stroke-none" fillOpacity={0.6} />;
}

/** A shape that covers what is behind it and carries the tone"s wash. */
export function Tinted({ d, className = "stroke-foreground/70", strokeWidth }: { d: string; className?: string; strokeWidth?: number }) {
	return (
		<>
			<path d={d} className="fill-card stroke-none" />
			<path d={d} {...tint} className={className} strokeWidth={strokeWidth} />
		</>
	);
}
