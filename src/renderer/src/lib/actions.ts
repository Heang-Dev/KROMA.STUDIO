import { toSrt } from "@shared/srt";
import { ASPECT_SIZE, DEFAULT_VOICE, type ExportRequest, type MediaItem, type Project, type SourceCue, type VoiceCue, type VoiceSettings } from "@shared/types";
import { newProject, runTask, useEditor } from "@/state/store";
import { ensureFonts, renderBandPng, subtitleBand } from "./subtitleRender";
import { placeClips, placeSourceCues, totalDuration, uid } from "./timeline";

const state = () => useEditor.getState();

export function addMedia(items: MediaItem[]): void {
	const playable = items.filter((m) => m.width > 0);
	if (playable.length < items.length) state().showToast("Audio-only files can't go on the video track yet.", "error");
	if (!playable.length) return;
	state().update((p) => {
		const first = p.clips.length === 0;
		const media = [...p.media, ...playable];
		// The first video goes straight onto the timeline, and names the project.
		const clips = first ? [...p.clips, ...playable.map((m) => ({ id: uid(), mediaId: m.id, in: 0, out: m.duration }))] : p.clips;
		const aspect = first && playable[0].height > playable[0].width ? "9:16" : p.aspect;
		const name = p.name === "Untitled" ? playable[0].name.replace(/\.[^.]+$/, "").slice(0, 60) : p.name;
		return { ...p, media, clips, aspect, name };
	});
}

export function appendToTimeline(media: MediaItem): void {
	state().update((p) => ({ ...p, clips: [...p.clips, { id: uid(), mediaId: media.id, in: 0, out: media.duration }] }));
}

export async function importFiles(): Promise<void> {
	const items = await window.kroma.openMedia();
	addMedia(items);
}

export async function downloadFromLink(url: string): Promise<MediaItem | null> {
	const result = await runTask(`download-${Date.now()}`, "Download", (id) => window.kroma.download(id, url.trim()));
	if (!result) return null;
	addMedia([result.media]);
	const subs = Object.keys(result.media.siteSubtitles ?? {});
	state().showToast(subs.length ? `Downloaded, with the site's subtitles (${subs.join(", ")}).` : "Downloaded.");
	return result.media;
}

/** The media whose speech we work on: the first clip's media. */
export function mainMedia(): MediaItem | null {
	const { project } = state();
	const first = project.clips[0];
	return project.media.find((m) => m.id === first?.mediaId) ?? null;
}

export function preferredSiteSubtitle(media: MediaItem): string | null {
	const subs = media.siteSubtitles ?? {};
	const order = ["zh-Hans", "zh-CN", "zh", "ai-zh", "zh-Hant", "zh-TW"];
	const key = order.find((k) => subs[k]) ?? Object.keys(subs).find((k) => k.startsWith("zh"));
	return key ? subs[key] : null;
}

/** Fills the subtitle track from the site's subtitles or cloud speech-to-text. Replaces existing cues of that media. */
export async function getSubtitles(media: MediaItem, source: { kind: "site"; path: string } | { kind: "cloud"; language: string }): Promise<boolean> {
	let cues: SourceCue[] | null;
	let note: string | undefined;
	if (source.kind === "site") cues = await window.kroma.readSubtitles(source.path);
	else {
		const answer = await runTask(`asr-${Date.now()}`, "Speech to text", (id) => window.kroma.transcribe(id, media.path, media.duration, source.language));
		cues = answer?.cues ?? null;
		note = answer?.note;
	}
	if (!cues) return false;
	if (!cues.length) {
		state().showToast("No speech was found.", "error");
		return false;
	}
	state().update((p) => {
		const others = p.cues.filter((c) => !placeClips(p.clips).some((clip) => clip.mediaId === media.id && c.start >= clip.start && c.start < clip.end));
		return { ...p, cues: [...others, ...placeSourceCues(cues, media.id, p.clips)] };
	});
	if (note) state().showToast(`${cues.length} subtitle lines ready, lower accuracy`, "error", note);
	else state().showToast(`${cues.length} subtitle lines ready.`);
	return true;
}

