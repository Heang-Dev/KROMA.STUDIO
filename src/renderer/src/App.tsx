import { useEffect, useState, type ReactNode } from "react";
import { ArrowArcLeft, ArrowArcRight, Export, FilePlus, FilmStrip, FloppyDisk, FolderOpen, Gear, Lightning, MegaphoneSimple, PaintBrush, SpeakerHigh, Warning } from "@phosphor-icons/react";
import { AIPanel } from "./components/AIPanel";
import { MediaPanel } from "./components/MediaPanel";
import { PostPanel } from "./components/PostPanel";
import { Preview } from "./components/Preview";
import { SettingsDialog } from "./components/SettingsDialog";
import { StylePanel } from "./components/StylePanel";
import { SubtitleList } from "./components/SubtitleList";
import { VoicePanel } from "./components/VoicePanel";
import { Timeline, deleteSelection, splitAtPlayhead } from "./components/Timeline";
import { Button, IconButton, ProgressBar, latestTask } from "./components/ui";
import * as actions from "./lib/actions";
import { exportVideo, openProject, restoreAutosave, saveProject, startAutosave, startNewProject } from "./lib/actions";
import { ensureFonts, renderBandPng, subtitleBand } from "./lib/subtitleRender";
import { type Panel, subscribeProgress, useEditor } from "./state/store";

const PANELS: { id: Panel; label: string; icon: ReactNode }[] = [
	{ id: "media", label: "Media", icon: <FilmStrip size={20} /> },
	{ id: "ai", label: "Khmer", icon: <Lightning size={20} /> },
	{ id: "voice", label: "Voice", icon: <SpeakerHigh size={20} /> },
	{ id: "style", label: "Style", icon: <PaintBrush size={20} /> },
	{ id: "post", label: "Post", icon: <MegaphoneSimple size={20} /> },
];

export function App() {
	const panel = useEditor((s) => s.panel);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [missingTools, setMissingTools] = useState<string[]>([]);

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
			if (smoke) Object.assign(window, { __kroma: { useEditor, actions, render: { ensureFonts, renderBandPng, subtitleBand } } });
			setMissingTools(Object.entries(tools).filter(([, ok]) => !ok).map(([name]) => (name === "ytdlp" ? "yt-dlp" : name)));
		});
		// First run: no keys yet, so open Settings.
		void window.kroma.getSettings().then((s) => {
			if (!s.hasAnthropicKey && !s.hasAsrKey) setSettingsOpen(true);
		});
	}, []);
	useShortcuts();

	return (
		<div className="flex h-full flex-col">
			<TopBar onSettings={() => setSettingsOpen(true)} />
			{missingTools.length > 0 && (
				<div className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
					<Warning size={14} weight="fill" /> Missing {missingTools.join(", ")}. Install with: <code className="rounded bg-black/30 px-1.5 py-0.5">brew install {missingTools.includes("yt-dlp") ? "yt-dlp " : ""}{missingTools.some((t) => t.startsWith("ff")) ? "ffmpeg" : ""}</code>
				</div>
			)}
			<div className="flex min-h-0 flex-1">
				<nav className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-3" aria-label="Tools">
					{PANELS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => useEditor.getState().setPanel(p.id)}
							className={`flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition-colors ${panel === p.id ? "bg-accent/12 text-accent" : "text-muted hover:bg-panel-2 hover:text-fg"}`}
							aria-current={panel === p.id}
						>
							{p.icon}
							{p.label}
						</button>
					))}
				</nav>
				<aside className="w-[340px] shrink-0 overflow-y-auto border-r border-line bg-panel">
					{panel === "media" && <MediaPanel />}
					{panel === "ai" && <AIPanel onOpenSettings={() => setSettingsOpen(true)} />}
					{panel === "voice" && <VoicePanel />}
					{panel === "style" && <StylePanel />}
					{panel === "post" && <PostPanel />}
				</aside>
				<main className="flex min-w-0 flex-1 flex-col">
					<Preview />
				</main>
				<SubtitleList />
			</div>
			<Timeline />
			<Toast />
			{settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
		</div>
	);
}

