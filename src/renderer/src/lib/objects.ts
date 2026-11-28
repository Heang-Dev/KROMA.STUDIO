import { ASPECT_SIZE, type Project, type VideoObject } from "@shared/types";
import { runTask, useEditor } from "@/state/store";
import { uid } from "./timeline";

// Objects over the video (blur boxes, logos, text), placed in fractions of the output frame so the preview and the
// export line up exactly. Text is drawn by the editor (Chromium shapes Khmer) and exported as an image.

export const TEXT_FONT = '"Kantumruy Pro Variable", "Geist Mono Variable", sans-serif';
const state = () => useEditor.getState();

export const objectsOf = (p: Project): VideoObject[] => p.objects ?? [];

export function isVisibleAt(o: VideoObject, t: number): boolean {
	return !o.hidden && (o.start === undefined || t >= o.start) && (o.end === undefined || t < o.end);
}

/** Where the main video's picture sits in the output frame (fractions), given the fit mode. */
export function pictureRect(project: Project): { x: number; y: number; w: number; h: number } {
	const media = project.media.find((m) => m.id === project.clips[0]?.mediaId);
	if (!media || !media.width || project.fit === "fill") return { x: 0, y: 0, w: 1, h: 1 };
	const frame = ASPECT_SIZE[project.aspect];
	const scale = Math.min(frame.width / media.width, frame.height / media.height);
	const w = (media.width * scale) / frame.width;
	const h = (media.height * scale) / frame.height;
	return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

function add(object: VideoObject): void {
	state().update((p) => ({ ...p, objects: [...objectsOf(p), object] }));
	state().select({ kind: "object", id: object.id });
}

export function updateObject(id: string, patch: Partial<VideoObject>, history = true): void {
	state().update((p) => ({ ...p, objects: objectsOf(p).map((o) => (o.id === id ? { ...o, ...patch } : o)) }), history);
}

export function removeObject(id: string): void {
	state().update((p) => ({ ...p, objects: objectsOf(p).filter((o) => o.id !== id) }));
	if (state().selection?.id === id) state().select(null);
}

/** A rectangle of the video picture (fractions) placed in the output frame (fractions), for any fit mode. */
/** Where the whole video picture sits in the output frame (fractions); with Crop it's bigger than the frame. */
export function pictureBox(project: Project): { x: number; y: number; w: number; h: number } {
	const media = project.media.find((m) => m.id === project.clips[0]?.mediaId);
	// Crop: the picture fills the frame and its overflow is cut off (centred).
	if (project.fit === "fill" && media?.width && media.height) {
		const frame = ASPECT_SIZE[project.aspect];
		const scale = Math.max(frame.width / media.width, frame.height / media.height);
		const w = (media.width * scale) / frame.width;
		const h = (media.height * scale) / frame.height;
		return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
	}
	return pictureRect(project);
}

export function pictureToFrame(project: Project, r: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
	const pic = pictureBox(project);
	const x0 = Math.max(0, pic.x + r.x * pic.w);
	const y0 = Math.max(0, pic.y + r.y * pic.h);
	const x1 = Math.min(1, pic.x + (r.x + r.w) * pic.w);
	const y1 = Math.min(1, pic.y + (r.y + r.h) * pic.h);
	return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

export const HIDE_SUBTITLES_NAME = "Hide original subtitles";

/**
 * Finds the video's burned-in subtitles and puts a blur box exactly over them (replacing one placed before). When
 * none are found, the box goes where subtitles usually are, and it says so. Returns whether they were found.
 */
export async function coverOriginalSubtitles(options: { quiet?: boolean } = {}): Promise<boolean> {
	const { project } = state();
	const media = project.media.find((m) => m.id === project.clips[0]?.mediaId);
	if (!media) {
		if (!options.quiet) state().showToast("Add a video first.", "error");
		return false;
	}
	// Wrapped, so "none found" (null) isn't taken for a failure (runTask gives null then).
	const result = await runTask(`hardsubs-${Date.now()}`, "Find burned-in subtitles", async (id) => ({ found: await window.kroma.findBurnedSubtitles(id, media.path, media.duration) }), { kind: "subtitles", done: false, failed: "Couldn't look for burned-in subtitles" });
	if (!result) return false;
	const { found } = result;
	const guess = { x: 0.08, y: 0.8, w: 0.84, h: 0.14 };
	const place = pictureToFrame(state().project, found ?? guess);
	const box: VideoObject = { id: uid(), kind: "blur", name: HIDE_SUBTITLES_NAME, ...place, opacity: 1, blur: 30 };
	state().update((p) => ({ ...p, objects: [...objectsOf(p).filter((o) => !(o.kind === "blur" && (o.name === HIDE_SUBTITLES_NAME || o.name === "Cover original subtitles"))), box] }));
	if (!options.quiet) state().select({ kind: "object", id: box.id });
	if (!options.quiet)
		state().showToast(
			found ? "Covered the burned-in subtitles" : "No burned-in subtitles found",
			found ? "info" : "error",
			found ? "The blur box sits over them for the whole video. Drag its edges to adjust." : "The box is where subtitles usually are: move it if needed, or delete it.",
		);
	return Boolean(found);
}

export function addBlurBox(): void {
	add({ id: uid(), kind: "blur", name: "Blur area", x: 0.35, y: 0.35, w: 0.3, h: 0.2, opacity: 1, blur: 20 });
}

export async function addImage(): Promise<void> {
	const path = await window.kroma.pickImage();
	if (!path) return;
	const size = await imageSize(path);
	const frame = ASPECT_SIZE[state().project.aspect];
	const w = 0.18;
	const h = w * (size.height / size.width) * (frame.width / frame.height);
	add({ id: uid(), kind: "image", name: path.split("/").pop() ?? "Image", path, x: 1 - w - 0.03, y: 0.04, w, h, opacity: 1 });
}

export function addText(): void {
	const object: VideoObject = { id: uid(), kind: "text", name: "Text", text: "Sponsored by …", color: "#ffffff", background: "rgba(0,0,0,0.55)", bold: true, x: 0.03, y: 0.04, w: 0.3, h: 0.065, opacity: 1 };
	add(fitTextWidth(object, state().project));
}

/** Text boxes grow and shrink with their text (the height sets the font size). */
export function fitTextWidth(o: VideoObject, project: Project): VideoObject {
	const frame = ASPECT_SIZE[project.aspect];
	const ctx = new OffscreenCanvas(1, 1).getContext("2d")!;
	const px = o.h * frame.height * 0.62;
	ctx.font = `${o.bold ? 700 : 500} ${px}px ${TEXT_FONT}`;
	const width = ctx.measureText(o.text || " ").width + px * (o.background ? 0.9 : 0.2);
	return { ...o, w: Math.min(1, width / frame.width) };
}

function imageSize(path: string): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
		img.onerror = () => reject(new Error("Couldn't open that image."));
		img.src = `kroma://media${path.split("/").map(encodeURIComponent).join("/")}`;
	});
}

