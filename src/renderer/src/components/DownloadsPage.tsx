import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Ban, Check, ExternalLink, CircleAlert, CircleCheck, Clock, Download, FileInput, FileVideo, FolderInput, FolderOpen, Loader2, Pause, Play, RotateCcw, Search, Trash2, X } from "lucide-react";
import { DEFAULT_DOWNLOAD_OPTIONS, type DownloadCenterState, type DownloadItem, type DownloadQuality, type ImportPick, type ListedSource, type ListedVideo, PLATFORMS, queueSummary } from "@shared/downloads";
import { t } from "@shared/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { openProjectAt } from "@/lib/actions";
import { addToBatch } from "@/lib/batch";
import { formatTime } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { useEditor } from "@/state/store";
import { AppSelect, Card, IconButton, ProgressBar, Row, Section, Segmented } from "./common";
import { PageHeader, PageSection } from "./PageHeader";
import { transferText } from "./UpdateButton";
import { EmptyState } from "@/components/empty/EmptyState";

// Download Center: paste links (a video, a multi-part upload, a collection, a playlist, a channel), pick the videos,
// and download them all, each into its own Kroma project. Left: adding videos. Right: the queue (or the sites list).
// The queue runs in the main process, so it keeps going on other pages and after a restart.

/** Titles are filled in this many videos per yt-dlp run (about a second each on Bilibili). */
const TITLE_BATCH = 10;

const KIND_LABEL = { video: "Video", playlist: "Playlist", channel: "Channel" } as const;
const QUALITY: { value: DownloadQuality; label: string }[] = [
	{ value: "1080", label: "1080p" },
	{ value: "720", label: "720p" },
	{ value: "480", label: "480p" },
];

/** The status icons' hover text. */
const STATUS_TEXT: Record<DownloadItem["status"], string> = { waiting: "Waiting", downloading: "Downloading", done: "Done", skipped: "Already downloaded", failed: "Failed", cancelled: "Cancelled" };

const key = (source: ListedSource, video: ListedVideo) => `${source.url}\n${video.url}`;

export function DownloadsPage() {
	const [center, setCenter] = useState<DownloadCenterState>({ items: [], options: DEFAULT_DOWNLOAD_OPTIONS, paused: false });
	const [tab, setTab] = useState<"queue" | "sites">("queue");
	/** Finished downloads ticked to send to Batch. */
	const [picked, setPicked] = useState<Set<string>>(new Set());
	useEffect(() => {
		void window.kroma.downloadState().then(setCenter);
		return window.kroma.onDownloads(setCenter);
	}, []);

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			<PageHeader
				icon={<Download />}
				title={t("Downloads")}
				description={t("Whole series, playlists and channels — each video becomes its own project")}
				actions={tab === "queue" ? <QueueActions center={center} picked={picked} onSent={() => setPicked(new Set())} /> : undefined}
			>
				<Segmented
						label={t("Queue or supported sites")}
						size="sm"
						value={tab}
						options={[
							{ value: "queue", label: `${t("Queue")}${center.items.length ? ` (${center.items.length})` : ""}` },
							{ value: "sites", label: t("Supported sites") },
						]}
					onChange={setTab}
				/>
			</PageHeader>
			<div className="flex min-h-0 flex-1">
				<AddVideos center={center} onAdded={() => setTab("queue")} />
				<div className="flex min-w-0 flex-1 flex-col">{tab === "queue" ? <Queue center={center} picked={picked} onPick={setPicked} onShowSites={() => setTab("sites")} /> : <Sites />}</div>
			</div>
		</div>
	);
}

// ── Adding videos ──