function TopBar({ onSettings }: { onSettings: () => void }) {
	const name = useEditor((s) => s.project.name);
	const dirty = useEditor((s) => s.dirty);
	const canUndo = useEditor((s) => s.past.length > 0);
	const canRedo = useEditor((s) => s.future.length > 0);
	const hasClips = useEditor((s) => s.project.clips.length > 0);
	const aspect = useEditor((s) => s.project.aspect);
	const exportTask = useEditor((s) => latestTask(s.tasks, "export"));
	const exporting = exportTask?.status === "running";
	const [menu, setMenu] = useState(false);

	return (
		<header className="drag flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel pr-3 pl-[84px]">
			<span className="font-khmer text-[15px] font-bold tracking-wide text-accent">KROMA</span>
			<input
				className="no-drag h-7 w-64 rounded border border-transparent bg-transparent px-2 text-[13px] text-fg hover:border-line focus:border-accent focus:outline-none"
				value={name}
				aria-label="Project name"
				onFocus={() => useEditor.getState().checkpoint()}
				onChange={(e) => useEditor.getState().update((p) => ({ ...p, name: e.target.value }), false)}
			/>
			{dirty && <span className="size-1.5 rounded-full bg-muted" title="Unsaved changes" />}
			<div className="no-drag flex items-center">
				<IconButton label="Undo (⌘Z)" onClick={() => useEditor.getState().undo()} disabled={!canUndo}>
					<ArrowArcLeft size={16} />
				</IconButton>
				<IconButton label="Redo (⇧⌘Z)" onClick={() => useEditor.getState().redo()} disabled={!canRedo}>
					<ArrowArcRight size={16} />
				</IconButton>
			</div>
			<div className="no-drag ml-auto flex items-center gap-1.5">
				{exporting && (
					<div className="mr-2 w-48">
						<p className="mb-1 truncate text-[11px] text-muted">{exportTask.message}</p>
						<ProgressBar value={exportTask.progress} />
					</div>
				)}
				<IconButton label="New project (⌘N)" onClick={startNewProject}>
					<FilePlus size={17} />
				</IconButton>
				<IconButton label="Open project (⌘O)" onClick={() => void openProject()}>
					<FolderOpen size={17} />
				</IconButton>
				<IconButton label="Save project (⌘S)" onClick={() => void saveProject()}>
					<FloppyDisk size={17} />
				</IconButton>
				<IconButton label="Settings" onClick={onSettings}>
					<Gear size={17} />
				</IconButton>
				<div className="relative">
					{exporting ? (
						<Button variant="secondary" onClick={() => exportTask && void window.kroma.cancel(exportTask.id)}>Cancel export</Button>
					) : (
						<Button variant="primary" disabled={!hasClips} onClick={() => setMenu(!menu)}>
							<Export size={16} weight="bold" /> Export {aspect}
						</Button>
					)}
					{menu && !exporting && (
						<div className="absolute top-10 right-0 z-40 w-64 rounded-lg border border-line bg-panel-2 p-1.5 shadow-xl" onMouseLeave={() => setMenu(false)}>
							<MenuItem title="Fast" hint="Uses the Mac's video chip. Best for most posts." onClick={() => { setMenu(false); void exportVideo("fast"); }} />
							<MenuItem title="High quality" hint="Smaller file, sharper. Takes longer." onClick={() => { setMenu(false); void exportVideo("high"); }} />
						</div>
					)}
				</div>
			</div>
		</header>
	);
}

function MenuItem({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className="block w-full rounded-md px-3 py-2 text-left hover:bg-panel">
			<span className="block text-[13px] font-medium">{title}</span>
			<span className="block text-xs text-muted">{hint}</span>
		</button>
	);
}

function Toast() {
	const toast = useEditor((s) => s.toast);
	if (!toast) return null;
	return (
		<div role="status" className={`fixed bottom-[226px] left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-lg border px-4 py-2.5 text-[13px] shadow-xl ${toast.tone === "error" ? "border-danger/40 bg-[#2a1517] text-[#ffb4b4]" : "border-line bg-panel-2 text-fg"}`}>
			{toast.text}
		</div>
	);
}

function useShortcuts(): void {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const s = useEditor.getState();
			const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key.toLowerCase() === "s") {
				e.preventDefault();
				void saveProject(e.shiftKey);
			} else if (mod && e.key.toLowerCase() === "n") {
				e.preventDefault();
				startNewProject();
			} else if (mod && e.key.toLowerCase() === "o") {
				e.preventDefault();
				void openProject();
			} else if (typing) {
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
