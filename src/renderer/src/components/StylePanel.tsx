import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyStyles } from "@/state/myStyles";
import { CAPTION_ANIMATIONS } from "@shared/captionMotion";
import { type Aspect, type FitMode, SUBTITLE_FONTS, type SubtitleFont, type SubtitleStyle } from "@shared/types";
import { PRESET_OPTIONS, type Preset, currentPreset, lookOf } from "@/lib/stylePresets";
import { drawCue, ensureFonts } from "@/lib/subtitleRender";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { AppSelect, Card, ChoiceTiles, Row, Section, Segmented, SliderField, SwitchRow } from "./common";
import { t } from "@shared/i18n";

const ASPECTS: { value: Aspect; label: string; description: string }[] = [
	{ value: "16:9", label: "16:9", description: "YouTube, Facebook" },
	{ value: "9:16", label: "9:16", description: "TikTok, Reels" },
	{ value: "1:1", label: "1:1", description: "Feed" },
];

const FITS: { value: FitMode; label: string }[] = [
	{ value: "blur", label: "Blur" },
	{ value: "black", label: "Bars" },
	{ value: "fill", label: "Crop" },
];

export function StylePanel() {
	const project = useEditor((s) => s.project);
	const update = useEditor((s) => s.update);
	const style = project.style;
	const setStyle = (patch: Partial<SubtitleStyle>, history = true) => update((p) => ({ ...p, style: { ...p.style, ...patch } }), history);
	const begin = () => useEditor.getState().checkpoint();

	return (
		<>
			<Section title={t("Format")} hint={t("Where the video is going. Export the same project in each format.")}>
				<ChoiceTiles label={t("Format")} columns={3} value={project.aspect} options={ASPECTS.map((a) => ({ ...a, description: t(a.description) }))} onChange={(v) => update((p) => ({ ...p, aspect: v }))} />
				<Card>
					<Row stack label={t("When it doesn't fit")} control={<Segmented label={t("When the video doesn't fit")} equalWidth value={project.fit} options={FITS.map((f) => ({ ...f, label: t(f.label) }))} onChange={(v) => update((p) => ({ ...p, fit: v }))} />} />
				</Card>
			</Section>

			<Section title={t("Subtitle style")}>
				<Card>
					<Row stack label={t("Preset")} control={<PresetGrid style={style} onPick={(v) => setStyle(lookOf(v))} onPickMine={(mine) => setStyle({ ...mine, showSource: style.showSource })} />} />
					<Row stack label={t("Animation")} description={t("How each line comes in, or follows the voice word by word.")} control={<AppSelect label={t("Animation")} value={style.animation ?? "none"} options={CAPTION_ANIMATIONS.map((a) => ({ ...a, label: t(a.label), description: t(a.description) }))} onChange={(animation) => setStyle({ animation })} />} />
					{style.animation === "words" && <Row label={t("Spoken word colour")} control={<ColorSwatch label={t("Spoken word colour")} value={style.highlightColor || "#ffe14d"} onChange={(v) => setStyle({ highlightColor: v })} />} />}
					<Row stack label={t("Font")} control={<AppSelect label={t("Font")} value={style.font ?? "kantumruy"} options={FONT_OPTIONS.map((f) => ({ ...f, description: t(f.description) }))} onChange={(font) => setStyle({ font })} />} />
					<SliderField label={t("Size")} value={style.size} min={0.025} max={0.1} step={0.002} format={(v) => `${Math.round(v * 1000) / 10}%`} onStart={begin} onChange={(v) => setStyle({ size: v }, false)} />
					<SliderField label={t("Position")} value={style.position} min={0.2} max={0.98} step={0.005} format={(v) => `${Math.round(v * 100)}%`} onStart={begin} onChange={(v) => setStyle({ position: v }, false)} />
					<SliderField label={t("Outline")} value={style.outline} min={0} max={0.25} step={0.01} format={(v) => (v ? `${Math.round(v * 100)}` : t("Off"))} onStart={begin} onChange={(v) => setStyle({ outline: v }, false)} />
					<SliderField label={t("Shadow")} value={style.shadow ?? 0} min={0} max={0.5} step={0.01} format={(v) => (v ? `${Math.round(v * 100)}` : t("Off"))} onStart={begin} onChange={(v) => setStyle({ shadow: v }, false)} />
					{(style.shadow ?? 0) > 0 && (
						<Row
							label={t("Shadow colour")}
							description={t("Dark drops a shadow; a bright colour makes a glow.")}
							control={<ColorSwatch label={t("Shadow colour")} value={style.shadowColor || "#000000"} onChange={(v) => setStyle({ shadowColor: v === "#000000" ? "" : v })} />}
						/>
					)}
					<Row label={t("Text colour")} control={<ColorSwatch label={t("Text colour")} value={style.color} onChange={(v) => setStyle({ color: v })} />} />
					<Row label={t("Outline colour")} control={<ColorSwatch label={t("Outline colour")} value={style.outlineColor} onChange={(v) => setStyle({ outlineColor: v })} />} />
					<SwitchRow label={t("Bold")} checked={style.bold} onChange={(v) => setStyle({ bold: v })} />
					<SwitchRow label={t("Dark box behind the text")} checked={style.box} onChange={(v) => setStyle({ box: v })} />
					<SwitchRow label={t("Bilingual")} description={t("The original line above the translation.")} checked={style.showSource} onChange={(v) => setStyle({ showSource: v })} />
					<SaveMyStyle style={style} />
				</Card>
			</Section>
		</>
	);
}

