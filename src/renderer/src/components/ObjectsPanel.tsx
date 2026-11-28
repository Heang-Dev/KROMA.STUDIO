import { useState } from "react";
import { Droplets, Eye, EyeOff, ImagePlus, Loader2, Subtitles, Trash2, Type } from "lucide-react";
import type { VideoObject } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addBlurBox, addImage, addText, coverOriginalSubtitles, fitTextWidth, objectsOf, removeObject, updateObject } from "@/lib/objects";
import { formatTime } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { Card, Row, Section, SliderField, SwitchRow } from "./common";
import { t } from "@shared/i18n";

const ICONS = { blur: Droplets, image: ImagePlus, text: Type };

export function ObjectsPanel() {
	const project = useEditor((s) => s.project);
	const selectedId = useEditor((s) => (s.selection?.kind === "object" ? s.selection.id : null));
	const objects = objectsOf(project);
	const selected = objects.find((o) => o.id === selectedId);
	const hasVideo = project.clips.length > 0;
	const [finding, setFinding] = useState(false);
	const hideSubtitles = async () => {
		setFinding(true);
		try {
			await coverOriginalSubtitles();
		} finally {
			setFinding(false);
		}
	};

	return (
		<>
			<Section title={t("Add to the video")} hint={t("Placed on the preview: drag to move, drag the corner to resize. Your subtitles always stay on top.")}>
				<Button className="h-auto min-h-control w-full whitespace-normal py-2 leading-snug" disabled={!hasVideo || finding} onClick={() => void hideSubtitles()}>
					{finding ? <Loader2 className="animate-spin" /> : <Subtitles />} {finding ? t("Looking for burned-in subtitles…") : t("Hide original subtitles")}
				</Button>
				<div className="grid grid-cols-1 gap-1.5 @[17rem]:grid-cols-3">
					<Button variant="outline" size="sm" disabled={!hasVideo} onClick={addBlurBox}>
						<Droplets /> {t("Blur area")}
					</Button>
					<Button variant="outline" size="sm" disabled={!hasVideo} onClick={() => void addImage()}>
						<ImagePlus /> {t("Image")}
					</Button>
					<Button variant="outline" size="sm" disabled={!hasVideo} onClick={addText}>
						<Type /> {t("Text")}
					</Button>
				</div>
				{!hasVideo && <p className="text-xs text-muted-foreground">{t("Add a video first.")}</p>}
			</Section>

			{objects.length > 0 && (
				<Section title={t("On the video")}>
					<Card className="px-0">
						{objects.map((o) => {
							const Icon = ICONS[o.kind];
							const on = o.id === selectedId;
							return (
								<div key={o.id} className={cn("flex items-center gap-2 px-3 py-2", on && "bg-accent/50")}>
									<button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => useEditor.getState().select({ kind: "object", id: o.id })}>
										<Icon className="size-4 shrink-0 text-muted-foreground" />
										<span className={cn("truncate text-[13px]", o.hidden && "text-muted-foreground line-through")}>{o.kind === "text" ? o.text || t("Text") : t(o.name)}</span>
									</button>
									<Button variant="ghost" size="icon-xs" aria-label={o.hidden ? t("Show") : t("Hide")} onClick={() => updateObject(o.id, { hidden: !o.hidden })}>
										{o.hidden ? <EyeOff /> : <Eye />}
									</Button>
									<Button variant="ghost" size="icon-xs" aria-label={t("Delete")} onClick={() => removeObject(o.id)}>
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
		<Section title={o.kind === "blur" ? t("Blur area") : o.kind === "image" ? t("Image") : t("Text")}>
			<Card>
				{o.kind === "text" && (
					<>
						<Row
							label={t("Text")}
							alignTop
							control={
								<Input
									className="w-44 text-xs"
									value={o.text ?? ""}
									onFocus={begin}
									onChange={(e) => updateObject(o.id, fitTextWidth({ ...o, text: e.target.value }, project), false)}
									aria-label={t("Text")}
								/>
							}
						/>
						<Row
							label={t("Colours")}
							control={
								<span className="flex items-center gap-2">
									<input type="color" aria-label={t("Text colour")} value={o.color ?? "#ffffff"} onChange={(e) => updateObject(o.id, { color: e.target.value })} className="h-7 w-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5" />
									<input
										type="color"
										aria-label={t("Background colour")}
										value={hexOf(o.background) ?? "#000000"}
										onChange={(e) => updateObject(o.id, fitTextWidth({ ...o, background: `${e.target.value}cc` }, project))}
										className="h-7 w-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
									/>
								</span>
							}
						/>
						<SwitchRow label={t("Background")} checked={Boolean(o.background)} onChange={(v) => updateObject(o.id, fitTextWidth({ ...o, background: v ? "rgba(0,0,0,0.55)" : undefined }, project))} />
						<SwitchRow label={t("Bold")} checked={Boolean(o.bold)} onChange={(v) => updateObject(o.id, fitTextWidth({ ...o, bold: v }, project))} />
					</>
				)}
				{o.kind === "blur" ? (
					<SliderField label={t("Blur")} value={o.blur ?? 20} min={2} max={40} step={1} format={(v) => String(v)} onStart={begin} onChange={(v) => updateObject(o.id, { blur: v }, false)} />
				) : (
					<SliderField label={t("Opacity")} value={o.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onStart={begin} onChange={(v) => updateObject(o.id, { opacity: v }, false)} />
				)}
				<SwitchRow label={t("Whole video")} description={whole ? undefined : t("Shown {start} → {end}", { start: formatTime(o.start ?? 0), end: o.end === undefined ? t("end") : formatTime(o.end) })} checked={whole} onChange={(v) => updateObject(o.id, v ? { start: undefined, end: undefined } : { start: time, end: undefined })} />
				{!whole && (
					<Row
						label={t("Timing")}
						description={t("Move the playhead, then set where it starts or ends.")}
						control={
							<span className="flex gap-1.5">
								<Button variant="outline" size="xs" onClick={() => updateObject(o.id, { start: time })}>
									{t("Start here")}
								</Button>
								<Button variant="outline" size="xs" onClick={() => updateObject(o.id, { end: time > (o.start ?? 0) ? time : undefined })}>
									{t("End here")}
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
