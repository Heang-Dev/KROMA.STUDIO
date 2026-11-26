import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, Film, FilePlus, FolderOpen, Megaphone, Paintbrush, Redo2, Save, Settings, Sparkles, TriangleAlert, Undo2, Upload, Volume2, Zap } from "lucide-react";
import { AIPanel } from "./components/AIPanel";
import { MediaPanel } from "./components/MediaPanel";
import { PostPanel } from "./components/PostPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { Preview } from "./components/Preview";
import { StylePanel } from "./components/StylePanel";
import { SubtitleList } from "./components/SubtitleList";
import { Timeline, deleteSelection, splitAtPlayhead } from "./components/Timeline";
import { VoicePanel } from "./components/VoicePanel";
import { IconButton, ProgressBar, latestTask } from "./components/common";
import { SettingsPage } from "./components/settings/SettingsPage";
import { Button } from "./components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Separator } from "./components/ui/separator";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import * as actions from "./lib/actions";
import { exportVideo, openProject, restoreAutosave, saveProject, startAutosave, startNewProject } from "./lib/actions";
import { applyAppearance, isDark } from "./lib/appearance";
import { ensureFonts, renderBandPng, subtitleBand } from "./lib/subtitleRender";
import { cn } from "./lib/utils";
import { useLayout } from "./state/layout";
import { type Panel, subscribeProgress, useEditor } from "./state/store";

const PANELS: { id: Panel; label: string; icon: ReactNode }[] = [
	{ id: "media", label: "Media", icon: <Film /> },
	{ id: "ai", label: "Khmer", icon: <Zap /> },
	{ id: "voice", label: "Voice", icon: <Volume2 /> },
	{ id: "style", label: "Style", icon: <Paintbrush /> },
	{ id: "post", label: "Post", icon: <Megaphone /> },
];

export function App() {
	const panel = useEditor((s) => s.panel);
	const view = useEditor((s) => s.view.name);
	const leftWidth = useLayout((s) => s.sizes.left);
	const [missingTools, setMissingTools] = useState<string[]>([]);
	const [dark, setDark] = useState(true);

	useEffect(() => subscribeProgress(), []);
	useEffect(() => {
		let stop: (() => void) | undefined;
		void restoreAutosave().finally(() => {
			stop = startAutosave();
		});
		return () => stop?.();
	}, []);
	useEffect(() => {
		void window.kroma.info().then(({ tools, smoke }) => {
			// The automated smoke test (scripts/smoke.mjs) drives the editor through this handle.
			if (smoke) Object.assign(window, { __kroma: { useEditor, actions, applyAppearance, render: { ensureFonts, renderBandPng, subtitleBand } } });
			setMissingTools(Object.entries(tools).filter(([, ok]) => !ok).map(([name]) => (name === "ytdlp" ? "yt-dlp" : name)));
		});
		void window.kroma.getSettings().then((s) => {
			applyAppearance(s.theme);
			setZoomVar(s.uiZoom);
			// First run: no keys yet, so open the settings for them.
			if (!s.hasAnthropicKey && !s.hasAsrKey) useEditor.getState().openSettings("translation");
		});
		// Browser-style notice when the interface size changes.
		const stopZoom = window.kroma.onZoomChanged((zoom) => {
			setZoomVar(zoom);
			toast(`Interface size ${Math.round(zoom * 100)}%`, { id: "zoom", duration: 1200 });
		});
		const stopFullscreen = window.kroma.onFullscreenChanged((on) => document.documentElement.toggleAttribute("data-fullscreen", on));
		// Keep the toaster's theme in step with the <html> class.
		const observer = new MutationObserver(() => setDark(isDark()));
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
		return () => {
			observer.disconnect();
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
						<code className="rounded-sm bg-background/60 px-1.5 py-0.5">brew install {[missingTools.includes("yt-dlp") && "yt-dlp", missingTools.some((t) => t.startsWith("ff")) && "ffmpeg"].filter(Boolean).join(" ")}</code>
					</div>
				)}
				{view === "settings" ? (
					<SettingsPage />
				) : (
					<>
						<div className="flex min-h-0 flex-1">
							<nav className="flex w-[60px] shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-2" aria-label="Tools">
								{PANELS.map((p) => (
									<button
										key={p.id}
										type="button"
										onClick={() => useEditor.getState().setPanel(p.id)}
										aria-current={panel === p.id ? "page" : undefined}
										className={cn(
											"flex w-12 flex-col items-center gap-1 rounded-md py-2 text-[10px] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4",
											panel === p.id ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/60 hover:bg-foreground/5 hover:text-sidebar-foreground",
										)}
									>
										{p.icon}
										{p.label}
									</button>
								))}
								<div className="mt-auto">
									<IconButton label="Settings" shortcut="⌘," onClick={() => useEditor.getState().openSettings()}>
										<Settings />
									</IconButton>
								</div>
							</nav>
							<div className="relative shrink-0 border-r bg-sidebar" style={{ width: leftWidth }}>
								<aside className="@container h-full divide-y overflow-y-auto">
									{panel === "media" && <MediaPanel />}
									{panel === "ai" && <AIPanel />}
									{panel === "voice" && <VoicePanel />}
									{panel === "style" && <StylePanel />}
									{panel === "post" && <PostPanel />}
								</aside>
								<ResizeHandle panel="left" edge="right" label="Resize the tools panel" />
							</div>
							<main className="flex min-w-0 flex-1 flex-col bg-background">
								<Preview />
							</main>
							<SubtitleList />
						</div>
						<Timeline />
					</>
				)}
				<Toaster position="bottom-center" theme={dark ? "dark" : "light"} offset={view === "settings" ? 24 : 228} />
			</div>
		</TooltipProvider>
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
			<span className="font-semibold">Kroma</span>
			<Separator orientation="vertical" className="mx-1 h-4!" />
			<input
				className="no-drag h-7 w-64 rounded-md border border-transparent bg-transparent px-2 text-[13px] outline-none hover:border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="sm" disabled={!hasClips}>
								<Upload /> Export {aspect} <ChevronDown className="opacity-60" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							<DropdownMenuItem onClick={() => void exportVideo("fast")} className="items-start">
								<Zap className="mt-0.5" />
								<span>
									<span className="block">Fast</span>
									<span className="block text-xs text-muted-foreground">Uses the Mac's video chip. Best for most posts.</span>
								</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => void exportVideo("high")} className="items-start">
								<Sparkles className="mt-0.5" />
								<span>
									<span className="block">High quality</span>
									<span className="block text-xs text-muted-foreground">Smaller file, sharper. Takes longer.</span>
								</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
			} else if (mod && e.key.toLowerCase() === "n") {
				e.preventDefault();
				startNewProject();
			} else if (mod && e.key.toLowerCase() === "o") {
				e.preventDefault();
				void openProject();
			} else if (typing || s.view.name === "settings" || document.querySelector('[role="dialog"], [role="menu"]')) {
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
