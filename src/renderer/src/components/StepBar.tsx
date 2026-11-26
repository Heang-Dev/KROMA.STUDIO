import type { ReactNode } from "react";
import { ArrowRight, Check, Minimize2, Sparkles, Zap } from "lucide-react";
import { languageOf } from "@shared/languages";
import { ASPECT_SIZE, DEFAULT_STYLE, type ExportQuality, type Project, estimateSize } from "@shared/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportVideo, linesNeedingVoice, voiceSettings } from "@/lib/actions";
import { totalDuration } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { type Panel, useEditor } from "@/state/store";
import { latestTask } from "./common";

// The whole job, start to end: Video → Subtitles → Khmer → Voices → Style → Export. Each step shows whether it's done
// and opens its panel; "Next" always points at the first step still to do.

type Status = "done" | "todo" | "optional";

interface Step {
	id: string;
	label: string;
	panel: Panel;
	status: Status;
	/** What "Next" says when this is the first step to do. */
	next: string;
}

export function stepsOf(project: Project, exported: boolean): Step[] {
	const withSource = project.cues.filter((c) => c.source.trim() || c.text.trim());
	const translated = withSource.length > 0 && withSource.every((c) => c.text.trim());
	const voice = voiceSettings(project);
	const voiced = voice.enabled && translated && linesNeedingVoice(project).length === 0;
	const styled = JSON.stringify(project.style) !== JSON.stringify(DEFAULT_STYLE);
	return [
		{ id: "video", label: "Video", panel: "media", status: project.clips.length ? "done" : "todo", next: "Add a video" },
		{ id: "subtitles", label: "Subtitles", panel: "ai", status: project.cues.length ? "done" : "todo", next: "Get the subtitles" },
		{ id: "khmer", label: languageOf(project.language).name, panel: "ai", status: translated ? "done" : "todo", next: `Translate to ${languageOf(project.language).name}` },
		{ id: "characters", label: "Characters", panel: "voice", status: voice.cast?.length ? "done" : "optional", next: "Choose the characters' voices" },
		// A voice-over is a choice: subtitles alone are a finished video too.
		{ id: "voices", label: "Voices", panel: "voice", status: voiced ? "done" : voice.enabled ? "todo" : "optional", next: "Finish the voice-over" },
		{ id: "style", label: "Style", panel: "style", status: styled ? "done" : "optional", next: "Style the subtitles" },
		{ id: "export", label: "Export", panel: "post", status: exported ? "done" : "todo", next: "Export the video" },
	];
}

export function StepBar() {
	const project = useEditor((s) => s.project);
	const panel = useEditor((s) => s.panel);
	const exported = useEditor((s) => latestTask(s.tasks, "export")?.status === "done");
	const steps = stepsOf(project, exported);
	const next = steps.find((s) => s.status === "todo");
	// Several steps share a panel (Subtitles + Khmer, Characters + Voices): the open panel's first unfinished one is current.
	const inPanel = steps.filter((s) => s.panel === panel);
	const currentId = (inPanel.find((s) => s.status !== "done") ?? inPanel[inPanel.length - 1])?.id;
	const open = (p: Panel) => useEditor.getState().setPanel(p);

	return (
		<nav aria-label="Steps" className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b bg-background px-3 text-xs">
			{steps.map((step, i) => {
				const current = step.id === currentId;
				const content = (
					<>
						<span
							className={cn(
								"flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums",
								step.status === "done" ? "border-success bg-success text-white" : current ? "border-foreground text-foreground" : "border-border text-muted-foreground",
							)}
						>
							{step.status === "done" ? <Check className="size-3" strokeWidth={3} /> : i + 1}
						</span>
						<span className={cn(current ? "font-medium text-foreground" : "text-muted-foreground")}>{step.label}</span>
						{step.status === "optional" && <span className="text-[10px] text-muted-foreground/70">optional</span>}
					</>
				);
				return (
					<div key={step.id} className="flex shrink-0 items-center gap-1">
						{i > 0 && <span className="mx-0.5 h-px w-3 bg-border" aria-hidden />}
						{step.id === "export" ? (
							<ExportMenu>
								<button type="button" className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent" disabled={!project.clips.length}>
									{content}
								</button>
							</ExportMenu>
						) : (
							<button type="button" aria-current={current ? "step" : undefined} className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent", current && "bg-accent/60")} onClick={() => open(step.panel)}>
								{content}
							</button>
						)}
					</div>
				);
			})}
			<span className="flex-1" />
			{next ? (
				next.id === "export" ? (
					<ExportMenu>
						<Button size="xs" className="shrink-0">
							Next: {next.next} <ArrowRight />
						</Button>
					</ExportMenu>
				) : (
					<Button size="xs" variant="outline" className="shrink-0" onClick={() => open(next.panel)}>
						Next: {next.next} <ArrowRight />
					</Button>
				)
			) : (
				<span className="flex shrink-0 items-center gap-1 text-success">
					<Check className="size-3.5" /> All done
				</span>
			)}
		</nav>
	);
}

const EXPORT_SIZES: { quality: ExportQuality; label: string; hint: string; icon: ReactNode }[] = [
	{ quality: "small", label: "Small", hint: "For TikTok and Facebook: they shrink videos anyway.", icon: <Minimize2 className="mt-0.5" /> },
	{ quality: "standard", label: "Standard", hint: "Fastest: uses the Mac's video chip. Good for YouTube.", icon: <Zap className="mt-0.5" /> },
	{ quality: "high", label: "High", hint: "Best quality, about 3× slower to export.", icon: <Sparkles className="mt-0.5" /> },
];

/** The export sizes with their estimated file size, opened from the Export button or the Export step. */
export function ExportMenu({ children }: { children: ReactNode }) {
	const aspect = useEditor((s) => s.project.aspect);
	const duration = useEditor((s) => totalDuration(s.project.clips));
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				{EXPORT_SIZES.map((o) => (
					<DropdownMenuItem key={o.quality} onClick={() => void exportVideo(o.quality)} className="items-start">
						{o.icon}
						<span className="min-w-0 flex-1">
							<span className="flex justify-between gap-2">
								<span>{o.label}</span>
								<span className="text-xs text-muted-foreground tabular-nums">{estimateSize(o.quality, ASPECT_SIZE[aspect].height, duration)}</span>
							</span>
							<span className="block text-xs text-muted-foreground">{o.hint}</span>
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

