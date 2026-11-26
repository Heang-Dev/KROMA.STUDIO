import { Droplets, Eye, EyeOff, ImagePlus, Subtitles, Trash2, Type } from "lucide-react";
import type { VideoObject } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addBlurBox, addImage, addText, coverOriginalSubtitles, fitTextWidth, objectsOf, removeObject, updateObject } from "@/lib/objects";
import { formatTime } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { Card, Row, Section, SliderField, SwitchRow } from "./common";

const ICONS = { blur: Droplets, image: ImagePlus, text: Type };

export function ObjectsPanel() {
	const project = useEditor((s) => s.project);
	const selectedId = useEditor((s) => (s.selection?.kind === "object" ? s.selection.id : null));
	const objects = objectsOf(project);
	const selected = objects.find((o) => o.id === selectedId);
	const hasVideo = project.clips.length > 0;

	return (
		<>
			<Section title="Add to the video" hint="Placed on the preview: drag to move, drag the corner to resize. Your subtitles always stay on top.">
				<Button className="h-auto min-h-9 w-full whitespace-normal py-2 leading-snug" disabled={!hasVideo} onClick={coverOriginalSubtitles}>
					<Subtitles /> Cover original subtitles
				</Button>
				<div className="grid grid-cols-1 gap-1.5 @[19rem]:grid-cols-3">
					<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5" disabled={!hasVideo} onClick={addBlurBox}>
						<Droplets /> Blur area
					</Button>
					<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5" disabled={!hasVideo} onClick={() => void addImage()}>
						<ImagePlus /> Image / logo
					</Button>
					<Button variant="outline" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5" disabled={!hasVideo} onClick={addText}>
						<Type /> Text
					</Button>
				</div>
				{!hasVideo && <p className="text-xs text-muted-foreground">Add a video first.</p>}
			</Section>

			{objects.length > 0 && (
				<Section title="On the video">
					<Card className="px-0">
						{objects.map((o) => {
							const Icon = ICONS[o.kind];
							const on = o.id === selectedId;
							return (
								<div key={o.id} className={cn("flex items-center gap-2 px-3 py-2", on && "bg-accent/50")}>
									<button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => useEditor.getState().select({ kind: "object", id: o.id })}>
										<Icon className="size-4 shrink-0 text-muted-foreground" />
										<span className={cn("truncate text-[13px]", o.hidden && "text-muted-foreground line-through")}>{o.kind === "text" ? o.text || "Text" : o.name}</span>
									</button>
									<Button variant="ghost" size="icon-xs" aria-label={o.hidden ? "Show" : "Hide"} onClick={() => updateObject(o.id, { hidden: !o.hidden })}>
										{o.hidden ? <EyeOff /> : <Eye />}
									</Button>
									<Button variant="ghost" size="icon-xs" aria-label="Delete" onClick={() => removeObject(o.id)}>
										<Trash2 />
									</Button>
								</div>
							);
						})}
					</Card>
				</Section>
			)}

			{selected && <ObjectSettings o={selected} />}
		</>
	);
}

function ObjectSettings({ o }: { o: VideoObject }) {
	const project = useEditor((s) => s.project);
	const time = useEditor((s) => s.time);
	const begin = () => useEditor.getState().checkpoint();
	const whole = o.start === undefined && o.end === undefined;

	return (
		<Section title={o.kind === "blur" ? "Blur area" : o.kind === "image" ? "Image" : "Text"}>
			<Card>
				{o.kind === "text" && (
					<>
						<Row
							label="Text"
							alignTop
							control={
								<Input
									className="h-8 w-44 text-xs"
									value={o.text ?? ""}
									onFocus={begin}
									onChange={(e) => updateObject(o.id, fitTextWidth({ ...o, text: e.target.value }, project), false)}
									aria-label="Text"
								/>
							}
						/>
						<Row
							label="Colours"
							control={
								<span className="flex items-center gap-2">
									<input type="color" aria-label="Text colour" value={o.color ?? "#ffffff"} onChange={(e) => updateObject(o.id, { color: e.target.value })} className="h-7 w-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5" />
									<input
										type="color"
										aria-label="Background colour"
										value={hexOf(o.background) ?? "#000000"}
										onChange={(e) => updateObject(o.id, fitTextWidth({ ...o, background: `${e.target.value}cc` }, project))}
										className="h-7 w-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
									/>
								</span>
							}
						/>
						<SwitchRow label="Background" checked={Boolean(o.background)} onChange={(v) => updateObject(o.id, fitTextWidth({ ...o, background: v ? "rgba(0,0,0,0.55)" : undefined }, project))} />
						<SwitchRow label="Bold" checked={Boolean(o.bold)} onChange={(v) => updateObject(o.id, fitTextWidth({ ...o, bold: v }, project))} />
					</>
				)}
				{o.kind === "blur" ? (
					<SliderField label="Blur" value={o.blur ?? 20} min={2} max={40} step={1} format={(v) => String(v)} onStart={begin} onChange={(v) => updateObject(o.id, { blur: v }, false)} />
				) : (
					<SliderField label="Opacity" value={o.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onStart={begin} onChange={(v) => updateObject(o.id, { opacity: v }, false)} />
				)}
				<SwitchRow label="Whole video" description={whole ? undefined : `Shown ${formatTime(o.start ?? 0)} → ${o.end === undefined ? "end" : formatTime(o.end)}`} checked={whole} onChange={(v) => updateObject(o.id, v ? { start: undefined, end: undefined } : { start: time, end: undefined })} />
				{!whole && (
					<Row
						label="Timing"
						description="Move the playhead, then set where it starts or ends."
						control={
							<span className="flex gap-1.5">
								<Button variant="outline" size="xs" onClick={() => updateObject(o.id, { start: time })}>
									Start here
								</Button>
								<Button variant="outline" size="xs" onClick={() => updateObject(o.id, { end: time > (o.start ?? 0) ? time : undefined })}>
									End here
								</Button>
							</span>
						}
					/>
				)}
			</Card>
		</Section>
	);
}

/** "#rrggbbaa" or "rgba(…)" → "#rrggbb" for the colour picker. */
function hexOf(value?: string): string | undefined {
	if (!value) return undefined;
	if (value.startsWith("#")) return value.slice(0, 7);
	const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : undefined;
}
