import { memo, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MoveHorizontal, Scissors, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import type { Cue, MediaItem, MediaVisuals, Project } from "@shared/types";
import { type PlacedClip, deleteClip, formatTime, moveClip, placeClips, splitAt, totalDuration, trimClip } from "@/lib/timeline";
import { useLayout } from "@/state/layout";
import { useMediaVisuals } from "@/state/visuals";
import { mediaUrl } from "./Preview";
import { useEditor } from "@/state/store";
import { ResizeHandle } from "./ResizeHandle";
import { Slider } from "@/components/ui/slider";
import { IconButton } from "./common";

const PAD = 16;
const RULER = 26;
const SUB_TRACK = 40;
const VIDEO_TRACK = 64;
const HEAD = 72;

export function splitAtPlayhead(): void {
	const { time, update } = useEditor.getState();
	update((p) => ({ ...p, clips: splitAt(p.clips, time) }));
}

export function deleteSelection(): void {
	const { selection, update, select } = useEditor.getState();
	if (!selection) return;
	if (selection.kind === "clip") update((p) => ({ ...p, ...deleteClip(p.clips, p.cues, selection.id) }));
	else if (selection.kind === "object") update((p) => ({ ...p, objects: (p.objects ?? []).filter((o) => o.id !== selection.id) }));
	else update((p) => ({ ...p, cues: p.cues.filter((c) => c.id !== selection.id) }));
	select(null);
}

export function Timeline() {
	const project = useEditor((s) => s.project);
	const zoom = useEditor((s) => s.zoom);
	const height = useLayout((s) => s.sizes.timeline);
	const setZoom = useEditor((s) => s.setZoom);
	const selection = useEditor((s) => s.selection);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [view, setView] = useState({ left: 0, width: 1000 });
	const total = totalDuration(project.clips);
	const placed = placeClips(project.clips);
	const width = total * zoom + PAD * 2 + 200;

	const fit = useCallback(() => {
		const el = scrollRef.current;
		if (el && total > 0) setZoom((el.clientWidth - HEAD - PAD * 2 - 40) / total);
	}, [total, setZoom]);

	// Fit the whole video when the first one arrives.
	const hadMedia = useRef(false);
	useEffect(() => {
		if (total > 0 && !hadMedia.current) fit();
		hadMedia.current = total > 0;
	}, [total, fit]);

	const onScroll = () => {
		const el = scrollRef.current;
		if (el) setView({ left: el.scrollLeft, width: el.clientWidth });
	};
	useEffect(onScroll, []);

	// Pinch / Cmd+wheel zooms around the pointer.
	const onWheel = (e: React.WheelEvent) => {
		if (!e.ctrlKey && !e.metaKey) return;
		const el = scrollRef.current!;
		const x = e.clientX - el.getBoundingClientRect().left - HEAD + el.scrollLeft - PAD;
		const at = x / zoom;
		const next = Math.max(0.5, Math.min(400, zoom * Math.exp(-e.deltaY * 0.01)));
		setZoom(next);
		requestAnimationFrame(() => {
			el.scrollLeft = at * next + PAD - (e.clientX - el.getBoundingClientRect().left - HEAD);
		});
	};

	const timeFromEvent = (clientX: number) => {
		const el = scrollRef.current!;
		return Math.max(0, (clientX - el.getBoundingClientRect().left - HEAD + el.scrollLeft - PAD) / zoom);
	};

	const scrubStart = (e: ReactPointerEvent) => {
		(e.target as Element).setPointerCapture(e.pointerId);
		useEditor.getState().seek(timeFromEvent(e.clientX));
		if (!(e.target as Element).closest('[aria-label="Playhead"]')) useEditor.getState().select(null);
		const move = (ev: PointerEvent) => useEditor.getState().seek(timeFromEvent(ev.clientX));
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	};

	// Dragging a clip's body reorders it; the gold bar shows where it will land.
	const [dropAt, setDropAt] = useState<number | null>(null);
	const reorderStart = useCallback(
		(e: ReactPointerEvent, id: string) => {
			const startX = e.clientX;
			let target: number | null = null;
			const targetFor = (clientX: number) => {
				const t = timeFromEvent(clientX);
				const others = placeClips(useEditor.getState().project.clips).filter((c) => c.id !== id);
				const index = others.filter((c) => (c.start + c.end) / 2 < t).length;
				const boundary = index === 0 ? 0 : others[index - 1].end;
				// `others` positions exclude the dragged clip, so map the boundary back onto the current layout.
				const current = placeClips(useEditor.getState().project.clips);
				const anchor = index === 0 ? current.find((c) => c.id === others[0]?.id)?.start ?? 0 : current.find((c) => c.id === others[index - 1].id)?.end ?? boundary;
				return { index, anchor };
			};
			const move = (ev: PointerEvent) => {
				if (target === null && Math.abs(ev.clientX - startX) < 6) return;
				const { index, anchor } = targetFor(ev.clientX);
				target = index;
				setDropAt(anchor);
			};
			const up = () => {
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", up);
				setDropAt(null);
				if (target !== null) {
					const to = target;
					useEditor.getState().update((p) => ({ ...p, ...moveClip(p.clips, p.cues, id, to) }));
				}
			};
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", up);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[zoom],
	);

	const visibleStart = (view.left - PAD) / zoom - 5;
	const visibleEnd = (view.left + view.width) / zoom + 5;
	const visibleCues = project.cues.filter((c) => c.end >= visibleStart && c.start <= visibleEnd);

	return (
		<section className="relative flex shrink-0 flex-col border-t border-border bg-card" style={{ height }}>
			<ResizeHandle panel="timeline" edge="top" label="Resize the timeline" />
			<div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
				<IconButton label="Split at the playhead (S)" onClick={splitAtPlayhead} disabled={!total}>
					<Scissors className="size-4" />
				</IconButton>
				<IconButton label="Delete the selection (Delete)" onClick={deleteSelection} disabled={!selection}>
					<Trash2 className="size-4" />
				</IconButton>
				<div className="mx-2 h-5 w-px bg-border" />
				<span className="text-[11px] text-muted-foreground">{selection?.kind === "clip" ? "Video clip selected · drag to reorder, edges to trim" : selection?.kind === "cue" ? "Subtitle selected · drag to move, edges to retime" : ""}</span>
				<div className="ml-auto flex items-center gap-1">
					<IconButton label="Zoom out" onClick={() => setZoom(zoom / 1.5)}>
						<ZoomOut className="size-4" />
					</IconButton>
					<div className="w-28 px-1"><Slider min={0} max={1} step={0.001} value={[Math.log(zoom / 0.5) / Math.log(800)]} onValueChange={(v) => setZoom(0.5 * 800 ** (Array.isArray(v) ? v[0] : v))} aria-label="Zoom" /></div>
					<IconButton label="Zoom in" onClick={() => setZoom(zoom * 1.5)}>
						<ZoomIn className="size-4" />
					</IconButton>
					<IconButton label="Fit the whole video" onClick={fit} disabled={!total}>
						<MoveHorizontal className="size-4" />
					</IconButton>
				</div>
			</div>

			<div className="flex min-h-0 flex-1">
				<div className="w-[72px] shrink-0 border-r border-border text-[11px] text-muted-foreground" style={{ paddingTop: RULER }}>
					<div className="flex items-center px-3" style={{ height: SUB_TRACK }}>Subtitles</div>
					<div className="flex items-center px-3" style={{ height: VIDEO_TRACK }}>Video</div>
				</div>
				<div ref={scrollRef} className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden" onScroll={onScroll} onWheel={onWheel}>
					<div className="relative h-full" style={{ width }}>
						<Ruler zoom={zoom} total={total} view={view} onPointerDown={scrubStart} />
						<div className="absolute right-0 left-0" style={{ top: RULER, height: SUB_TRACK }} onPointerDown={scrubStart}>
							{visibleCues.map((cue) => (
								<CueBlock key={cue.id} cue={cue} zoom={zoom} selected={selection?.kind === "cue" && selection.id === cue.id} />
							))}
						</div>
						<div className="absolute right-0 left-0" style={{ top: RULER + SUB_TRACK, height: VIDEO_TRACK }} onPointerDown={scrubStart}>
							{placed.map((clip) => (
								<ClipBlock key={clip.id} clip={clip} zoom={zoom} media={project.media.find((m) => m.id === clip.mediaId)} selected={selection?.kind === "clip" && selection.id === clip.id} view={view} onReorder={reorderStart} />
							))}
							{dropAt !== null && <div className="pointer-events-none absolute top-0 bottom-0 z-20 w-[3px] -translate-x-1/2 rounded-none bg-primary" style={{ left: PAD + dropAt * zoom }} />}
						</div>
						<Playhead zoom={zoom} scrollRef={scrollRef} onScrub={scrubStart} />
					</div>
				</div>
			</div>
		</section>
	);
}

function Ruler({ zoom, total, view, onPointerDown }: { zoom: number; total: number; view: { left: number; width: number }; onPointerDown: (e: ReactPointerEvent) => void }) {
	// Pick a tick step that leaves ~90 px between labels.
	const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
	const step = steps.find((s) => s * zoom >= 90) ?? 3600;
	const first = Math.max(0, Math.floor((view.left - PAD) / zoom / step) * step);
	const last = Math.min(Math.max(total, 0) + step, (view.left + view.width) / zoom + step);
	const ticks: number[] = [];
	for (let t = first; t <= last; t += step) ticks.push(t);
	return (
		<div className="absolute top-0 right-0 left-0 cursor-col-resize border-b border-border" style={{ height: RULER }} onPointerDown={onPointerDown}>
			{ticks.map((t) => (
				<div key={t} className="absolute top-0 h-full border-l border-input pl-1 text-[10px] leading-[22px] text-muted-foreground" style={{ left: PAD + t * zoom }}>
					{formatTime(t)}
				</div>
			))}
		</div>
	);
}

/** Drag helper: snapshots the project on press so each move is computed from the original, not compounded. */
function dragHandler(onMove: (original: Project, dx: number) => Project) {
	return (e: ReactPointerEvent) => {
		e.stopPropagation();
		const startX = e.clientX;
		const original = useEditor.getState().project;
		let moved = false;
		const move = (ev: PointerEvent) => {
			const dx = ev.clientX - startX;
			if (!moved && Math.abs(dx) < 3) return;
			if (!moved) useEditor.getState().checkpoint();
			moved = true;
			useEditor.getState().update(() => onMove(original, dx), false);
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	};
}

const ClipBlock = memo(function ClipBlock({
	clip,
	zoom,
	media,
	selected,
	view,
	onReorder,
}: {
	clip: PlacedClip;
	zoom: number;
	media: MediaItem | undefined;
	selected: boolean;
	view: { left: number; width: number };
	onReorder: (e: ReactPointerEvent, id: string) => void;
}) {
	const visuals = useMediaVisuals(media);
	const trim = (edge: "in" | "out") =>
		dragHandler((p, dx) => {
			const m = p.media.find((x) => x.id === clip.mediaId);
			const value = (edge === "in" ? clip.in : clip.out) + dx / zoom;
			return { ...p, ...trimClip(p.clips, p.cues, clip.id, edge, value, m?.duration ?? clip.out) };
		});
	const trimIn = trim("in");
	const trimOut = trim("out");
	const left = PAD + clip.start * zoom;
	const width = Math.max(2, (clip.end - clip.start) * zoom);
	// The part of the clip on screen (px from the clip's left edge), so long clips only draw what's visible.
	const visibleFrom = Math.max(0, view.left - left - 200);
	const visibleTo = Math.min(width, view.left + view.width - left + 200);

	return (
		<div
			className={`absolute top-1 bottom-1 cursor-grab overflow-hidden rounded-sm border-2 bg-track-video/40 active:cursor-grabbing ${selected ? "border-primary" : "border-transparent hover:border-track-video"}`}
			style={{ left, width }}
			onPointerDown={(e) => {
				e.stopPropagation();
				// Like CapCut: clicking a clip selects it and puts the playhead (and the preview) on that moment.
				const rect = e.currentTarget.getBoundingClientRect();
				useEditor.getState().seek(clip.start + (e.clientX - rect.left) / zoom);
				useEditor.getState().select({ kind: "clip", id: clip.id });
				onReorder(e, clip.id);
			}}
		>
			{visuals && media && visibleTo > visibleFrom && <Filmstrip clip={clip} zoom={zoom} media={media} visuals={visuals} from={visibleFrom} to={visibleTo} />}
			{visuals && visuals.peaks.length > 0 && visibleTo > visibleFrom && <Waveform clip={clip} zoom={zoom} visuals={visuals} from={visibleFrom} to={visibleTo} />}
			<div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 bg-gradient-to-b from-black/60 to-transparent px-2 pt-0.5 pb-2 text-[10px] text-white">
				<span className="truncate font-medium">{media?.name ?? ""}</span>
				<span className="shrink-0 text-white/60">{formatTime(clip.end - clip.start)}</span>
			</div>
			<div className="absolute inset-y-0 left-0 w-2 cursor-ew-resize hover:bg-white/40" onPointerDown={trimIn} />
			<div className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-white/40" onPointerDown={trimOut} />
		</div>
	);
});

/** Frames side by side along the clip, each showing the moment under it (like CapCut). */
function Filmstrip({ clip, zoom, media, visuals, from, to }: { clip: PlacedClip; zoom: number; media: MediaItem; visuals: MediaVisuals; from: number; to: number }) {
	const height = VIDEO_TRACK - 8;
	const tile = Math.max(24, Math.round((height * media.width) / Math.max(1, media.height)));
	const tiles: { x: number; src: string }[] = [];
	const first = Math.floor(from / tile) * tile;
	for (let x = first; x < to; x += tile) {
		const t = clip.in + (x + tile / 2) / zoom;
		const index = Math.min(visuals.thumbs.files.length - 1, Math.max(0, Math.floor(t / visuals.thumbs.interval)));
		const file = visuals.thumbs.files[index];
		if (file) tiles.push({ x, src: mediaUrl(file) });
	}
	return (
		<div className="pointer-events-none absolute inset-0">
			{tiles.map((t) => (
				<img key={t.x} src={t.src} alt="" draggable={false} className="absolute top-0 h-full object-cover" style={{ left: t.x, width: tile }} />
			))}
		</div>
	);
}

/** The sound's loudness along the bottom of the clip. */
function Waveform({ clip, zoom, visuals, from, to }: { clip: PlacedClip; zoom: number; visuals: MediaVisuals; from: number; to: number }) {
	const ref = useRef<HTMLCanvasElement>(null);
	const height = 16;
	const width = Math.min(Math.ceil(to - from), 8000);
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		const ctx = canvas.getContext("2d")!;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = "rgba(255,255,255,0.6)";
		const perPx = visuals.peaksPerSecond / zoom; // peaks per pixel
		for (let px = 0; px < width; px++) {
			const t = clip.in + (from + px) / zoom;
			const a = Math.floor(t * visuals.peaksPerSecond);
			const b = Math.max(a + 1, Math.floor(a + perPx));
			let peak = 0;
			for (let i = a; i < b && i < visuals.peaks.length; i++) peak = Math.max(peak, visuals.peaks[i]);
			// Mirrored around a midline, as editors draw it; a gentle curve keeps loud parts from filling the strip.
			const h = Math.max(1, Math.sqrt(peak / 255) * (height - 4));
			ctx.fillRect(px, (height - h) / 2, 1, h);
		}
	}, [clip.in, zoom, visuals, from, width]);
	return <canvas ref={ref} className="pointer-events-none absolute bottom-0 bg-gradient-to-t from-black/55 to-transparent" style={{ left: from, width, height }} />;
}

const CueBlock = memo(function CueBlock({ cue, zoom, selected }: { cue: Cue; zoom: number; selected: boolean }) {
	const edit = (mode: "move" | "start" | "end") =>
		dragHandler((p, dx) => {
			const d = dx / zoom;
			return {
				...p,
				cues: p.cues.map((c) => {
					if (c.id !== cue.id) return c;
					if (mode === "move") {
						const start = Math.max(0, cue.start + d);
						return { ...c, start, end: start + (cue.end - cue.start) };
					}
					if (mode === "start") return { ...c, start: Math.max(0, Math.min(cue.start + d, cue.end - 0.2)) };
					return { ...c, end: Math.max(cue.end + d, cue.start + 0.2) };
				}),
			};
		});
	const move = edit("move");
	const resizeStart = edit("start");
	const resizeEnd = edit("end");
	const width = (cue.end - cue.start) * zoom;
	return (
		<div
			className={`absolute top-1.5 bottom-1.5 cursor-grab overflow-hidden rounded-none border active:cursor-grabbing ${selected ? "border-primary bg-track-subtitle" : cue.text ? "border-track-subtitle/50 bg-track-subtitle/70" : "border-input bg-muted"}`}
			style={{ left: PAD + cue.start * zoom, width: Math.max(2, width) }}
			title={cue.text || cue.source}
			onPointerDown={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				useEditor.getState().seek(cue.start + (e.clientX - rect.left) / zoom);
				useEditor.getState().select({ kind: "cue", id: cue.id });
				move(e);
			}}
		>
			{width > 24 && <div className="pointer-events-none truncate px-1.5 font-khmer text-[11px] leading-[26px] text-white/90">{cue.text || cue.source}</div>}
			{width > 10 && (
				<>
					<div className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize" onPointerDown={resizeStart} />
					<div className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize" onPointerDown={resizeEnd} />
				</>
			)}
		</div>
	);
});

function Playhead({ zoom, scrollRef, onScrub }: { zoom: number; scrollRef: React.RefObject<HTMLDivElement | null>; onScrub: (e: ReactPointerEvent) => void }) {
	const time = useEditor((s) => s.time);
	const playing = useEditor((s) => s.playing);
	const x = PAD + time * zoom;

	// Follow the playhead while playing.
	useEffect(() => {
		const el = scrollRef.current;
		if (!el || !playing) return;
		if (x > el.scrollLeft + el.clientWidth - 60 || x < el.scrollLeft) el.scrollLeft = x - 120;
	}, [x, playing, scrollRef]);

	return (
		<div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary" style={{ left: x }}>
			{/* The knob drags the playhead (scrub); a wider invisible grip makes it easy to catch. */}
			<div
				role="slider"
				aria-label="Playhead"
				aria-valuenow={Math.round(useEditor.getState().time)}
				className="pointer-events-auto absolute -top-px -left-[7px] flex h-4 w-[15px] cursor-ew-resize justify-center"
				onPointerDown={(e) => {
					e.stopPropagation();
					onScrub(e);
				}}
			>
				<div className="h-2.5 w-[11px] rounded-b-sm bg-primary" />
			</div>
		</div>
	);
}
