import type { ReactNode } from "react";
import { ArrowRight, Check, Minimize2, Sparkles, Zap } from "lucide-react";
import { languageOf } from "@shared/languages";
import { ASPECT_SIZE, DEFAULT_STYLE, type ExportQuality, type Project, estimateSize } from "@shared/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportVideo, linesNeedingVoice, videoFingerprint, voiceSettings } from "@/lib/actions";
import { totalDuration } from "@/lib/timeline";
import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { type Panel, useEditor } from "@/state/store";
import { latestTask } from "./common";
import { UpdateStatus } from "./UpdateButton";
import { EngineStatusItem } from "./EngineStatus";
import { useBatch } from "@/lib/batch";
import { STEP_LABEL } from "@shared/batch";
import { t, uiLanguage } from "@shared/i18n";
import { ListChecks, Loader2 } from "lucide-react";

// The whole job, start to end: Video → Subtitles → Khmer → Voices → Style → Export, in a slim status bar along the
// bottom of the window (like Orca's). Each step shows whether it's done and opens its panel; "Next" always points at the
// first step still to do.

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
	// The language's English name in English, its own name (ខ្មែរ, ไทย…) in any other interface language.
	const language = uiLanguage() === "en" ? languageOf(project.language).name : languageOf(project.language).native;
	return [
		{ id: "video", label: t("Video"), panel: "media", status: project.clips.length ? "done" : "todo", next: t("Add a video") },
		{ id: "subtitles", label: t("Subtitles"), panel: "ai", status: project.cues.length ? "done" : "todo", next: t("Get the subtitles") },
		{ id: "khmer", label: language, panel: "ai", status: translated ? "done" : "todo", next: t("Translate to {language}", { language }) },
		{ id: "characters", label: t("Characters"), panel: "voice", status: voice.cast?.length ? "done" : "optional", next: t("Choose the characters' voices") },
		// A voice-over is a choice: subtitles alone are a finished video too.
		{ id: "voices", label: t("Voices"), panel: "voice", status: voiced ? "done" : voice.enabled ? "todo" : "optional", next: t("Finish the voice-over") },
		{ id: "style", label: t("Style"), panel: "style", status: styled ? "done" : "optional", next: t("Style the subtitles") },
		{ id: "export", label: t("Export"), panel: "post", status: exported ? "done" : "todo", next: t("Export the video") },
	];
}

