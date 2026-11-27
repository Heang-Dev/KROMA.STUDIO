import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BookOpenText, ChevronDown, Download, Film, Library, Minimize2, Shapes, FilePlus, FolderOpen, Megaphone, Paintbrush, Redo2, Save, Settings, Sparkles, TriangleAlert, Undo2, Upload, Volume2, Zap } from "lucide-react";
import { AIPanel } from "./components/AIPanel";
import { AppToaster } from "./components/AppToaster";
import { MediaPanel } from "./components/MediaPanel";
import { ObjectsPanel } from "./components/ObjectsPanel";
import { PostPanel } from "./components/PostPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { Preview } from "./components/Preview";
import { StylePanel } from "./components/StylePanel";
import { SubtitleList } from "./components/SubtitleList";
import { Timeline, deleteSelection, splitAtPlayhead } from "./components/Timeline";
import { VoicePanel } from "./components/VoicePanel";
import { VoicesPage } from "./components/VoicesPage";
import { StoryPage } from "./components/StoryPage";
import { DownloadsPage } from "./components/DownloadsPage";
import { NotificationBell } from "./components/NotificationBell";
import kromaIcon from "./assets/kroma-icon.png";
import { UpdateNotice } from "./components/UpdateButton";
import { ExportMenu, StepBar } from "./components/StepBar";
import { IconButton, ProgressBar, latestTask } from "./components/common";
import { SettingsPage } from "./components/settings/SettingsPage";
import { Button } from "./components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Separator } from "./components/ui/separator";
import { TooltipProvider } from "./components/ui/tooltip";
import * as actions from "./lib/actions";
import { exportVideo, openProject, restoreAutosave, saveProject, startAutosave, startNewProject } from "./lib/actions";
import { planVoice } from "@shared/voice";
import { applyAppearance } from "./lib/appearance";
import { notify, startNotifications } from "./lib/notify";
import { useNotifications } from "./state/notifications";
import { objectsForExport } from "./lib/objects";
import { ensureFonts, renderBandPng, subtitleBand } from "./lib/subtitleRender";
import { cn } from "./lib/utils";
import { totalDuration } from "./lib/timeline";
import { ASPECT_SIZE, type ExportQuality, estimateSize } from "@shared/types";
import { useLayout } from "./state/layout";
import { type Panel, subscribeProgress, useEditor } from "./state/store";

const PANELS: { id: Panel; label: string; icon: ReactNode }[] = [
	{ id: "media", label: "Media", icon: <Film /> },
	{ id: "ai", label: "Translate", icon: <Zap /> },
	{ id: "voice", label: "Voice", icon: <Volume2 /> },
	{ id: "style", label: "Style", icon: <Paintbrush /> },
	{ id: "objects", label: "Objects", icon: <Shapes /> },
	{ id: "post", label: "Post", icon: <Megaphone /> },
];

