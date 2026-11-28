import { useEffect, useRef, useState } from "react";
import { Crosshair, FolderOpen, ImageDown, Loader2, RectangleHorizontal, RectangleVertical, Sparkles } from "lucide-react";
import type { PostFormat } from "@shared/batch";
import { COVER_LABELS, COVER_SIZE, COVER_TEMPLATES, type CoverLabel, type CoverSettings, type CoverTemplate } from "@shared/cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { coverText, drawCover } from "@/lib/coverRender";
import { coverBlurs, coverEpisode, coverFrame, coverSettingsOf, coverTime, coverWords, makeCovers, setCover } from "@/lib/covers";
import { ensureFonts } from "@/lib/subtitleRender";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { AppSelect, Card, Row, Section, Segmented } from "./common";

const COLORS = ["#e11d48", "#f97316", "#facc15", "#22c55e", "#0ea5e9", "#7f22fe", "#111111"];
const SIZES: { value: PostFormat; label: string }[] = [
	{ value: "16:9", label: "16:9 · YouTube" },
	{ value: "9:16", label: "9:16 · TikTok" },
];

type Frame = ImageBitmap | null;

/** Draws a cover into a canvas (full size for the preview, small for the design tiles). */
function useCoverCanvas(frame: Frame, width: number, height: number, settings: CoverSettings, label: string, title: string, blurs: ReturnType<typeof coverBlurs>) {
	const ref = useRef<HTMLCanvasElement>(null);
	const key = JSON.stringify([width, height, settings, label, title, blurs]);
	useEffect(() => {
		const c = ref.current;
		if (!c || !frame) return;
		c.width = width;
		c.height = height;
		drawCover(c.getContext("2d")!, frame, width, height, settings, coverText(settings, label, title), blurs);
		// key: everything that's drawn
	}, [frame, key]);
	return ref;
}

/**
 * Post → Cover: a thumbnail for the episode, with its number ("ភាគ ៥") and the series title on a frame of the video.
 * The preview is drawn exactly like the saved JPEG. Batch makes the same covers for a whole series.
 */