export function StepBar() {
	const project = useEditor((s) => s.project);
	const panel = useEditor((s) => s.panel);
	const locked = useEditor((s) => Boolean(s.locked));
	// Exported = the saved project's last export still matches the video (survives a restart), or an export just finished.
	const exported = useEditor((s) => latestTask(s.tasks, "export")?.status === "done" || (!!s.project.lastExport && s.project.lastExport.fingerprint === videoFingerprint(s.project)));
	const steps = stepsOf(project, exported);
	const next = steps.find((s) => s.status === "todo");
	// Several steps share a panel (Subtitles + Khmer, Characters + Voices): the open panel's first unfinished one is current.
	const inPanel = steps.filter((s) => s.panel === panel);
	const currentId = (inPanel.find((s) => s.status !== "done") ?? inPanel[inPanel.length - 1])?.id;
	// From Voices, Story or Settings a step takes you back to the editor, on that step's panel.
	const open = (p: Panel) => {
		const s = useEditor.getState();
		if (s.view.name !== "editor") s.closeVoices();
		s.setPanel(p);
	};

	return (
		<nav aria-label={t("Steps")} className="flex h-7 shrink-0 items-center gap-0.5 overflow-x-auto border-t bg-sidebar px-2 text-[11px] [scrollbar-width:none]">
			{/* While a batch borrows the editor its project isn't yours to work on: no steps for it. */}
			{locked && <span className="px-1.5 text-muted-foreground">{t("The steps are back when the batch is done.")}</span>}
			{!locked && steps.map((step, i) => {
				const current = step.id === currentId;
				const content = (
					<>
						<span
							className={cn(
								"flex size-3.5 shrink-0 items-center justify-center rounded-full border text-[8px] leading-none tabular-nums",
								step.status === "done" ? "border-success bg-success text-white" : current ? "border-foreground text-foreground" : "border-border text-muted-foreground",
							)}
						>
							{step.status === "done" ? <Check className="size-2.5" strokeWidth={3.5} /> : i + 1}
						</span>
						<span className={cn(current ? "font-medium text-foreground" : "text-muted-foreground")}>{step.label}</span>
						{step.status === "optional" && <span className="text-[10px] text-muted-foreground/60">{t("optional")}</span>}
					</>
				);
				return (
					<div key={step.id} className="flex shrink-0 items-center gap-1">
						{i > 0 && <span className="h-px w-2 bg-border" aria-hidden />}
						{step.id === "export" ? (
							<ExportMenu>
								<button type="button" className="flex h-5 items-center gap-1 rounded-sm px-1.5 hover:bg-accent" disabled={!project.clips.length}>
									{content}
								</button>
							</ExportMenu>
						) : (
							<button type="button" aria-current={current ? "step" : undefined} className={cn("flex h-5 items-center gap-1 rounded-sm px-1.5 hover:bg-accent", current && "bg-accent/60")} onClick={() => open(step.panel)}>
								{content}
							</button>
						)}
					</div>
				);
			})}
			<span className={cn("ml-2 flex shrink-0 items-center", locked && "hidden")}>
				{next ? (
					next.id === "export" ? (
						<ExportMenu>
							<Button size="xs" className="h-5 shrink-0 rounded-sm px-1.5 text-[11px]">
								{t("Next: {step}", { step: next.next })} <ArrowRight />
							</Button>
						</ExportMenu>
					) : (
						<Button size="xs" variant="outline" className="h-5 shrink-0 rounded-sm px-1.5 text-[11px]" onClick={() => open(next.panel)}>
							{t("Next: {step}", { step: next.next })} <ArrowRight />
						</Button>
					)
				) : (
					<span className="flex shrink-0 items-center gap-1 px-1 text-success">
						<Check className="size-3" /> {t("All done")}
					</span>
				)}
			</span>
			<span className="flex-1" />
			<span className="flex shrink-0 items-center gap-1">
				<BatchStatusItem />
				<EngineStatusItem />
				<span className="h-3 w-px bg-border" aria-hidden />
				<UpdateStatus />
			</span>
		</nav>
	);
}

const EXPORT_SIZES: { quality: ExportQuality; label: string; hint: string; icon: ReactNode }[] = [
	// Shown through t() (ExportMenu); their Khmer is in i18n/km/app.ts.
	{ quality: "small", label: "Small", hint: "For TikTok and Facebook: they shrink videos anyway.", icon: <Minimize2 className="mt-0.5" /> },
	{ quality: "standard", label: "Standard", hint: isMac ? "Fastest: uses the Mac's video chip. Good for YouTube." : "Quick to export. Good for YouTube.", icon: <Zap className="mt-0.5" /> },
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
								<span>{t(o.label)}</span>
								<span className="text-xs text-muted-foreground tabular-nums">{estimateSize(o.quality, ASPECT_SIZE[aspect].height, duration)}</span>
							</span>
							<span className="block text-xs text-muted-foreground">{t(o.hint)}</span>
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}


/** While a batch runs: "Batch · 3/5 · EP4 · Translating"; opens the Batch page. */
function BatchStatusItem() {
	const busy = useBatch((s) => s.busy);
	const runId = useBatch((s) => s.runId);
	const items = useBatch((s) => s.state.items);
	if (!busy) return null;
	const running = items.find((i) => i.status === "running");
	const inRun = items.filter((i) => i.runId === runId);
	const total = inRun.length + items.filter((i) => !i.runId && i.status === "waiting").length;
	const position = inRun.filter((i) => i.status !== "waiting").length;
	return (
		<>
			<button type="button" className="flex h-5 max-w-96 items-center gap-1.5 rounded-sm px-1.5 hover:bg-accent" onClick={() => useEditor.getState().openBatch(busy === "post" ? "ready" : "process")} title={t("Open Batch")}>
				{running ? <Loader2 className="size-3 animate-spin text-primary" /> : <ListChecks className="size-3" />}
				<span className="truncate">
					{busy === "post" ? t("Posting") : `${t("Batch")} · ${Math.max(1, position)}/${Math.max(total, 1)}`}
					{running ? ` · ${running.title} · ${running.current ? t(STEP_LABEL[running.current]) : ""}` : ""}
				</span>
			</button>
			<span className="h-3 w-px bg-border" aria-hidden />
		</>
	);
}