export function App() {
	const panel = useEditor((s) => s.panel);
	const view = useEditor((s) => s.view.name);
	const leftWidth = useLayout((s) => s.sizes.left);
	const [missingTools, setMissingTools] = useState<string[]>([]);
	const [installHints, setInstallHints] = useState<Record<string, string>>({});

	useEffect(() => subscribeProgress(), []);
	useEffect(() => startNotifications(), []);
	useEffect(() => {
		let stop: (() => void) | undefined;
		// An extra window (New Window) asks before closing when its project isn't saved to a file.
		const guard = (event: BeforeUnloadEvent) => {
			const s = useEditor.getState();
			if (s.project.clips.length && (s.dirty || !s.projectPath)) {
				event.preventDefault();
				event.returnValue = "";
			}
		};
		void window.kroma.info().then(({ e2e, slot }) => {
			if (slot > 1) window.addEventListener("beforeunload", guard);
			if (e2e) return; // end-to-end test runs leave your autosaved project alone
			void restoreAutosave().finally(() => {
				stop = startAutosave();
			});
		});
		return () => {
			stop?.();
			window.removeEventListener("beforeunload", guard);
		};
	}, []);
	useEffect(() => {
		void window.kroma.info().then(({ tools, smoke, installHints: hints }) => {
			setInstallHints(hints);
			// The automated smoke test (scripts/smoke.mjs) drives the editor through this handle.
			if (smoke) Object.assign(window, { __kroma: { useEditor, actions, notify, useNotifications, applyAppearance, toast, planVoice, objectsForExport, render: { ensureFonts, renderBandPng, subtitleBand } } });
			setMissingTools(Object.entries(tools).filter(([name, ok]) => !ok && name !== "uv").map(([name]) => (name === "ytdlp" ? "yt-dlp" : name)));
		});
		void window.kroma.getSettings().then((s) => {
			applyAppearance(s.theme);
			setZoomVar(s.uiZoom);
			// First run: no keys yet, so open the settings for them.
			if (!s.hasAnthropicKey && !s.hasGeminiKey && !s.hasAsrKey && s.translateProvider !== "google") useEditor.getState().openSettings("translation");
		});
		// Browser-style notice when the interface size changes.
		const stopZoom = window.kroma.onZoomChanged((zoom) => {
			setZoomVar(zoom);
			toast.info(`Interface size ${Math.round(zoom * 100)}%`, { id: "zoom", duration: 1200 });
		});
		const stopFullscreen = window.kroma.onFullscreenChanged((on) => document.documentElement.toggleAttribute("data-fullscreen", on));
		return () => {
			stopZoom();
			stopFullscreen();
		};
	}, []);
	useShortcuts();

	return (
		<TooltipProvider delayDuration={300}>
			<div className="flex h-full flex-col bg-background">
				<TopBar />
				{missingTools.length > 0 && (
					<div role="alert" className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
						<TriangleAlert className="size-4" /> Missing {missingTools.join(", ")}. Install with:
						{[missingTools.some((t) => t.startsWith("ff")) && installHints.ffmpeg, missingTools.includes("yt-dlp") && installHints.ytdlp].filter(Boolean).map((hint) => (
							<code key={String(hint)} className="rounded-sm bg-background/60 px-1.5 py-0.5">
								{hint}
							</code>
						))}
					</div>
				)}
				{view === "settings" ? (
					<SettingsPage />
				) : (
					<>
						<div className="flex min-h-0 flex-1">
							<Rail panel={view === "editor" ? panel : null} page={view === "voices" || view === "story" || view === "downloads" ? view : null} />
							{view === "voices" ? (
								<VoicesPage />
							) : view === "story" ? (
								<StoryPage />
							) : view === "downloads" ? (
								<DownloadsPage />
							) : (
								<>
									<div className="relative shrink-0 border-r bg-sidebar" style={{ width: leftWidth }}>
										<aside className="@container h-full divide-y overflow-y-auto">
											{panel === "media" && <MediaPanel />}
											{panel === "ai" && <AIPanel />}
											{panel === "voice" && <VoicePanel />}
											{panel === "style" && <StylePanel />}
											{panel === "objects" && <ObjectsPanel />}
											{panel === "post" && <PostPanel />}
										</aside>
										<ResizeHandle panel="left" edge="right" label="Resize the tools panel" />
									</div>
									<main className="flex min-w-0 flex-1 flex-col bg-background">
										<Preview />
									</main>
									<SubtitleList />
								</>
							)}
						</div>
						{view === "editor" && <Timeline />}
					</>
				)}
				{/* The status bar is on every page: the steps, the voice engine and updates are always in reach. */}
				<StepBar />
				<AppToaster />
				<UpdateNotice />
			</div>
		</TooltipProvider>
	);
}

/** The left menu: the editor's tools, then the studios (Voices, Story, Downloads), then Settings. */
function Rail({ panel, page }: { panel: Panel | null; page: "voices" | "story" | "downloads" | null }) {
	const item = (key: string, label: string, icon: ReactNode, active: boolean, onClick: () => void) => (
		<button
			key={key}
			type="button"
			onClick={onClick}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex w-16 flex-col items-center gap-1 rounded-md py-2 text-[10px] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4",
				active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/60 hover:bg-foreground/5 hover:text-sidebar-foreground",
			)}
		>
			{icon}
			<span className="max-w-full truncate px-0.5">{label}</span>
		</button>
	);
	const openPanel = (id: Panel) => {
		const s = useEditor.getState();
		if (s.view.name !== "editor") s.closeVoices();
		s.setPanel(id);
	};
	return (
		<nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-2" aria-label="Menu">
			{PANELS.map((p) => item(p.id, p.label, p.icon, panel === p.id, () => openPanel(p.id)))}
			<div className="my-1 h-px w-10 bg-border" />
			{item("voices", "Voices", <Library />, page === "voices", () => useEditor.getState().openVoices())}
			{item("story", "Story", <BookOpenText />, page === "story", () => useEditor.getState().openStory())}
			{item("downloads", "Downloads", <Download />, page === "downloads", () => useEditor.getState().openDownloads())}
			{/* Same style as the other menu items (icon over label), pinned to the bottom. */}
			<div className="mt-auto">{item("settings", "Settings", <Settings />, false, () => useEditor.getState().openSettings())}</div>
		</nav>
	);
}

