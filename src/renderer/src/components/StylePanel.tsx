import type { Aspect, FitMode, SubtitleStyle } from "@shared/types";
import { useEditor } from "@/state/store";
import { Card, ChoiceTiles, Row, Section, Segmented, SliderField, SwitchRow } from "./common";

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

type Preset = "classic" | "yellow" | "box" | "tiktok";

// Subtitle colours are part of the video picture, not the app theme, so they are plain colour values.
const PRESETS: Record<Preset, Partial<SubtitleStyle>> = {
	classic: { color: "#ffffff", outlineColor: "#000000", outline: 0.12, box: false },
	yellow: { color: "#ffe14d", outlineColor: "#000000", outline: 0.12, box: false },
	box: { color: "#ffffff", outline: 0, box: true, boxColor: "rgba(0,0,0,0.6)" },
	tiktok: { color: "#ffffff", outlineColor: "#000000", outline: 0.16, box: false, bold: true },
};

function currentPreset(style: SubtitleStyle): Preset | "" {
	const match = (Object.keys(PRESETS) as Preset[]).find((key) => Object.entries(PRESETS[key]).every(([k, v]) => style[k as keyof SubtitleStyle] === v));
	return match ?? "";
}

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
					<Row label="When it doesn't fit" control={<Segmented label="When the video doesn't fit" size="sm" value={project.fit} options={FITS} onChange={(v) => update((p) => ({ ...p, fit: v }))} />} />
				</Card>
			</Section>

			<Section title="Subtitle style">
				<Card>
					<Row
						label="Preset"
						control={
							<Segmented<Preset | "">
								label="Preset"
								size="sm"
								value={currentPreset(style)}
								options={[
									{ value: "classic", label: "Classic" },
									{ value: "yellow", label: "Yellow" },
									{ value: "box", label: "Box" },
									{ value: "tiktok", label: "TikTok" },
								]}
								onChange={(v) => v && setStyle(PRESETS[v])}
							/>
						}
					/>
					<SliderField label="Size" value={style.size} min={0.025} max={0.1} step={0.002} format={(v) => `${Math.round(v * 1000) / 10}%`} onStart={begin} onChange={(v) => setStyle({ size: v }, false)} />
					<SliderField label="Position" value={style.position} min={0.2} max={0.98} step={0.005} format={(v) => `${Math.round(v * 100)}%`} onStart={begin} onChange={(v) => setStyle({ position: v }, false)} />
					<SliderField label="Outline" value={style.outline} min={0} max={0.25} step={0.01} format={(v) => (v ? `${Math.round(v * 100)}` : "Off")} onStart={begin} onChange={(v) => setStyle({ outline: v }, false)} />
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

/** Orca's ColorField: a swatch plus the hex value. */
function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	return (
		<span className="flex items-center gap-2">
			<span className="font-mono text-[11px] text-muted-foreground uppercase">{value}</span>
			<input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5" aria-label={label} />
		</span>
	);
}