function AddVideos({ center, onAdded }: { center: DownloadCenterState; onAdded: () => void }) {
	const [text, setText] = useState("");
	const [sources, setSources] = useState<ListedSource[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [finding, setFinding] = useState(false);
	const [titles, setTitles] = useState<{ done: number; total: number } | null>(null);
	const [loadingMore, setLoadingMore] = useState<string | null>(null);
	const [imports, setImports] = useState<ImportPick | null>(null);
	const [importSel, setImportSel] = useState<Set<string>>(new Set());
	const [importing, setImporting] = useState(false);
	/** Bumped by each new search, so titles still coming in for an old one are dropped. */
	const search = useRef(0);
	const options = center.options;
	const queued = useMemo(() => new Set(center.items.filter((i) => i.status !== "failed" && i.status !== "cancelled").map((i) => i.url)), [center.items]);

	/** Fills in titles the listing didn't have (Bilibili channels), ten videos at a time, updating rows as they come. */
	const fillTitles = async (list: ListedSource[], run: number) => {
		const missing = list.flatMap((s) => s.items.filter((v) => v.untitled).map((v) => v.url));
		if (!missing.length) return;
		setTitles((t) => ({ done: t?.done ?? 0, total: (t?.total ?? 0) + missing.length }));
		for (let i = 0; i < missing.length; i += TITLE_BATCH) {
			const batch = missing.slice(i, i + TITLE_BATCH);
			const found = await window.kroma.downloadTitles(batch).catch(() => []);
			if (search.current !== run) return;
			setSources((current) =>
				current.map((s) => {
					let source = s;
					const items = s.items.map((v) => {
						const hit = found.find((f) => f.url === v.url || (v.videoId && f.id === v.videoId));
						if (!hit) return v;
						if (s.untitled && hit.uploader) source = { ...source, title: hit.uploader, untitled: false };
						return { ...v, title: hit.title, duration: hit.duration ?? v.duration, untitled: false };
					});
					return { ...source, items };
				}),
			);
			setTitles((t) => (t ? { ...t, done: Math.min(t.total, t.done + batch.length) } : t));
		}
	};

	const find = async () => {
		const run = ++search.current;
		setFinding(true);
		setTitles(null);
		try {
			const found = await window.kroma.listDownloads(text);
			if (search.current !== run) return;
			setSources(found);
			// Everything is picked to start with, except what's already in the queue.
			setSelected(new Set(found.flatMap((s) => s.items.filter((v) => !queued.has(v.url)).map((v) => key(s, v)))));
			void fillTitles(found, run).finally(() => search.current === run && setTitles(null));
		} catch (err) {
			useEditor.getState().showToast(t("Couldn't read the links"), "error", cleanError(err));
		} finally {
			if (search.current === run) setFinding(false);
		}
	};

	const loadMore = async (source: ListedSource) => {
		setLoadingMore(source.url);
		const start = (source.items[source.items.length - 1]?.index ?? 0) + 1;
		const more = await window.kroma.listMoreDownloads(source.url, start);
		setLoadingMore(null);
		if (more.error) return useEditor.getState().showToast(t("Couldn't list more videos"), "error", more.error);
		setSources((current) => current.map((s) => (s.url === source.url ? { ...s, items: [...s.items, ...more.items], hasMore: more.hasMore } : s)));
		setSelected((current) => new Set([...current, ...more.items.filter((v) => !queued.has(v.url)).map((v) => key(source, v))]));
		void fillTitles([more], search.current);
	};

	const toggle = (k: string, on: boolean) =>
		setSelected((current) => {
			const next = new Set(current);
			if (on) next.add(k);
			else next.delete(k);
			return next;
		});
	const selectAll = (source: ListedSource, on: boolean) =>
		setSelected((current) => {
			const next = new Set(current);
			for (const v of source.items) on ? next.add(key(source, v)) : next.delete(key(source, v));
			return next;
		});

	const picked = sources.flatMap((s) => s.items.filter((v) => selected.has(key(s, v))).map((v) => ({ source: s, video: v })));
	const add = async () => {
		let added = 0;
		for (const source of sources) {
			const videos = source.items.filter((v) => selected.has(key(source, v)));
			if (!videos.length) continue;
			const group = source.kind === "video" ? "Single videos" : source.title;
			added += await window.kroma.addDownloads(videos, group, source.kind === "video" ? undefined : (source.count ?? source.items.length));
		}
		setSelected(new Set());
		const skipped = picked.length - added;
		useEditor.getState().showToast(added ? (added === 1 ? t("Added {n} video to the queue", { n: added }) : t("Added {n} videos to the queue", { n: added })) : t("Those videos are already in the queue"), "info", skipped && added ? t("{n} were already in the queue.", { n: skipped }) : undefined);
		onAdded();
	};

	const pickFiles = async (kind: "files" | "folder") => {
		setImporting(true);
		try {
			const pick = await window.kroma.pickImport(kind);
			if (!pick) return;
			if (!pick.files.length) return useEditor.getState().showToast(t("No video files in that folder"), "error", t("Kroma looks for mp4, mov, mkv, webm, m4v, avi and flv files directly in the folder (not in folders inside it)."));
			setImports(pick);
			setImportSel(new Set(pick.files.filter((f) => f.media).map((f) => f.path)));
		} catch (err) {
			useEditor.getState().showToast(t("Couldn't read the files"), "error", cleanError(err));
		} finally {
			setImporting(false);
		}
	};
	const importPicked = imports?.files.filter((f) => f.media && importSel.has(f.path)) ?? [];
	const makeProjects = async () => {
		if (!imports) return;
		const files = imports.files.flatMap((f, i) => (f.media && importSel.has(f.path) ? [{ media: f.media, index: i + 1 }] : []));
		const made = await window.kroma.importProjects(files, imports.group, imports.files.length);
		setImports(null);
		setImportSel(new Set());
		useEditor.getState().showToast(made === 1 ? t("Made {n} project", { n: made }) : t("Made {n} projects", { n: made }), "info", t("They're in the queue on the right: press Open project to start one."));
		onAdded();
	};

	const setOption = (patch: Partial<DownloadCenterState["options"]>) => void window.kroma.setDownloadOptions(patch);

	return (
		<aside className="flex w-[420px] shrink-0 flex-col border-r bg-sidebar">
			<div className="@container min-h-0 flex-1 divide-y overflow-y-auto">
			<Section title={t("Add videos")} hint={t("A video, a series, a collection or a channel — paste links, one per line.")}>
			<form
				className="space-y-2"
				onSubmit={(e) => {
					e.preventDefault();
					void find();
				}}
			>
				<textarea
					aria-label={t("Links")}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
							e.preventDefault();
							if (text.trim() && !finding) void find();
						}
					}}
					rows={4}
					placeholder={t("Paste links — a Bilibili / Douyin / YouTube video, a series, a collection or a channel (one per line)\n\nShare messages work too: 【第1集】 https://b23.tv/…")}
					className="w-full resize-none rounded-md border border-input bg-background/50 px-3 py-2 text-xs leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
				/>
				<div className="flex items-center gap-2">
					<Button type="submit" size="sm" className="w-full" disabled={finding || !text.trim()}>
						{finding ? <Loader2 className="animate-spin" /> : <Search />} {finding ? t("Finding…") : t("Find videos")}
					</Button>
				</div>
				{titles && (
					<p className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
						<Loader2 className="size-3 animate-spin" /> {t("Getting titles {done}/{total}", { done: titles.done, total: titles.total })}
					</p>
				)}
			</form>
			</Section>

			<Section title={t("Your own files")} hint={t("Episodes you already have: each becomes its own project, in order (EP1, EP2, … EP10).")}>
				<div className="grid grid-cols-2 gap-2">
					<Button type="button" variant="outline" size="sm" className="min-w-0" disabled={importing} title={t("Make projects from video files you already have")} onClick={() => void pickFiles("files")}>
						<FileInput /> {t("Import files…")}
					</Button>
					<Button type="button" variant="outline" size="sm" className="min-w-0" disabled={importing} title={t("Make projects from the videos in a folder (EP1, EP2, … in order)")} onClick={() => void pickFiles("folder")}>
						<FolderInput /> {t("Import a folder…")}
					</Button>
				</div>
			</Section>

				{/* What was found */}
				{imports && <ImportGroup pick={imports} selected={importSel} onChange={setImportSel} onClose={() => setImports(null)} />}
				{sources.length === 0 && !imports ? (
					<Section title={t("How it works")} hint={t("Paste links and press Find videos, then tick the videos you want before anything starts. A whole series downloads as one folder, and each episode becomes its own project, ready to translate and voice.")}>
						<span />
					</Section>
				) : (
					sources.map((source) => <SourceGroup key={source.url} source={source} selected={selected} queued={queued} loadingMore={loadingMore === source.url} onToggle={toggle} onSelectAll={selectAll} onLoadMore={() => void loadMore(source)} />)
				)}

				<Section title={t("Options")} hint={t("For the videos you download next.")}>
				<Card>
					<Row stack label={t("Quality")} control={<Segmented label={t("Quality")} equalWidth value={options.quality} options={QUALITY} onChange={(quality) => setOption({ quality })} />} />
					<Row label={t("Site subtitles")} control={<Switch checked={options.subtitles} onCheckedChange={(subtitles) => setOption({ subtitles })} aria-label={t("Site subtitles")} />} />
					<Row label={t("Make a project for each video")} control={<Switch checked={options.makeProjects} onCheckedChange={(makeProjects) => setOption({ makeProjects })} aria-label={t("Make a project for each video")} />} />
				</Card>
				</Section>
			</div>

			{/* The main action stays in view */}
			<div className="shrink-0 space-y-2 border-t p-4">
				{imports && (
					<Button className="w-full" variant={picked.length ? "outline" : "default"} disabled={!importPicked.length} onClick={() => void makeProjects()}>
						<FileVideo /> {importPicked.length ? (importPicked.length === 1 ? t("Make {n} project", { n: 1 }) : t("Make {n} projects", { n: importPicked.length })) : t("Make projects")}
					</Button>
				)}
				<Button className={cn("w-full", imports && !sources.length && "hidden")} disabled={!picked.length} onClick={() => void add()}>
					<Download /> {picked.length ? (picked.length === 1 ? t("Download {n} video", { n: 1 }) : t("Download {n} videos", { n: picked.length })) : t("Download")}
				</Button>
			</div>
		</aside>
	);
}

