import type { PointerEvent as ReactPointerEvent } from "react";
import { ASPECT_SIZE, type VideoObject } from "@shared/types";
import { TEXT_FONT, fitTextWidth, isVisibleAt, objectsOf, updateObject } from "@/lib/objects";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { mediaUrl } from "./Preview";

/** Objects drawn over the preview, CapCut-style: click to select, drag to move, drag the corner to resize. */
export function ObjectLayer({ width, height }: { width: number; height: number }) {
	const project = useEditor((s) => s.project);
	const time = useEditor((s) => s.time);
	const selectedId = useEditor((s) => (s.selection?.kind === "object" ? s.selection.id : null));
	const output = ASPECT_SIZE[project.aspect];
	const scale = width / output.width;
	const objects = objectsOf(project).filter((o) => isVisibleAt(o, time) || o.id === selectedId);

	const drag = (e: ReactPointerEvent, o: VideoObject, mode: "move" | "resize") => {
		e.stopPropagation();
		e.preventDefault();
		useEditor.getState().select({ kind: "object", id: o.id });
		useEditor.getState().checkpoint();
		const startX = e.clientX;
		const startY = e.clientY;
		const aspect = o.h / o.w;
		const move = (ev: PointerEvent) => {
			const dx = (ev.clientX - startX) / width;
			const dy = (ev.clientY - startY) / height;
			if (mode === "move") {
				updateObject(o.id, { x: Math.min(1 - o.w, Math.max(0, o.x + dx)), y: Math.min(1 - o.h, Math.max(0, o.y + dy)) }, false);
			} else if (o.kind === "blur") {
				updateObject(o.id, { w: Math.max(0.03, Math.min(1 - o.x, o.w + dx)), h: Math.max(0.03, Math.min(1 - o.y, o.h + dy)) }, false);
			} else if (o.kind === "image") {
				const w = Math.max(0.03, Math.min(1 - o.x, o.w + dx));
				updateObject(o.id, { w, h: w * aspect }, false);
			} else {
				// Text: the height sets the font size; the width follows the text.
				const h = Math.max(0.025, Math.min(0.3, o.h + dy));
				updateObject(o.id, fitTextWidth({ ...o, h }, useEditor.getState().project), false);
			}
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	};

	return (
		<div className="pointer-events-none absolute inset-0">
			{objects.map((o) => {
				const selected = o.id === selectedId;
				const style = { left: o.x * width, top: o.y * height, width: o.w * width, height: o.h * height };
				return (
					<div
						key={o.id}
						className={cn("pointer-events-auto absolute cursor-move", selected ? "outline-2 outline-white outline-dashed" : "hover:outline hover:outline-white/50")}
						style={style}
						onPointerDown={(e) => drag(e, o, "move")}
						onClick={(e) => e.stopPropagation()}
					>
						{o.kind === "blur" && <div className="absolute inset-0" style={{ backdropFilter: `blur(${(o.blur ?? 20) * scale}px)`, WebkitBackdropFilter: `blur(${(o.blur ?? 20) * scale}px)` }} />}
						{o.kind === "image" && o.path && <img src={mediaUrl(o.path)} alt="" draggable={false} className="absolute inset-0 size-full object-fill" style={{ opacity: o.opacity }} />}
						{o.kind === "text" && (
							<div
								className="absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap"
								style={{
									opacity: o.opacity,
									background: o.background || "transparent",
									borderRadius: o.h * height * 0.18,
									color: o.color,
									fontFamily: TEXT_FONT,
									fontWeight: o.bold ? 700 : 500,
									fontSize: o.h * height * 0.62,
									lineHeight: 1,
									textShadow: o.background ? undefined : "0 0 3px rgba(0,0,0,0.9)",
								}}
							>
								{o.text}
							</div>
						)}
						{selected && <div className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-full border border-black/40 bg-white" onPointerDown={(e) => drag(e, o, "resize")} />}
					</div>
				);
			})}
		</div>
	);
}
