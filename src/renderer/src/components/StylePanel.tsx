import type { ReactNode } from "react";
import type { Aspect, FitMode, SubtitleStyle } from "@shared/types";
import { useEditor } from "@/state/store";
import { Label, Section } from "./ui";

const ASPECTS: { value: Aspect; label: string; hint: string }[] = [
	{ value: "16:9", label: "16:9", hint: "YouTube, Facebook" },
	{ value: "9:16", label: "9:16", hint: "TikTok, Reels, Shorts" },
	{ value: "1:1", label: "1:1", hint: "Facebook feed" },
];

const FITS: { value: FitMode; label: string }[] = [
	{ value: "blur", label: "Blurred background" },
	{ value: "black", label: "Black bars" },
	{ value: "fill", label: "Crop to fill" },
];

const PRESETS: { name: string; style: Partial<SubtitleStyle> }[] = [
	{ name: "Classic", style: { color: "#ffffff", outlineColor: "#000000", outline: 0.12, box: false } },
	{ name: "Yellow", style: { color: "#ffe14d", outlineColor: "#000000", outline: 0.12, box: false } },
	{ name: "Box", style: { color: "#ffffff", outline: 0, box: true, boxColor: "rgba(0,0,0,0.6)" } },
	{ name: "TikTok", style: { color: "#ffffff", outlineColor: "#000000", outline: 0.16, box: false, bold: true } },
];

export function StylePanel() {
	const project = useEditor((s) => s.project);
	const update = useEditor((s) => s.update);
	const style = project.style;
	const setStyle = (patch: Partial<SubtitleStyle>, history = true) => update((p) => ({ ...p, style: { ...p.style, ...patch } }), history);
	const begin = () => useEditor.getState().checkpoint();

	return (
		<>
			<Section title="Format" hint="Pick where the video is going. You can export the same project in each format.">
				<div className="grid grid-cols-3 gap-2">
					{ASPECTS.map((a) => (
						<button
							key={a.value}
							type="button"
							onClick={() => update((p) => ({ ...p, aspect: a.value }))}
							className={`rounded-md border px-2 py-2 text-left transition-colors ${project.aspect === a.value ? "border-accent bg-accent/10" : "border-line bg-bg hover:border-line-strong"}`}
						>
							<span className="block text-[13px] font-semibold">{a.label}</span>
							<span className="block text-[10.5px] leading-tight text-dim">{a.hint}</span>
						</button>
					))}
				</div>
				<div className="mt-3">
					<Label>When the video doesn't fit</Label>
					<div className="grid grid-cols-3 gap-1 rounded-md bg-bg p-1">
						{FITS.map((f) => (
							<button
								key={f.value}
								type="button"
								onClick={() => update((p) => ({ ...p, fit: f.value }))}
								className={`rounded px-1.5 py-1.5 text-[11.5px] transition-colors ${project.fit === f.value ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}
							>
								{f.label}
							</button>
						))}
					</div>
				</div>
			</Section>

			<Section title="Subtitle style">
				<div className="mb-4 grid grid-cols-4 gap-1.5">
					{PRESETS.map((p) => (
						<button key={p.name} type="button" onClick={() => setStyle(p.style)} className="rounded-md border border-line bg-bg py-1.5 text-xs hover:border-line-strong">
							{p.name}
						</button>
					))}
				</div>
				<Slider label="Size" value={style.size} min={0.025} max={0.1} step={0.002} format={(v) => `${Math.round(v * 1000) / 10}%`} onStart={begin} onChange={(v) => setStyle({ size: v }, false)} />
				<Slider label="Position" value={style.position} min={0.2} max={0.98} step={0.005} format={(v) => `${Math.round(v * 100)}%`} onStart={begin} onChange={(v) => setStyle({ position: v }, false)} />
				<Slider label="Outline" value={style.outline} min={0} max={0.25} step={0.01} format={(v) => (v ? `${Math.round(v * 100)}` : "Off")} onStart={begin} onChange={(v) => setStyle({ outline: v }, false)} />
				<div className="mt-3 grid grid-cols-2 gap-3">
					<Color label="Text" value={style.color} onChange={(v) => setStyle({ color: v })} />
					<Color label="Outline" value={style.outlineColor} onChange={(v) => setStyle({ outlineColor: v })} />
				</div>
				<div className="mt-4 space-y-2">
					<Toggle checked={style.bold} onChange={(v) => setStyle({ bold: v })}>Bold</Toggle>
					<Toggle checked={style.box} onChange={(v) => setStyle({ box: v })}>Dark box behind the text</Toggle>
					<Toggle checked={style.showSource} onChange={(v) => setStyle({ showSource: v })}>Show the Chinese line above (bilingual)</Toggle>
				</div>
			</Section>
		</>
	);
}

function Slider({ label, value, min, max, step, format, onChange, onStart }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void; onStart: () => void }) {
	return (
		<label className="mb-3 block">
			<span className="mb-1 flex justify-between text-xs text-muted">
				<span>{label}</span>
				<span className="tabular-nums text-fg">{format(value)}</span>
			</span>
			<input type="range" min={min} max={max} step={step} value={value} onPointerDown={onStart} onKeyDown={onStart} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
		</label>
	);
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	return (
		<label className="flex items-center gap-2 text-xs text-muted">
			<input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded border border-line bg-transparent" />
			{label}
		</label>
	);
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
	return (
		<label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
			<input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
			{children}
		</label>
	);
}
