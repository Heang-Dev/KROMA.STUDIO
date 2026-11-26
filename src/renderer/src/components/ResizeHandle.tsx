import type { PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { type PanelKey, PANEL_LIMITS, useLayout } from "@/state/layout";

/**
 * A draggable divider on a panel's edge. `edge` is the side of the panel it sits on; dragging away from the panel
 * makes it bigger. Double-click restores the default size; arrow keys resize it too.
 */
export function ResizeHandle({ panel, edge, label }: { panel: PanelKey; edge: "left" | "right" | "top"; label: string }) {
	const size = useLayout((s) => s.sizes[panel]);
	const vertical = edge === "top";

	const start = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.preventDefault();
		const handle = e.currentTarget;
		handle.setPointerCapture(e.pointerId);
		const origin = vertical ? e.clientY : e.clientX;
		const startSize = useLayout.getState().sizes[panel];
		// Moving towards the outside of the panel grows it: right edge → right, left edge → left, top edge → up.
		const sign = edge === "right" ? 1 : -1;
		document.body.style.cursor = vertical ? "row-resize" : "col-resize";
		document.body.style.userSelect = "none";

		const move = (ev: PointerEvent) => useLayout.getState().resize(panel, startSize + sign * ((vertical ? ev.clientY : ev.clientX) - origin));
		const up = () => {
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", up);
			handle.removeEventListener("pointercancel", up);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			useLayout.getState().persist();
		};
		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", up);
		handle.addEventListener("pointercancel", up);
	};

	const onKey = (e: React.KeyboardEvent) => {
		const grow = vertical ? "ArrowUp" : edge === "right" ? "ArrowRight" : "ArrowLeft";
		const shrink = vertical ? "ArrowDown" : edge === "right" ? "ArrowLeft" : "ArrowRight";
		if (e.key !== grow && e.key !== shrink) return;
		e.preventDefault();
		e.stopPropagation();
		useLayout.getState().resize(panel, size + (e.key === grow ? 16 : -16));
		useLayout.getState().persist();
	};

	return (
		<div
			role="separator"
			aria-label={label}
			aria-orientation={vertical ? "horizontal" : "vertical"}
			aria-valuenow={size}
			aria-valuemin={PANEL_LIMITS[panel].min}
			aria-valuemax={PANEL_LIMITS[panel].max}
			tabIndex={0}
			title={`${label} · double-click to reset`}
			onPointerDown={start}
			onDoubleClick={() => useLayout.getState().reset(panel)}
			onKeyDown={onKey}
			className={cn(
				"group absolute z-20 outline-none",
				vertical ? "inset-x-0 -top-1 h-2 cursor-row-resize" : "inset-y-0 w-2 cursor-col-resize",
				edge === "right" && "-right-1",
				edge === "left" && "-left-1",
			)}
		>
			{/* The visible line: shows on hover, while dragging (active) and on keyboard focus. */}
			<span
				className={cn(
					"pointer-events-none absolute bg-ring opacity-0 transition-opacity delay-75 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100",
					vertical ? "inset-x-0 top-1/2 h-0.5 -translate-y-1/2" : "inset-y-0 left-1/2 w-0.5 -translate-x-1/2",
				)}
			/>
		</div>
	);
}
