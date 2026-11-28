import type { PostFormat } from "@shared/batch";
import { COVER_SIZE, type CoverSettings, DEFAULT_COVER, defaultCoverTitle, episodeLabel, episodeNumber } from "@shared/cover";
import type { Project } from "@shared/types";
import { useEditor } from "@/state/store";
import { coverText, drawCover } from "./coverRender";
import { notify } from "./notify";
import { ensureFonts } from "./subtitleRender";
import { pictureBox } from "./objects";

// Episode covers for the open project: the settings it uses, the frame, and making and saving the JPEGs.

const state = () => useEditor.getState();

export const coverSettingsOf = (p: Project): CoverSettings => ({ ...DEFAULT_COVER, ...p.cover });

/**
 * The project's blur boxes as parts of the video picture (the cover shows the picture itself, not the output frame),
 * so hidden burned-in subtitles stay hidden on the cover too.
 */
export function coverBlurs(p: Project): { x: number; y: number; w: number; h: number }[] {
	const pic = pictureBox(p);
	return (p.objects ?? [])
		.filter((o) => o.kind === "blur" && !o.hidden && o.start === undefined && o.end === undefined)
		.map((o) => ({ x: (o.x - pic.x) / pic.w, y: (o.y - pic.y) / pic.h, w: o.w / pic.w, h: o.h / pic.h }));
}

/** The video the cover's frame comes from: the first clip's. */
const coverMedia = (p: Project) => p.media.find((m) => m.id === p.clips[0]?.mediaId) ?? p.media[0];

/** The episode number: set by hand, else read from the project's file or video name. */
export function coverEpisode(p: Project, projectPath: string | null): number | null {
	const s = coverSettingsOf(p);
	return s.episode ?? episodeNumber(projectPath, p.name, coverMedia(p)?.name);
}

/** What the cover says: the label ("ភាគ ៥") and the title. */
export function coverWords(p: Project, projectPath: string | null): { label: string; title: string } {
	const s = coverSettingsOf(p);
	const n = coverEpisode(p, projectPath);
	return { label: n === null ? "" : episodeLabel(n, s.label, s.customWord), title: s.title?.trim() || defaultCoverTitle(projectPath, p.name) };
}

export function setCover(patch: Partial<CoverSettings>, history = true): void {
	state().update((p) => ({ ...p, cover: { ...coverSettingsOf(p), ...patch } }), history);
}

/** The moment the cover uses: chosen, else a good one Kroma picks (and keeps, so the preview and the file match). */
export async function coverTime(): Promise<number> {
	const { project } = state();
	const s = coverSettingsOf(project);
	if (s.time !== undefined) return s.time;
	const media = coverMedia(project);
	if (!media) throw new Error("Add a video first.");
	const t = await window.kroma.pickCoverTime(media.path, media.duration);
	setCover({ time: t }, false);
	return t;
}

const frames = new Map<string, Promise<ImageBitmap>>();
/** The frame at `seconds` of the cover's video, as an image (cached). */
export function coverFrame(path: string, seconds: number): Promise<ImageBitmap> {
	const key = `${path}@${seconds.toFixed(2)}`;
	let f = frames.get(key);
	if (!f) {
		f = window.kroma.coverFrame(path, seconds).then((jpg) => createImageBitmap(new Blob([jpg as BlobPart], { type: "image/jpeg" })));
		f.catch(() => frames.delete(key));
		frames.set(key, f);
	}
	return f;
}

/**
 * Makes the covers in these formats and saves them next to the episode's exports. Returns the files (null when it
 * couldn't). `quiet` skips the notice (Batch says it itself).
 */
export async function makeCovers(formats: PostFormat[], quiet = false): Promise<Partial<Record<PostFormat, string>> | null> {
	const { project, projectPath } = state();
	const media = coverMedia(project);
	if (!media) {
		state().showToast("Add a video first.", "error");
		return null;
	}
	try {
		await ensureFonts();
		const time = await coverTime();
		const image = await coverFrame(media.path, time);
		const now = state().project;
		const settings = coverSettingsOf(now);
		const words = coverWords(now, projectPath);
		const saved: Partial<Record<PostFormat, string>> = {};
		for (const format of formats) {
			const { width, height } = COVER_SIZE[format];
			const canvas = new OffscreenCanvas(width, height);
			drawCover(canvas.getContext("2d")!, image, width, height, settings, coverText(settings, words.label, words.title), coverBlurs(now));
			const jpg = new Uint8Array(await (await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 })).arrayBuffer());
			saved[format] = await window.kroma.saveCover(projectPath, now.name, format, jpg);
		}
		state().update((p) => ({ ...p, covers: { ...p.covers, ...saved } }), false);
		const first = Object.values(saved)[0];
		if (!quiet && first) notify({ kind: "export", tone: "success", title: `Saved ${formats.length === 1 ? "the cover" : `${formats.length} covers`}${words.label ? ` · ${words.label}` : ""}`, detail: "Next to the exported videos.", action: { kind: "showFile", path: first } });
		return saved;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (!quiet) notify({ kind: "export", tone: "error", title: "Couldn't make the cover", detail: message });
		else throw err;
		return null;
	}
}