export async function translateCues(onlyMissing: boolean): Promise<boolean> {
	const { project } = state();
	const lines = project.cues.filter((c) => c.source.trim() && (!onlyMissing || !c.text.trim())).map((c) => ({ id: c.id, text: c.source }));
	if (!lines.length) {
		state().showToast(onlyMissing ? "Every line is already translated." : "There are no lines to translate yet.", "error");
		return false;
	}
	const answer = await runTask(`translate-${Date.now()}`, "Translate to Khmer", (id) => window.kroma.translate(id, lines, project.context));
	if (!answer) return false;
	const result = answer.translations;
	state().update((p) => ({ ...p, cues: p.cues.map((c) => (result[c.id] !== undefined ? { ...c, text: result[c.id] } : c)) }));
	const missed = lines.length - Object.keys(result).length;
	if (missed) state().showToast(`Translated ${lines.length - missed} of ${lines.length} lines`, "error", `${missed} need another try: press "Translate missing".`);
	else if (answer.fallback) state().showToast(`Translated ${lines.length} lines to Khmer`, "info", `Gemini was busy, so ${answer.fallback} lines used Google Translate. Press "Translate all" later for Gemini's better wording.`);
	else state().showToast(`Translated ${lines.length} lines to Khmer.`);
	return true;
}

/** One click: site subtitles if any, otherwise cloud speech-to-text, then Claude translation. */
export async function autoKhmer(language: string): Promise<void> {
	const media = mainMedia();
	if (!media) {
		state().showToast("Add a video first.", "error");
		return;
	}
	const site = preferredSiteSubtitle(media);
	const ok = await getSubtitles(media, site ? { kind: "site", path: site } : { kind: "cloud", language });
	if (ok) await translateCues(false);
}

export async function exportVideo(quality: "fast" | "high"): Promise<void> {
	const { project } = state();
	if (!project.clips.length) return state().showToast("The timeline is empty.", "error");
	const outPath = await window.kroma.saveVideoDialog(`${project.name} (${project.aspect.replace(":", "x")})`);
	if (!outPath) return;
	const frame = ASPECT_SIZE[project.aspect];
	const band = subtitleBand(project.style, frame);

	const taskId = `export-${Date.now()}`;
	const result = await runTask(taskId, "Export", async (id) => {
		await ensureFonts();
		const visible = project.cues.filter((c) => (c.text || c.source).trim());
		const overlays: ExportRequest["overlays"] = [];
		for (let i = 0; i < visible.length; i++) {
			const cue = visible[i];
			overlays.push({ start: cue.start, end: cue.end, png: await renderBandPng(cue, project.style, frame, band) });
			if (i % 25 === 0) useEditor.getState().setTask({ id, label: "Export", progress: -1, message: `Drawing subtitles ${i}/${visible.length}`, status: "running" });
		}
		const mediaById = new Map(project.media.map((m) => [m.id, m]));
		const clips = project.clips.map((c) => {
			const m = mediaById.get(c.mediaId)!;
			return { path: m.path, in: c.in, out: c.out, hasAudio: m.hasAudio };
		});
		const voice = voiceSettings(project);
		const voiceLines = voice.enabled ? voiceCues(project) : [];
		if (voice.enabled && voiceLines.length < project.cues.filter((c) => c.text.trim()).length) {
			useEditor.getState().showToast("Some lines have no voice yet; they'll be silent. Press 'Make voice-over' to fill them.", "error");
		}
		return window.kroma.exportVideo(id, {
			outPath,
			...frame,
			fit: project.fit,
			clips,
			overlays,
			bandTop: band.top,
			bandHeight: band.height,
			quality,
			voice: voiceLines.length ? { lines: voiceLines, originalVolume: voice.originalVolume } : undefined,
		});
	});
	if (result) {
		state().showToast("Export finished.");
		void window.kroma.showInFolder(result);
	}
	return;
}

export async function exportSrt(which: "khmer" | "source"): Promise<void> {
	const { project } = state();
	const content = toSrt(project.cues.map((c) => ({ start: c.start, end: c.end, text: which === "khmer" ? c.text : c.source })));
	const path = await window.kroma.exportSrt(`${project.name}${which === "khmer" ? ".km" : ""}`, content);
	if (path) state().showToast("Subtitles saved.");
}