export function CoverSection() {
	const project = useEditor((s) => s.project);
	const projectPath = useEditor((s) => s.projectPath);
	const time = useEditor((s) => s.time);
	const settings = coverSettingsOf(project);
	const words = coverWords(project, projectPath);
	const episode = coverEpisode(project, projectPath);
	const blurs = coverBlurs(project);
	const media = project.media.find((m) => m.id === project.clips[0]?.mediaId) ?? project.media[0];
	const [format, setFormat] = useState<PostFormat>("16:9");
	const [busy, setBusy] = useState<"" | "pick" | "save">("");
	const [frame, setFrame] = useState<Frame>(null);

	// The frame: the chosen moment (Kroma picks a good one the first time).
	useEffect(() => {
		if (!media) return;
		let cancelled = false;
		void (async () => {
			await ensureFonts();
			const t = await coverTime().catch(() => 0);
			const image = await coverFrame(media.path, t).catch(() => null);
			if (!cancelled) setFrame(image);
		})();
		return () => {
			cancelled = true;
		};
	}, [media?.path, settings.time]);

	const size = COVER_SIZE[format];
	const preview = useCoverCanvas(frame, size.width, size.height, settings, words.label, words.title, blurs);

	if (!media)
		return (
			<Section title="Cover" hint="A thumbnail with the episode number, for YouTube and the other platforms.">
				<p className="text-xs text-muted-foreground">Add a video first.</p>
			</Section>
		);

	const pick = async () => {
		setBusy("pick");
		try {
			setCover({ time: await window.kroma.pickCoverTime(media.path, media.duration) });
		} finally {
			setBusy("");
		}
	};
	const save = async () => {
		setBusy("save");
		try {
			await makeCovers(["16:9", "9:16"]);
		} finally {
			setBusy("");
		}
	};
	const saved = (Object.entries(project.covers ?? {}) as [PostFormat, string][]).filter(([, path]) => path);

	return (
		<Section title="Cover" hint="A thumbnail with the episode number and the series title. Batch can make them for a whole series.">
			<div className="@container space-y-3">
				{/* Preview */}
				<Card className="space-y-2.5 px-3 py-3 [&>*+*]:border-t-0">
					<Segmented label="Cover size" equalWidth size="sm" value={format} options={SIZES} onChange={setFormat} />
					<div className={cn("relative mx-auto overflow-hidden rounded-md border bg-black", format === "9:16" ? "w-[56%] max-w-56" : "w-full")}>
						<canvas ref={preview} className={cn("block w-full", format === "9:16" ? "aspect-[9/16]" : "aspect-video")} aria-label="Cover preview" />
						{!frame && (
							<span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
								<Loader2 className="size-5 animate-spin" />
							</span>
						)}
						<span className="pointer-events-none absolute top-1.5 right-1.5 flex items-center gap-1 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
							{format === "9:16" ? <RectangleVertical className="size-3" /> : <RectangleHorizontal className="size-3" />}
							{size.width}×{size.height}
						</span>
					</div>
					<div className="grid grid-cols-1 gap-1.5 @[24rem]:grid-cols-2">
						<Button variant="outline" size="sm" disabled={busy !== ""} onClick={() => void pick()} title="Kroma picks a sharp, bright moment without subtitles">
							{busy === "pick" ? <Loader2 className="animate-spin" /> : <Sparkles />} Auto-pick a frame
						</Button>
						<Button variant="outline" size="sm" onClick={() => setCover({ time })} title="Use the frame under the playhead">
							<Crosshair /> Use the playhead
						</Button>
					</div>
				</Card>

				{/* Design: each one drawn on this episode's frame */}
				<div className="space-y-1.5">
					<p className="px-0.5 text-[11px] text-muted-foreground">Design</p>
					<div role="radiogroup" aria-label="Design" className="grid grid-cols-2 gap-1.5 @[26rem]:grid-cols-4">
						{COVER_TEMPLATES.map((t) => (
							<DesignTile key={t.value} template={t.value} label={t.label} description={t.description} on={settings.template === t.value} frame={frame} settings={settings} words={words} blurs={blurs} />
						))}
					</div>
				</div>

				{/* Words */}
				<Card>
					<Row
						stack
						label="Episode"
						description={settings.episode === undefined ? (episode === null ? "No number in the name: type one." : "Read from the project's name.") : undefined}
						control={
							<div className="flex flex-wrap gap-1.5">
								<Input
									type="number"
									min={0}
									aria-label="Episode number"
									className="w-20 shrink-0"
									placeholder="–"
									value={episode ?? ""}
									onChange={(e) => setCover({ episode: e.target.value === "" ? undefined : Math.max(0, Number.parseInt(e.target.value, 10) || 0) })}
								/>
								<AppSelect<CoverLabel> label="Label" className="min-w-32 flex-1" value={settings.label} options={COVER_LABELS} onChange={(label) => setCover({ label })} />
								{settings.label === "custom" && <Input aria-label="Word before the number" className="min-w-32 flex-1 basis-full" placeholder="វគ្គ, Episode…" value={settings.customWord ?? ""} onChange={(e) => setCover({ customWord: e.target.value }, false)} />}
							</div>
						}
					/>
					<Row stack label="Title" description={settings.title ? undefined : "The series folder's name, unless you type one."} control={<Input aria-label="Cover title" lang="km" placeholder={words.title || "The series name"} value={settings.title ?? ""} onChange={(e) => setCover({ title: e.target.value }, false)} />} />
					<Row
						stack
						label="Colour"
						control={
							<div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Cover colour">
								{COLORS.map((c) => (
									<button
										key={c}
										type="button"
										role="radio"
										aria-checked={settings.color === c}
										aria-label={c}
										onClick={() => setCover({ color: c })}
										className={cn("size-7 rounded-full border border-foreground/20 ring-offset-2 ring-offset-background transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring", settings.color === c ? "ring-2 ring-foreground" : "hover:scale-110")}
										style={{ background: c }}
									/>
								))}
								<label className="relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed text-[10px] text-muted-foreground hover:text-foreground" title="Another colour">
									+
									<input type="color" aria-label="Another colour" value={settings.color} onChange={(e) => setCover({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
								</label>
							</div>
						}
					/>
				</Card>

				<div className="space-y-1.5">
					<Button className="w-full" disabled={busy !== "" || !frame} onClick={() => void save()}>
						{busy === "save" ? <Loader2 className="animate-spin" /> : <ImageDown />} Save covers
					</Button>
					<p className="px-0.5 text-[11px] leading-relaxed text-muted-foreground">Both sizes, saved as JPEG next to this episode's exported videos.</p>
					{saved.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{saved.map(([f, path]) => (
								<Button key={f} variant="ghost" size="xs" onClick={() => void window.kroma.showInFolder(path)}>
									<FolderOpen /> {f} cover
								</Button>
							))}
						</div>
					)}
				</div>
			</div>
		</Section>
	);
}

const TILE = { width: 320, height: 180 };

function DesignTile({ template, label, description, on, frame, settings, words, blurs }: { template: CoverTemplate; label: string; description: string; on: boolean; frame: Frame; settings: CoverSettings; words: { label: string; title: string }; blurs: ReturnType<typeof coverBlurs> }) {
	const ref = useCoverCanvas(frame, TILE.width, TILE.height, { ...settings, template }, words.label, words.title, blurs);
	return (
		<button
			type="button"
			role="radio"
			aria-checked={on}
			title={description}
			onClick={() => setCover({ template })}
			className={cn(
				"group flex min-w-0 flex-col overflow-hidden rounded-md border text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
				on ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30",
			)}
		>
			<canvas ref={ref} aria-hidden className="block aspect-video w-full bg-muted" />
			<span className={cn("truncate px-2 py-1 text-[11px]", on ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{label}</span>
		</button>
	);
}