/** The title bar sizes itself against the zoom so the traffic lights always fit (styles.css .title-bar). */
const setZoomVar = (zoom: number) => document.documentElement.style.setProperty("--ui-zoom", String(zoom));

function TopBar() {
	const name = useEditor((s) => s.project.name);
	const dirty = useEditor((s) => s.dirty);
	const canUndo = useEditor((s) => s.past.length > 0);
	const canRedo = useEditor((s) => s.future.length > 0);
	const hasClips = useEditor((s) => s.project.clips.length > 0);
	const aspect = useEditor((s) => s.project.aspect);
	const inSettings = useEditor((s) => s.view.name === "settings");
	const exportTask = useEditor((s) => latestTask(s.tasks, "export"));
	const exporting = exportTask?.status === "running";

	return (
		<header className="title-bar drag flex shrink-0 items-center gap-2 border-b bg-sidebar pr-2 text-[13px]">
			<span className="flex items-center gap-1.5 font-semibold">
				<img src={kromaIcon} alt="" width={18} height={18} className="rounded-[4px]" draggable={false} />
				Kroma
			</span>
			<Separator orientation="vertical" className="mx-1 h-4!" />
			<input
				title={name}
				className="no-drag h-7 w-64 truncate rounded-md border border-transparent bg-transparent px-2 text-[13px] outline-none hover:border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
				value={name}
				aria-label="Project name"
				onFocus={() => useEditor.getState().checkpoint()}
				onChange={(e) => useEditor.getState().update((p) => ({ ...p, name: e.target.value }), false)}
			/>
			{dirty && <span className="size-1.5 rounded-full bg-muted-foreground" title="Unsaved changes" />}
			{!inSettings && (
				<div className="no-drag flex items-center">
					<IconButton label="Undo" shortcut="⌘Z" onClick={() => useEditor.getState().undo()} disabled={!canUndo}>
						<Undo2 />
					</IconButton>
					<IconButton label="Redo" shortcut="⇧⌘Z" onClick={() => useEditor.getState().redo()} disabled={!canRedo}>
						<Redo2 />
					</IconButton>
				</div>
			)}
			<div className="no-drag ml-auto flex items-center gap-0.5">
				{exporting && (
					<div className="mr-3 w-48">
						<p className="mb-1 truncate text-[11px] text-muted-foreground">{exportTask.message}</p>
						<ProgressBar value={exportTask.progress} />
					</div>
				)}
				<NotificationBell />
				<Separator orientation="vertical" className="mx-1.5 h-4!" />
				<IconButton label="New project" shortcut="⌘N" onClick={startNewProject}>
					<FilePlus />
				</IconButton>
				<IconButton label="Open project" shortcut="⌘O" onClick={() => void openProject()}>
					<FolderOpen />
				</IconButton>
				<IconButton label="Save project" shortcut="⌘S" onClick={() => void saveProject()}>
					<Save />
				</IconButton>
				<Separator orientation="vertical" className="mx-1.5 h-4!" />
				{exporting ? (
					<Button variant="outline" size="sm" onClick={() => exportTask && void window.kroma.cancel(exportTask.id)}>
						Cancel export
					</Button>
				) : (
					<ExportMenu>
						<Button size="sm" disabled={!hasClips}>
							<Upload /> Export {aspect} <ChevronDown className="opacity-60" />
						</Button>
					</ExportMenu>
				)}
			</div>
		</header>
	);
}

function useShortcuts(): void {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const s = useEditor.getState();
			const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable);
			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key === ",") {
				e.preventDefault();
				s.openSettings();
			} else if (mod && e.key.toLowerCase() === "s") {
				e.preventDefault();
				void saveProject(e.shiftKey);
			} else if (mod && !e.shiftKey && e.key.toLowerCase() === "n") {
				e.preventDefault();
				startNewProject();
			} else if (mod && e.key.toLowerCase() === "o") {
				e.preventDefault();
				void openProject();
			} else if (typing || s.view.name !== "editor" || document.querySelector('[role="dialog"], [role="menu"]')) {
				return;
			} else if (mod && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) s.redo();
				else s.undo();
			} else if (e.key === " ") {
				e.preventDefault();
				if (s.project.clips.length) s.setPlaying(!s.playing);
			} else if (e.key.toLowerCase() === "s") splitAtPlayhead();
			else if (e.key === "Delete" || e.key === "Backspace") deleteSelection();
			else if (e.key === "ArrowLeft") s.seek(s.time - (e.shiftKey ? 5 : 1 / 30));
			else if (e.key === "ArrowRight") s.seek(s.time + (e.shiftKey ? 5 : 1 / 30));
			else if (e.key === "Escape") s.select(null);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
}
