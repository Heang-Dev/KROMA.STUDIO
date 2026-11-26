import type { Clip, Cue, SourceCue } from "@shared/types";

// Pure timeline maths. Clips play back to back on one main track (like CapCut's main track);
// subtitle cues are timed on the timeline, so cutting video ripples the subtitles with it.

export const MIN_CLIP = 0.1;
export const uid = () => crypto.randomUUID();

export interface PlacedClip extends Clip {
	start: number;
	end: number;
}

export function placeClips(clips: Clip[]): PlacedClip[] {
	let t = 0;
	return clips.map((clip) => {
		const start = t;
		t += clip.out - clip.in;
		return { ...clip, start, end: t };
	});
}

export const totalDuration = (clips: Clip[]) => clips.reduce((n, c) => n + (c.out - c.in), 0);

/** The clip under timeline time t (the last clip at the very end). */
export function clipAt(clips: Clip[], t: number): PlacedClip | null {
	const placed = placeClips(clips);
	return placed.find((c) => t >= c.start && t < c.end) ?? placed[placed.length - 1] ?? null;
}

export function splitAt(clips: Clip[], t: number): Clip[] {
	const target = placeClips(clips).find((c) => t > c.start + MIN_CLIP && t < c.end - MIN_CLIP);
	if (!target) return clips;
	const cut = target.in + (t - target.start);
	return clips.flatMap((c) => (c.id === target.id ? [{ ...c, out: cut }, { ...c, id: uid(), in: cut }] : [c]));
}

/** Removes the timeline range [a, b] from the cues: cues inside go, cues after move left. */
export function rippleRemove(cues: Cue[], a: number, b: number): Cue[] {
	const length = b - a;
	const out: Cue[] = [];
	for (const cue of cues) {
		if (cue.end <= a) out.push(cue);
		else if (cue.start >= b) out.push({ ...cue, start: cue.start - length, end: cue.end - length });
		else {
			// Overlaps the cut: keep the part outside it, if long enough to read.
			const start = cue.start < a ? cue.start : a;
			const end = cue.end > b ? cue.end - length : a;
			if (end - start >= 0.3) out.push({ ...cue, start, end });
		}
	}
	return out;
}

/** Opens a gap of `length` at timeline time t: cues after t move right. */
export function rippleInsert(cues: Cue[], t: number, length: number): Cue[] {
	return cues.map((c) => (c.start >= t ? { ...c, start: c.start + length, end: c.end + length } : c));
}

export function deleteClip(clips: Clip[], cues: Cue[], id: string): { clips: Clip[]; cues: Cue[] } {
	const target = placeClips(clips).find((c) => c.id === id);
	if (!target) return { clips, cues };
	return { clips: clips.filter((c) => c.id !== id), cues: rippleRemove(cues, target.start, target.end) };
}

/** Moves a clip's start (edge "in") or end (edge "out") inside its media, rippling the cues. */
export function trimClip(clips: Clip[], cues: Cue[], id: string, edge: "in" | "out", value: number, mediaDuration: number): { clips: Clip[]; cues: Cue[] } {
	const target = placeClips(clips).find((c) => c.id === id);
	if (!target) return { clips, cues };
	let next: Clip;
	let nextCues: Cue[];
	if (edge === "in") {
		const v = Math.min(Math.max(0, value), target.out - MIN_CLIP);
		const delta = v - target.in; // > 0 shortens
		next = { ...target, in: v };
		nextCues = delta > 0 ? rippleRemove(cues, target.start, target.start + delta) : rippleInsert(cues, target.start, -delta);
	} else {
		const v = Math.max(Math.min(mediaDuration, value), target.in + MIN_CLIP);
		const delta = target.out - v; // > 0 shortens
		next = { ...target, out: v };
		nextCues = delta > 0 ? rippleRemove(cues, target.end - delta, target.end) : rippleInsert(cues, target.end, -delta);
	}
	const { start: _s, end: _e, ...clip } = next as PlacedClip;
	return { clips: clips.map((c) => (c.id === id ? clip : c)), cues: nextCues };
}

/** Moves a clip to position `toIndex` (0 = first). Each subtitle travels with the clip it starts in. */
export function moveClip(clips: Clip[], cues: Cue[], id: string, toIndex: number): { clips: Clip[]; cues: Cue[] } {
	const from = clips.findIndex((c) => c.id === id);
	const to = Math.max(0, Math.min(toIndex, clips.length - 1));
	if (from < 0 || from === to) return { clips, cues };
	const before = placeClips(clips);
	const reordered = [...clips];
	const [moved] = reordered.splice(from, 1);
	reordered.splice(to, 0, moved);
	const after = new Map(placeClips(reordered).map((c) => [c.id, c.start]));
	const moves = cues.map((cue) => {
		const owner = before.find((c) => cue.start >= c.start && cue.start < c.end);
		if (!owner) return cue;
		const shift = (after.get(owner.id) ?? owner.start) - owner.start;
		return shift ? { ...cue, start: cue.start + shift, end: cue.end + shift } : cue;
	});
	return { clips: reordered, cues: moves.sort((a, b) => a.start - b.start) };
}

/** Puts source-media cues onto the timeline wherever that media's clips are. */
export function placeSourceCues(source: SourceCue[], mediaId: string, clips: Clip[]): Cue[] {
	const out: Cue[] = [];
	for (const clip of placeClips(clips)) {
		if (clip.mediaId !== mediaId) continue;
		for (const cue of source) {
			const a = Math.max(cue.start, clip.in);
			const b = Math.min(cue.end, clip.out);
			if (b - a < 0.2) continue;
			out.push({ id: uid(), start: clip.start + (a - clip.in), end: clip.start + (b - clip.in), source: cue.text, text: "" });
		}
	}
	return out.sort((x, y) => x.start - y.start);
}

/** Index of the cue showing at t (cues sorted by start), or -1. */
export function cueAt(cues: Cue[], t: number): number {
	let lo = 0;
	let hi = cues.length - 1;
	let found = -1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (cues[mid].start <= t) {
			found = mid;
			lo = mid + 1;
		} else hi = mid - 1;
	}
	// Overlapping cues are rare; check a few back.
	for (let i = found; i >= 0 && i > found - 4; i--) if (t >= cues[i].start && t < cues[i].end) return i;
	return -1;
}

export function formatTime(seconds: number, withFrames = false): string {
	const s = Math.max(0, seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = Math.floor(s % 60);
	const base = `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
	return withFrames ? `${base}.${String(Math.floor((s % 1) * 100)).padStart(2, "0")}` : base;
}