/** Files picked with Import files… / Import a folder…, like a listed playlist: tick the ones to make projects of. */
function ImportGroup({ pick, selected, onChange, onClose }: { pick: ImportPick; selected: Set<string>; onChange: (s: Set<string>) => void; onClose: () => void }) {
	const usable = pick.files.filter((f) => f.media);
	const set = (path: string, on: boolean) => {
		const next = new Set(selected);
		if (on) next.add(path);
		else next.delete(path);
		onChange(next);
	};
	return (
		<div className="px-4 py-4">
		<PageSection
			title={<span className="min-w-0 truncate" title={t(pick.group)}>{t(pick.group)}</span>}
			description={`${t("Your files")} · ${pick.files.length === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n: pick.files.length })} · ${t("{n} picked", { n: selected.size })}. ${t("Kroma uses the files where they are — don't move or delete them. Subtitle files with the same name (EP1.srt, EP1.zh.srt) come along.")}`}
			action={
				<div className="flex gap-0.5">
					{usable.length > 1 && (
						<>
							<Button variant="ghost" size="xs" onClick={() => onChange(new Set(usable.map((f) => f.path)))}>
								{t("All")}
							</Button>
							<Button variant="ghost" size="xs" onClick={() => onChange(new Set())}>
								{t("None")}
							</Button>
						</>
					)}
					<IconButton label={t("Close")} size="icon-xs" onClick={onClose}>
						<X />
					</IconButton>
				</div>
			}
		>
			<Card className="px-0">
				{pick.files.map((f, i) => (
					<label key={f.path} className={cn("flex h-8 items-center gap-2.5 px-3", f.media ? "cursor-pointer hover:bg-foreground/5" : "opacity-60")} title={f.error ?? f.path}>
						<Checkbox checked={selected.has(f.path)} disabled={!f.media} onCheckedChange={(on) => set(f.path, on === true)} aria-label={f.name} />
						<span className="w-7 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">{i + 1}</span>
						<span className="min-w-0 flex-1 truncate text-xs">{f.name}</span>
						{f.error ? (
							<span className="max-w-40 shrink-0 truncate text-[11px] text-destructive">{f.error}</span>
						) : (
							<>
								{Object.keys(f.media?.siteSubtitles ?? {}).length > 0 && <span className="shrink-0 rounded-sm border px-1 text-[10px] text-muted-foreground">SRT</span>}
								<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatSize(f.size)}</span>
								<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatTime(f.media?.duration ?? 0)}</span>
							</>
						)}
					</label>
				))}
			</Card>
		</PageSection>
		</div>
	);
}