/** Draws a text object exactly as the preview shows it, as a PNG of its box (output pixels). */
export async function renderTextPng(o: VideoObject, frame: { width: number; height: number }): Promise<Uint8Array> {
	const w = Math.max(2, Math.round(o.w * frame.width));
	const h = Math.max(2, Math.round(o.h * frame.height));
	const canvas = new OffscreenCanvas(w, h);
	const ctx = canvas.getContext("2d")!;
	if (o.background) {
		ctx.fillStyle = o.background;
		ctx.beginPath();
		ctx.roundRect(0, 0, w, h, h * 0.18);
		ctx.fill();
	}
	const px = h * 0.62;
	ctx.font = `${o.bold ? 700 : 500} ${px}px ${TEXT_FONT}`;
	ctx.fillStyle = o.color ?? "#ffffff";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	if (!o.background) {
		ctx.lineJoin = "round";
		ctx.strokeStyle = "rgba(0,0,0,0.8)";
		ctx.lineWidth = px * 0.14;
		ctx.strokeText(o.text ?? "", w / 2, h / 2);
	}
	ctx.fillText(o.text ?? "", w / 2, h / 2);
	return new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
}

/** The objects part of an export request, in output pixels. */
export async function objectsForExport(project: Project, frame: { width: number; height: number }) {
	const visible = objectsOf(project).filter((o) => !o.hidden);
	const px = (o: VideoObject) => ({ x: o.x * frame.width, y: o.y * frame.height, w: o.w * frame.width, h: o.h * frame.height, start: o.start, end: o.end });
	return {
		blurs: visible.filter((o) => o.kind === "blur").map((o) => ({ ...px(o), blur: o.blur ?? 20 })),
		images: await Promise.all(
			visible.filter((o) => o.kind !== "blur").map(async (o) => (o.kind === "image" ? { ...px(o), path: o.path, opacity: o.opacity } : { ...px(o), png: await renderTextPng(o, frame), opacity: o.opacity })),
		),
	};
}
