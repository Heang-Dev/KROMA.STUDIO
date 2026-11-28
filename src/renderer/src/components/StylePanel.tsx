import { useEffect, useRef } from "react";
import { type Aspect, type FitMode, SUBTITLE_FONTS, type SubtitleFont, type SubtitleStyle } from "@shared/types";
import { PRESET_OPTIONS, type Preset, currentPreset, lookOf } from "@/lib/stylePresets";
import { drawCue, ensureFonts } from "@/lib/subtitleRender";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { AppSelect, Card, ChoiceTiles, Row, Section, Segmented, SliderField, SwitchRow } from "./common";

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
			<Section title="Format" hint="Where the video is going. Export the same project in each format.">
				<ChoiceTiles label="Format" columns={3} value={project.aspect} options={ASPECTS} onChange={(v) => update((p) => ({ ...p, aspect: v }))} />
				<Card>
					<Row stack label="When it doesn't fit" control={<Segmented label="When the video doesn't fit" equalWidth value={project.fit} options={FITS} onChange={(v) => update((p) => ({ ...p, fit: v }))} />} />
				</Card>
			</Section>

			<Section title="Subtitle style">
				<Card>
					<Row stack label="Preset" control={<PresetGrid style={style} onPick={(v) => setStyle(lookOf(v))} />} />
					<Row stack label="Font" control={<AppSelect label="Font" value={style.font ?? "kantumruy"} options={FONT_OPTIONS} onChange={(font) => setStyle({ font })} />} />
					<SliderField label="Size" value={style.size} min={0.025} max={0.1} step={0.002} format={(v) => `${Math.round(v * 1000) / 10}%`} onStart={begin} onChange={(v) => setStyle({ size: v }, false)} />
					<SliderField label="Position" value={style.position} min={0.2} max={0.98} step={0.005} format={(v) => `${Math.round(v * 100)}%`} onStart={begin} onChange={(v) => setStyle({ position: v }, false)} />
					<SliderField label="Outline" value={style.outline} min={0} max={0.25} step={0.01} format={(v) => (v ? `${Math.round(v * 100)}` : "Off")} onStart={begin} onChange={(v) => setStyle({ outline: v }, false)} />
					<SliderField label="Shadow" value={style.shadow ?? 0} min={0} max={0.5} step={0.01} format={(v) => (v ? `${Math.round(v * 100)}` : "Off")} onStart={begin} onChange={(v) => setStyle({ shadow: v }, false)} />
					{(style.shadow ?? 0) > 0 && (
						<Row
							label="Shadow colour"
							description="Dark drops a shadow; a bright colour makes a glow."
							control={<ColorSwatch label="Shadow colour" value={style.shadowColor || "#000000"} onChange={(v) => setStyle({ shadowColor: v === "#000000" ? "" : v })} />}
						/>
					)}
					<Row label="Text colour" control={<ColorSwatch label="Text colour" value={style.color} onChange={(v) => setStyle({ color: v })} />} />
					<Row label="Outline colour" control={<ColorSwatch label="Outline colour" value={style.outlineColor} onChange={(v) => setStyle({ outlineColor: v })} />} />
					<SwitchRow label="Bold" checked={style.bold} onChange={(v) => setStyle({ bold: v })} />
					<SwitchRow label="Dark box behind the text" checked={style.box} onChange={(v) => setStyle({ box: v })} />
					<SwitchRow label="Bilingual" description="The original line above the translation." checked={style.showSource} onChange={(v) => setStyle({ showSource: v })} />
				</Card>
			</Section>
		</>
	);
}

/**
 * Every preset as a small tile, drawn by the same renderer as the preview and the export (so the tile is exactly
 * what gets burned in), on a dark-to-light backdrop so light and dark looks both read. Picking one sets its whole
 * look; size, position and Bilingual stay as they are.
 */
const FONT_OPTIONS = (Object.keys(SUBTITLE_FONTS) as SubtitleFont[]).map((value) => ({ value, label: SUBTITLE_FONTS[value].label, description: SUBTITLE_FONTS[value].description }));

const GROUPS = [...new Set(PRESET_OPTIONS.map((o) => o.group))];

function PresetGrid({ style, onPick }: { style: SubtitleStyle; onPick: (preset: Preset) => void }) {
	const current = currentPreset(style);
	return (
		<div role="radiogroup" aria-label="Preset" className="space-y-3">
			{GROUPS.map((group) => (
				<div key={group} className="space-y-1.5">
					<p className="text-[11px] text-muted-foreground">{group}</p>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5">
			{PRESET_OPTIONS.filter((o) => o.group === group).map((o) => (
				<button
					key={o.value}
					type="button"
					role="radio"
					aria-checked={current === o.value}
					title={o.label}
					onClick={() => onPick(o.value)}
					className={cn(
						"group flex min-w-0 flex-col overflow-hidden rounded-md border text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
						current === o.value ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30",
					)}
				>
					<PresetTile look={{ ...style, ...lookOf(o.value) }} />
					<span className={cn("truncate px-2 py-1 text-[11px]", current === o.value ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{o.label}</span>
				</button>
			))}
					</div>
				</div>
			))}
		</div>
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