const formatSize = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : bytes >= 1024 ** 2 ? `${Math.round(bytes / 1024 ** 2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function SourceGroup({
	source,
	selected,
	queued,
	loadingMore,
	onToggle,
	onSelectAll,
	onLoadMore,
}: {
	source: ListedSource;
	selected: Set<string>;
	queued: Set<string>;
	loadingMore: boolean;
	onToggle: (key: string, on: boolean) => void;
	onSelectAll: (source: ListedSource, on: boolean) => void;
	onLoadMore: () => void;
}) {
	const count = source.count ?? source.items.length;
	const picked = source.items.filter((v) => selected.has(key(source, v))).length;
	return (
		<div className="px-4 py-4">
		<PageSection
			title={<span className="min-w-0 truncate" title={source.title}>{source.title}</span>}
			description={source.error ? t("Couldn't read this link") : `${t(KIND_LABEL[source.kind])} · ${count === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n: count })}${source.items.length < count ? ` · ${t("{n} listed", { n: source.items.length })}` : ""} · ${t("{n} picked", { n: picked })}`}
			action={
				source.items.length > 1 && (
					<div className="flex gap-0.5">
						<Button variant="ghost" size="xs" onClick={() => onSelectAll(source, true)}>
							{t("All")}
						</Button>
						<Button variant="ghost" size="xs" onClick={() => onSelectAll(source, false)}>
							{t("None")}
						</Button>
					</div>
				)
			}
		>
			{source.error ? (
				<p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{source.error}</p>
			) : (
				<Card className="px-0">
					{source.items.map((v) => {
						const k = key(source, v);
						const inQueue = queued.has(v.url);
						return (
							<label key={k} className="flex h-8 cursor-pointer items-center gap-2.5 px-3 hover:bg-foreground/5">
								<Checkbox checked={selected.has(k)} onCheckedChange={(on) => onToggle(k, on === true)} aria-label={v.title} />
								{source.kind !== "video" && <span className="w-7 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">{v.index}</span>}
								<span className={cn("min-w-0 flex-1 truncate text-xs", v.untitled && "text-muted-foreground")} title={v.title}>
									{v.title}
								</span>
								{inQueue && <span className="shrink-0 text-[10px] text-muted-foreground">{t("In queue")}</span>}
								{v.duration !== undefined && <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatTime(v.duration)}</span>}
							</label>
						);
					})}
				</Card>
			)}
			{source.hasMore && (
				<Button variant="outline" size="xs" disabled={loadingMore} onClick={onLoadMore}>
					{loadingMore ? <Loader2 className="animate-spin" /> : null} {t("Load more")}
				</Button>
			)}
		</PageSection>
		</div>
	);
}

// ── The queue ──

/** A finished download whose project can be processed in Batch. */
const processable = (item: DownloadItem) => (item.status === "done" || item.status === "skipped") && Boolean(item.projectPath);

function QueueActions({ center, picked, onSent }: { center: DownloadCenterState; picked: Set<string>; onSent: () => void }) {
	const toBatch = center.items.filter((i) => picked.has(i.id) && processable(i));
	const process = () => {
		const added = addToBatch(toBatch.map((i) => i.projectPath!));
		onSent();
		useEditor.getState().openBatch("process");
		useEditor.getState().showToast(added ? (added === 1 ? t("{n} video ready to process", { n: added }) : t("{n} videos ready to process", { n: added })) : t("Those are already in Batch"), "info", added ? t("Choose the steps, then press Process.") : undefined);
	};
	const failed = center.items.some((i) => i.status === "failed" || i.status === "cancelled");
	const finished = center.items.some((i) => i.status === "done" || i.status === "skipped");
	const active = center.items.some((i) => i.status === "waiting" || i.status === "downloading");
	return (
		<>
			<span className="hidden truncate text-xs text-muted-foreground tabular-nums xl:block">{queueSummary(center.items)}</span>
			{(active || center.paused) && (
				<Button variant="outline" size="sm" onClick={() => void window.kroma.pauseDownloads(!center.paused)}>
					{center.paused ? <Play /> : <Pause />} {center.paused ? t("Resume") : t("Pause")}
				</Button>
			)}
			{failed && (
				<Button variant="outline" size="sm" onClick={() => void window.kroma.retryFailedDownloads()}>
					<RotateCcw /> {t("Retry failed")}
				</Button>
			)}
			{finished && (
				<Button variant="outline" size="sm" onClick={() => void window.kroma.clearFinishedDownloads()}>
					{t("Clear finished")}
				</Button>
			)}
			{toBatch.length > 0 && (
				<Button size="sm" onClick={process} title={t("Run every step on them in Batch (subtitles, translation, voice-over, export…)")}>
					{t("Process {n} selected", { n: toBatch.length })} <ArrowRight />
				</Button>
			)}
			<AppSelect
				label={t("Downloads at the same time")}
				className="w-36 shrink-0"
				value={String(center.options.concurrency) as "1" | "2" | "3"}
				options={[
					{ value: "1", label: t("{n} at a time", { n: 1 }) },
					{ value: "2", label: t("{n} at a time", { n: 2 }) },
					{ value: "3", label: t("{n} at a time", { n: 3 }) },
				]}
				onChange={(v) => void window.kroma.setDownloadOptions({ concurrency: Number(v) as 1 | 2 | 3 })}
			/>
		</>
	);
}

function Queue({ center, picked, onPick, onShowSites }: { center: DownloadCenterState; picked: Set<string>; onPick: (s: Set<string>) => void; onShowSites: () => void }) {
	const pick = (id: string, on: boolean) => {
		const next = new Set(picked);
		if (on) next.add(id);
		else next.delete(id);
		onPick(next);
	};
	const groups = useMemo(() => {
		const map = new Map<string, DownloadItem[]>();
		for (const item of center.items) map.set(item.group, [...(map.get(item.group) ?? []), item]);
		return [...map.entries()];
	}, [center.items]);

	if (!center.items.length) {
		return (
			<EmptyState
				scene="download"
				title={t("Nothing downloading yet")}
				description={t("Paste links on the left and press Find videos. Videos download here one after another, and keep going while you work on other pages.")}
				action={
					<Button variant="outline" size="sm" onClick={onShowSites}>
						{t("Which sites work?")}
					</Button>
				}
			/>
		);
	}
	return (
		<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
			{center.paused && (
				<div role="status" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs">
					<Pause className="mt-0.5 size-3.5 shrink-0" />
					<span className="min-w-0 flex-1">{center.pauseReason ?? t("Paused. Downloads that were running finish; press Resume to start the rest.")}</span>
				</div>
			)}
			{groups.map(([group, items]) => {
				const ready = items.filter(processable);
				const all = ready.length > 0 && ready.every((i) => picked.has(i.id));
				return (
				<PageSection
					key={group}
					title={<span className="min-w-0 truncate" title={t(group)}>{t(group)}</span>}
					description={queueSummary(items)}
					action={
						ready.length > 1 && (
							<Button variant="ghost" size="xs" onClick={() => onPick(new Set([...[...picked].filter((id) => !ready.some((i) => i.id === id)), ...(all ? [] : ready.map((i) => i.id))]))}>
								{all ? t("Select none") : t("Select finished")}
							</Button>
						)
					}
				>
					<Card className="px-0">
						{items.map((item) => (
							<QueueRow key={item.id} item={item} picked={picked.has(item.id)} onPick={processable(item) ? (on) => pick(item.id, on) : undefined} />
						))}
					</Card>
				</PageSection>
				);
			})}
		</div>
	);
}

function StatusIcon({ status }: { status: DownloadItem["status"] }) {
	const icon = {
		waiting: <Clock className="text-muted-foreground" />,
		downloading: <Loader2 className="animate-spin text-primary" />,
		done: <CircleCheck className="text-success" />,
		skipped: <Check className="text-muted-foreground" />,
		failed: <CircleAlert className="text-destructive" />,
		cancelled: <Ban className="text-muted-foreground" />,
	}[status];
	return (
		<span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4" title={t(STATUS_TEXT[status])}>
			{icon}
		</span>
	);
}

function QueueRow({ item, picked, onPick }: { item: DownloadItem; picked: boolean; onPick?: (on: boolean) => void }) {
	const detail = (() => {
		switch (item.status) {
			case "waiting":
				return t("Waiting");
			case "downloading": {
				if (item.message) return item.message;
				const pct = item.progress >= 0 ? `${Math.round(item.progress * 100)}%` : "";
				return [pct, transferText(item)].filter(Boolean).join(" · ") || t("Starting…");
			}
			case "done":
				if (item.imported) return t("Your file · project ready");
				return item.projectPath ? t("Downloaded · project ready") : t("Downloaded");
			case "skipped":
				return item.projectPath ? t("Already downloaded · project ready") : t("Already downloaded");
			case "failed":
				return item.error ?? t("Failed");
			case "cancelled":
				return t("Cancelled");
		}
	})();
	const open = () => item.projectPath && void openProjectAt(item.projectPath);
	return (
		<div className="flex items-center gap-3 px-3.5 py-2">
			{onPick ? <Checkbox checked={picked} onCheckedChange={(on) => onPick(on === true)} aria-label={t("Select {name} to process", { name: item.title })} /> : <span className="size-4 shrink-0" />}
			<StatusIcon status={item.status} />
			{item.index > 0 && <span className="w-7 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">{item.index}</span>}
			<div className="min-w-0 flex-1 space-y-1">
				<p className={cn("truncate text-[13px]", item.untitled && "text-muted-foreground")} title={item.title}>
					{item.title}
				</p>
				{item.status === "downloading" && <ProgressBar value={item.progress} />}
				<p className={cn("truncate text-[11px] tabular-nums", item.status === "failed" ? "text-destructive" : "text-muted-foreground")} title={detail}>
					{detail}
					{item.status === "waiting" || item.status === "downloading" ? ` · ${item.quality}p` : ""}
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-0.5">
				{(item.status === "done" || item.status === "skipped") && item.projectPath && (
					<Button variant="outline" size="xs" onClick={open}>
						<FileVideo /> {t("Open project")}
					</Button>
				)}
				{(item.status === "failed" || item.status === "cancelled") && (
					<Button variant="outline" size="xs" onClick={() => void window.kroma.retryDownload(item.id)}>
						<RotateCcw /> {t("Retry")}
					</Button>
				)}
				{(item.status === "waiting" || item.status === "downloading") && (
					<IconButton label={t("Cancel")} size="icon-xs" onClick={() => void window.kroma.cancelDownload(item.id)}>
						<X />
					</IconButton>
				)}
				{(item.mediaPath || item.projectPath) && (
					<IconButton label={t("Show in folder")} size="icon-xs" onClick={() => void window.kroma.showDownload(item.id)}>
						<FolderOpen />
					</IconButton>
				)}
				{item.status !== "downloading" && (
					<IconButton label={t("Remove from the list (the files stay)")} size="icon-xs" onClick={() => void window.kroma.removeDownload(item.id)}>
						<Trash2 />
					</IconButton>
				)}
			</div>
		</div>
	);
}

// ── Supported sites ──

function Sites() {
	const [all, setAll] = useState<{ name: string; broken: boolean }[] | null>(null);
	const [query, setQuery] = useState("");
	useEffect(() => {
		void window.kroma
			.downloadPlatforms()
			.then(setAll)
			.catch(() => setAll([]));
	}, []);
	const q = query.trim().toLowerCase();
	const matches = (all ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));
	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<div className="mx-auto w-full max-w-[1600px] space-y-8 px-6 py-5">
				{(["chinese", "global"] as const).map((region) => (
					<PageSection
						key={region}
						title={region === "chinese" ? t("Chinese sites") : t("Global sites")}
						description={
							region === "chinese"
								? t("Protected (DRM) VIP episodes can't be downloaded by any app like this one. Videos that need an account work after you turn on browser logins in Settings → Downloads.")
								: t("Videos that need an account work after you turn on browser logins in Settings → Downloads.")
						}
					>
						<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
							{PLATFORMS.filter((p) => p.region === region).map((p) => (
								<li key={p.name} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card/50 p-3.5">
									<div className="flex items-start justify-between gap-2">
										<p className="min-w-0 truncate text-[13px] font-medium" title={p.name}>
											{p.name}
										</p>
										{p.support === "yes" ? (
											<span className="flex shrink-0 items-center gap-1 rounded-sm border border-success/40 px-1.5 text-[10px] leading-5 text-success">
												<Check className="size-3" /> {t("Works")}
											</span>
										) : (
											<span className="shrink-0 rounded-sm border border-warning/40 px-1.5 text-[10px] leading-5 text-warning">{t("Free only")}</span>
										)}
									</div>
									<p className="flex-1 text-xs leading-relaxed text-muted-foreground">{t(p.note)}</p>
									<div className="flex items-center justify-between gap-2 border-t pt-2">
										<span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{new URL(p.url).host.replace(/^www\./, "")}</span>
										<Button variant="outline" size="xs" className="shrink-0" onClick={() => void window.kroma.openExternal(p.url)} aria-label={t("Open {name} in your browser", { name: p.name })}>
											{t("Open site")} <ExternalLink />
										</Button>
									</div>
								</li>
							))}
						</ul>
					</PageSection>
				))}
				<PageSection
					title={`${t("Every site")}${all ? ` (${all.length.toLocaleString()})` : ""}`}
					description={t("Everything yt-dlp, the downloader inside Kroma, can read.")}
					action={<Input aria-label={t("Search sites")} placeholder={t("Search sites")} className="w-56 text-xs" value={query} onChange={(e) => setQuery(e.target.value)} />}
				>
					{all === null ? (
						<p className="flex items-center gap-2 text-xs text-muted-foreground">
							<Loader2 className="size-3 animate-spin" /> {t("Loading the list…")}
						</p>
					) : matches.length === 0 ? (
						<EmptyState fill={false} compact className="rounded-lg border border-dashed" scene={all.length ? "search" : "error"} tone={all.length ? "primary" : "warning"} title={all.length ? t("No site matches") : t("The list isn't available")} description={all.length ? t("Nothing called \"{query}\". Sites not listed may still work: try the link.", { query }) : t("yt-dlp, the downloader inside Kroma, is missing.")} />
					) : (
						<ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4 rounded-lg border bg-card/50 px-3.5 py-2.5">
							{matches.map((s) => (
								<li key={s.name} className={cn("flex h-6 min-w-0 items-center gap-1.5 text-xs", s.broken && "text-muted-foreground")} title={s.broken ? t("{name}: not working right now", { name: s.name }) : s.name}>
									<span className="truncate">{s.name}</span>
									{s.broken && <span className="shrink-0 text-[10px]">{t("not working")}</span>}
								</li>
							))}
						</ul>
					)}
				</PageSection>
			</div>
		</div>
	);
}

function cleanError(err: unknown): string {
	const text = err instanceof Error ? err.message : String(err);
	return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}