const FONT_OPTIONS = (Object.keys(SUBTITLE_FONTS) as SubtitleFont[]).map((value) => ({ value, label: SUBTITLE_FONTS[value].label, description: SUBTITLE_FONTS[value].description }));

const GROUPS = [...new Set(PRESET_OPTIONS.map((o) => o.group))];

/** A saved style counts as chosen when everything but Bilingual matches. */
const sameStyle = (a: SubtitleStyle, b: SubtitleStyle) => JSON.stringify({ ...a, showSource: false }) === JSON.stringify({ ...b, showSource: false });

const tileClass = (on: boolean) =>
	cn(
		"group flex min-w-0 flex-col overflow-hidden rounded-md border text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
		on ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30",
	);
const labelClass = (on: boolean) => cn("truncate px-2 py-1 text-[11px]", on ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground");

/**
 * My saved styles, then every preset, as small tiles drawn by the same renderer as the preview and the export (so a
 * tile is exactly what gets burned in), on a dark-to-light backdrop so light and dark looks both read. A preset sets
 * its whole look (size, position and Bilingual stay); one of my styles sets everything it saved.
 */
function PresetGrid({ style, onPick, onPickMine }: { style: SubtitleStyle; onPick: (preset: Preset) => void; onPickMine: (style: SubtitleStyle) => void }) {
	const current = currentPreset(style);
	const mine = useMyStyles((s) => s.list);
	const load = useMyStyles((s) => s.load);
	useEffect(() => void load(), [load]);
	return (
		<div role="radiogroup" aria-label={t("Preset")} className="space-y-3">
			{mine.length > 0 && (
				<div className="space-y-1.5">
					<p className="text-[11px] text-muted-foreground">{t("My styles")}</p>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5">
						{mine.map((m) => {
							const on = sameStyle(style, m.style);
							return (
								<div key={m.id} className="group/tile relative min-w-0">
									<button type="button" role="radio" aria-checked={on} title={m.name} onClick={() => onPickMine(m.style)} className={cn(tileClass(on), "w-full")}>
										<PresetTile look={m.style} />
										<span className={labelClass(on)}>{m.name}</span>
									</button>
									<button
										type="button"
										aria-label={t("Delete my style {name}", { name: m.name })}
										title={t("Delete this style")}
										onClick={() => {
											if (window.confirm(t(`Delete your style "{name}"? Projects that use it keep their look.`, { name: m.name }))) void useMyStyles.getState().remove(m.id);
										}}
										className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-sm bg-black/60 text-white opacity-0 transition-opacity group-hover/tile:opacity-100 hover:bg-black/80 focus-visible:opacity-100"
									>
										<X className="size-3" />
									</button>
								</div>
							);
						})}
					</div>
				</div>
			)}
			{GROUPS.map((group) => (
				<div key={group} className="space-y-1.5">
					<p className="text-[11px] text-muted-foreground">{t(group)}</p>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5">
						{PRESET_OPTIONS.filter((o) => o.group === group).map((o) => (
							<button key={o.value} type="button" role="radio" aria-checked={current === o.value} title={t(o.label)} onClick={() => onPick(o.value)} className={tileClass(current === o.value)}>
								<PresetTile look={{ ...style, ...lookOf(o.value) }} />
								<span className={labelClass(current === o.value)}>{t(o.label)}</span>
							</button>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

/** "Save as my style": a name, then the whole current style is kept for every project (and Batch). */
function SaveMyStyle({ style }: { style: SubtitleStyle }) {
	const [name, setName] = useState<string | null>(null);
	const mine = useMyStyles((s) => s.list);
	const saved = mine.find((m) => sameStyle(style, m.style));
	if (name === null)
		return (
			<Row
				label={t("My styles")}
				description={saved ? t(`This look is saved as "{name}".`, { name: saved.name }) : t("Keep this look (size, position and font too) to use it in every project and in Batch.")}
				control={
					<Button variant="outline" size="sm" disabled={Boolean(saved)} onClick={() => setName(t("My style {n}", { n: mine.length + 1 }))}>
						<BookmarkPlus /> {t("Save as my style")}
					</Button>
				}
			/>
		);
	const save = async () => {
		const entry = await useMyStyles.getState().add(name, style);
		setName(null);
		toast.success(t(`Saved "{name}" in My styles`, { name: entry.name }));
	};
	return (
		<Row
			stack
			label={t("Name your style")}
			control={
				<form
					className="flex gap-1.5"
					onSubmit={(e) => {
						e.preventDefault();
						void save();
					}}
				>
					<Input autoFocus aria-label={t("Style name")} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1" />
					<Button type="submit" size="sm" disabled={!name.trim()}>
						{t("Save")}
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={() => setName(null)}>
						{t("Cancel")}
					</Button>
				</form>
			}
		/>
	);
}

const TILE = { width: 192, height: 96 };

function PresetTile({ look }: { look: SubtitleStyle }) {
	const ref = useRef<HTMLCanvasElement>(null);
	const key = JSON.stringify([look.color, look.outlineColor, look.outline, look.box, look.boxColor, look.bold, look.shadow, look.shadowColor, look.font]);
	useEffect(() => {
		let cancelled = false;
		void ensureFonts().then(() => {
			const ctx = ref.current?.getContext("2d");
			if (!ctx || cancelled) return;
			ctx.clearRect(0, 0, TILE.width, TILE.height);
			// Text sized for the tile (not the video), sitting a little below the middle.
			drawCue(ctx, { text: "Aa ក", source: "" }, { ...look, size: 0.34, position: 0.78, showSource: false }, TILE);
		});
		return () => {
			cancelled = true;
		};
	}, [key]);
	return (
		<canvas
			ref={ref}
			width={TILE.width}
			height={TILE.height}
			aria-hidden
			className="aspect-[2/1] w-full"
			// A backdrop like a video frame: darker at the top, light at the bottom, so every look is tested on both.
			style={{ background: "linear-gradient(160deg, #3b3f4a 0%, #6b7280 55%, #c9ccd3 100%)" }}
		/>
	);
}

/** Orca's ColorField: a swatch plus the hex value. */
function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	return (
		<span className="flex items-center gap-2">
			<span className="font-mono text-[11px] text-muted-foreground uppercase">{value}</span>
			<input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5" aria-label={label} />
		</span>
	);
}
