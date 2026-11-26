import { ASPECT_SIZE, type Project, type VideoObject } from "@shared/types";
import { useEditor } from "@/state/store";
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

/** A blur box over the band where burned-in subtitles usually are (lower part of the picture). */
export function coverOriginalSubtitles(): void {
	const r = pictureRect(state().project);
	add({ id: uid(), kind: "blur", name: "Cover original subtitles", x: r.x + r.w * 0.08, y: r.y + r.h * 0.8, w: r.w * 0.84, h: r.h * 0.14, opacity: 1, blur: 24 });
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