export async function importSrt(): Promise<void> {
	const cues = await window.kroma.importSrt();
	if (!cues) return;
	const khmer = cues.some((c) => /[ក-៿]/.test(c.text));
	state().update((p) => ({
		...p,
		cues: cues.map((c) => ({ id: uid(), start: c.start, end: c.end, source: khmer ? "" : c.text, text: khmer ? c.text : "" })),
	}));
	state().showToast(`Imported ${cues.length} lines.`);
}

export async function saveProject(saveAs = false): Promise<void> {
	const { project, projectPath, markSaved, showToast } = state();
	const path = await window.kroma.saveProject(project, saveAs ? null : projectPath);
	if (path) {
		markSaved(path);
		showToast("Project saved.");
	}
}

export async function openProject(): Promise<void> {
	const res = await window.kroma.openProject();
	if (res) state().load(res.project, res.path);
}

export const voiceSettings = (project: Project): VoiceSettings => project.voice ?? DEFAULT_VOICE;

/** Lines whose Khmer text has no up-to-date voice recording. */
export function linesNeedingVoice(project: Project): { id: string; text: string }[] {
	const voice = voiceSettings(project);
	return project.cues.filter((c) => c.text.trim() && voice.lines[c.id]?.text !== c.text.trim()).map((c) => ({ id: c.id, text: c.text.trim() }));
}

/** The voice lines to play or export, each allowed to run until the next line starts. */
export function voiceCues(project: Project): VoiceCue[] {
	const voice = voiceSettings(project);
	const total = totalDuration(project.clips);
	const spoken = project.cues.filter((c) => voice.lines[c.id]?.text === c.text.trim() && c.text.trim());
	return spoken.map((c, i) => ({
		id: c.id,
		start: c.start,
		slotEnd: Math.min(spoken[i + 1]?.start ?? total, total),
		path: voice.lines[c.id].path,
		duration: voice.lines[c.id].duration,
	}));
}

export function setVoice(patch: Partial<VoiceSettings>): void {
	state().update((p) => {
		const current = voiceSettings(p);
		// A different voice or speed means every line must be spoken again.
		const reset = (patch.voice && patch.voice !== current.voice) || (patch.rate !== undefined && patch.rate !== current.rate);
		return { ...p, voice: { ...current, ...patch, lines: reset ? {} : (patch.lines ?? current.lines) } };
	});
}

export async function makeVoiceOver(): Promise<void> {
	const { project } = state();
	const lines = linesNeedingVoice(project);
	if (!lines.length) {
		state().showToast(project.cues.some((c) => c.text.trim()) ? "Every line already has a voice." : "Make the Khmer subtitles first.", "error");
		return;
	}
	const voice = voiceSettings(project);
	const result = await runTask(`voice-${Date.now()}`, "Voice-over", (id) => window.kroma.voiceOver(id, lines, voice.voice, voice.rate));
	if (!result) return;
	state().update((p) => {
		const current = voiceSettings(p);
		return { ...p, voice: { ...current, enabled: true, lines: { ...current.lines, ...result } } };
	});
	const missed = lines.length - Object.keys(result).length;
	state().showToast(missed ? `Voiced ${lines.length - missed} lines; ${missed} failed. Press again to retry them.` : `Voiced ${lines.length} lines.`, missed ? "error" : "info");
}

export function startNewProject(): void {
	const { dirty, projectPath, load } = state();
	if (dirty && !projectPath && state().project.clips.length && !window.confirm("Start a new project? The current one isn't saved to a file (it stays in autosave until you start another).")) return;
	load(newProject(), null);
}

/** Writes the open project to the autosave file a moment after each change. */
export function startAutosave(): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const unsubscribe = useEditor.subscribe((s, prev) => {
		if (s.project === prev.project && s.projectPath === prev.projectPath) return;
		clearTimeout(timer);
		timer = setTimeout(() => void window.kroma.autosave(s.project, s.projectPath), 1500);
	});
	return () => {
		clearTimeout(timer);
		unsubscribe();
	};
}

export async function restoreAutosave(): Promise<void> {
	const saved = await window.kroma.readAutosave();
	if (!saved?.project?.clips?.length) return;
	state().load(saved.project, saved.path);
	if (saved.path) state().markSaved(saved.path);
	else useEditor.setState({ dirty: true });
	state().showToast("Reopened your last project.");
}
