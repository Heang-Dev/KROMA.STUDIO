import { extractShareTitle } from "@shared/links";
import { toSrt } from "@shared/srt";
import { languageOf, languageOfVoice } from "@shared/languages";
import { ASPECT_SIZE, type Cue, type ExportQuality, type PlatformCaption, type PublishPlatform, type PublishRequest, type PublishResult, DEFAULT_VOICE, type ExportRequest, KHMER_VOICES, KVS_TEMPLATES, isKvsVoice, type MediaItem, type Project, type SourceCue, type VoiceCue, type VoiceSettings } from "@shared/types";
import { newProject, runTask, useEditor } from "@/state/store";
import { type PostChoice, type PostFormat, currentExport, neededFormats, publishRequest, recordExport } from "@shared/batch";
import { batchMode, noteBatchError } from "./batchMode";
import { notify } from "./notify";
import { objectsForExport } from "./objects";
import { captionWords, ensureFonts, renderBandPng, subtitleBand } from "./subtitleRender";
import { motionFrames, wordShares } from "@shared/captionMotion";
import { placeClips, placeSourceCues, totalDuration, uid } from "./timeline";
import { useGlossary } from "@/state/glossary";

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
	const result = await runTask(`download-${Date.now()}`, "Download", (id) => window.kroma.download(id, url.trim()), { kind: "downloads", done: false, retry: () => downloadFromLink(url) });
	if (!result) return null;
	// The title from a pasted share message ("【…】 https://…") wins; otherwise the site's own title.
	const title = extractShareTitle(url) ?? result.title;
	result.media.name = title;
	const firstVideo = state().project.clips.length === 0;
	addMedia([result.media]);
	if (firstVideo) state().update((p) => ({ ...p, name: title.slice(0, 80) }));
	const subs = Object.keys(result.media.siteSubtitles ?? {});
	notify({ kind: "downloads", tone: "success", title: `Downloaded ${short(title)}`, detail: subs.length ? `With the site's subtitles (${subs.join(", ")}).` : undefined });
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
	// Chinese first (most dramas), then English, then whatever language the site has.
	const order = ["zh-Hans", "zh-CN", "zh", "ai-zh", "zh-Hant", "zh-TW", "en", "en-US", "en-GB"];
	const key = order.find((k) => subs[k]) ?? Object.keys(subs).find((k) => k.startsWith("zh")) ?? Object.keys(subs).find((k) => k.startsWith("en")) ?? Object.keys(subs)[0];
	return key ? subs[key] : null;
}

/** Asks before replacing lines you already have (and may have fixed by hand). True to go ahead. */
function confirmReplace(count: number, what: string): boolean {
	// A batch was told what to do for every project: it doesn't ask.
	if (!count || batchMode.on) return true;
	return window.confirm(`${what}\n\nThis replaces the ${count} line${count === 1 ? "" : "s"} you have now, including any you fixed by hand. Undo (⌘Z / Ctrl+Z) brings them back.`);
}

/** Fills the subtitle track from the site's subtitles or cloud speech-to-text. Replaces existing cues of that media (after asking). */
export async function getSubtitles(media: MediaItem, source: { kind: "site"; path: string } | { kind: "cloud"; language: string }): Promise<boolean> {
	const { project } = state();
	const existing = project.cues.filter((c) => placeClips(project.clips).some((clip) => clip.mediaId === media.id && c.start >= clip.start && c.start < clip.end));
	if (!confirmReplace(existing.length, "Get the subtitles again?")) return false;
	let cues: SourceCue[] | null;
	let note: string | undefined;
	if (source.kind === "site") cues = await window.kroma.readSubtitles(source.path);
	else {
		const answer = await runTask(`asr-${Date.now()}`, "Speech to text", (id) => window.kroma.transcribe(id, media.path, media.duration, source.language), {
			kind: "subtitles",
			done: false,
			failed: "Speech to text failed",
			retry: () => getSubtitles(media, source),
		});
		cues = answer?.cues ?? null;
		note = answer?.note;
	}
	if (!cues) return false;
	if (!cues.length) {
		if (source.kind === "cloud") notify({ kind: "subtitles", tone: "error", title: "No speech was found", detail: short(media.name) });
		else state().showToast("No speech was found.", "error");
		return false;
	}
	state().update((p) => {
		const others = p.cues.filter((c) => !placeClips(p.clips).some((clip) => clip.mediaId === media.id && c.start >= clip.start && c.start < clip.end));
		return { ...p, cues: [...others, ...placeSourceCues(cues, media.id, p.clips)] };
	});
	// Speech to text is long work (notified, kept in the history); the site's own subtitles load at once.
	if (source.kind === "cloud") notify(note ? { kind: "subtitles", tone: "error", title: `${cues.length} subtitle lines ready, lower accuracy`, detail: note } : { kind: "subtitles", tone: "success", title: `${cues.length} subtitle lines ready`, detail: short(media.name) });
	else state().showToast(`${cues.length} subtitle lines ready.`);
	return true;
}

export async function translateCues(onlyMissing: boolean): Promise<boolean> {
	const { project } = state();
	const lines = project.cues.filter((c) => c.source.trim() && (!onlyMissing || !c.text.trim())).map((c) => ({ id: c.id, text: c.source, seconds: c.end - c.start }));
	if (!lines.length) {
		state().showToast(onlyMissing ? "Every line is already translated." : "There are no lines to translate yet.", "error");
		return false;
	}
	const lang = languageOf(project.language);
	const replacing = onlyMissing ? 0 : project.cues.filter((c) => c.source.trim() && c.text.trim()).length;
	if (!confirmReplace(replacing, `Translate every line to ${lang.name} again?`)) return false;
	const projectPath = state().projectPath;
	const glossary = await useGlossary.getState().load(projectPath);
	const answer = await runTask(`translate-${Date.now()}`, `Translate to ${lang.name}`, (id) => window.kroma.translate(id, lines, project.context, lang.code, projectPath), {
		kind: "subtitles",
		done: false,
		failed: "Translation failed",
		retry: () => translateCues(onlyMissing),
	});
	if (!answer) return false;
	const result = answer.translations;
	state().update((p) => ({ ...p, cues: p.cues.map((c) => (result[c.id] !== undefined ? { ...c, text: result[c.id] } : c)) }));
	const missed = lines.length - Object.keys(result).length;
	if (missed) notify({ kind: "subtitles", tone: "error", title: `Translated ${lines.length - missed} of ${lines.length} lines`, detail: `${missed} need another try.`, action: { label: "Translate missing", run: () => translateCues(true) } });
	else if (answer.fallback) notify({ kind: "subtitles", tone: "success", title: `Translated ${lines.length} lines to ${lang.name}`, detail: `Gemini was busy, so ${answer.fallback} lines used Google Translate. Press "Translate all" later for Gemini's better wording.` });
	else notify({ kind: "subtitles", tone: "success", title: `Translated ${lines.length} lines to ${lang.name}`, detail: short(project.name) });
	// The first translated episode of a series fills the glossary, so the next ones spell names the same way.
	if (projectPath && !glossary.length) void findGlossaryNames(true);
	return true;
}

/**
 * Finds the names and terms in the translated lines and adds them to the series glossary (spellings already there
 * stay). `quiet`: after a translation, only says something when it added names.
 */
export async function findGlossaryNames(quiet = false): Promise<number> {
	const { project, projectPath } = state();
	if (!projectPath) {
		if (!quiet) state().showToast("Save the project first: the glossary is shared by the projects in its folder.", "error");
		return 0;
	}
	const settings = await window.kroma.getSettings();
	if (!settings.hasGeminiKey && !settings.hasAnthropicKey) {
		if (!quiet) state().showToast("Finding names needs Gemini or Claude: add a key in Settings → Translation.", "error");
		return 0;
	}
	const pairs = project.cues.filter((c) => c.source.trim() && c.text.trim()).map((c) => ({ source: c.source, text: c.text }));
	if (!pairs.length) {
		if (!quiet) state().showToast("Translate the lines first: names are found in the translation.", "error");
		return 0;
	}
	// After a translation it runs quietly in the background (a failure only means no names this time).
	const found = quiet
		? await window.kroma.findGlossaryTerms(`glossary-${Date.now()}`, pairs, project.language).catch(() => null)
		: await runTask(`glossary-${Date.now()}`, "Find names for the glossary", (id) => window.kroma.findGlossaryTerms(id, pairs, project.language), { kind: "subtitles", done: false, failed: "Couldn't find names" });
	if (!found) return 0;
	const added = await useGlossary.getState().merge(projectPath, found);
	if (added) notify({ kind: "subtitles", tone: "success", title: `Added ${added} name${added === 1 ? "" : "s"} to the series glossary`, detail: "Every episode in this folder now translates them the same way (Translate → Series glossary)." });
	else if (!quiet) state().showToast("No new names: the glossary already has them.", "info");
	return added;
}

/** One click: site subtitles if any, otherwise cloud speech-to-text, then translation (with the chosen translator). */
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

/**
 * Exports the video; returns the file (null when cancelled or failed). `quiet` skips revealing it in Finder (posting).
 * `outPath` saves it there (batch) instead of a free name in the export folder.
 */
export async function exportVideo(quality: ExportQuality, quiet = false, outPath?: string): Promise<string | null> {
	if (!state().project.clips.length) {
		state().showToast("The timeline is empty.", "error");
		return null;
	}
	// A voice-over made before voices were removed automatically: remove them now, so no original speech is heard.
	if (voiceCues(state().project).length) await removeVoicesUnlessOff();
	const { project } = state();
	const target = outPath ?? (await window.kroma.saveVideoDialog(`${project.name} (${project.aspect.replace(":", "x")})`));
	if (!target) return null;
	const frame = ASPECT_SIZE[project.aspect];
	const band = subtitleBand(project.style, frame);

	const taskId = `export-${Date.now()}`;
	const result = await runTask(
		taskId,
		"Export",
		async (id) => {
		await ensureFonts();
		const visible = project.cues.filter((c) => (c.text || c.source).trim());
		const overlays: ExportRequest["overlays"] = [];
		for (let i = 0; i < visible.length; i++) {
			const cue = visible[i];
			// An animated caption is a few images (coming in) or one per word; a still one is one image.
			const shares = wordShares(captionWords(cue, project.style, frame));
			for (const part of motionFrames(project.style.animation, shares, cue.start, cue.end)) overlays.push({ start: part.start, end: part.end, png: await renderBandPng(cue, project.style, frame, band, part.motion) });
			if (i % 25 === 0) useEditor.getState().setTask({ id, label: "Export", progress: -1, message: `Drawing subtitles ${i}/${visible.length}`, status: "running" });
		}
		const mediaById = new Map(project.media.map((m) => [m.id, m]));
		const voiceNow = voiceSettings(project);
		const replacing = voiceNow.enabled && voiceNow.removeVoices;
		const clips = project.clips.map((c) => {
			const m = mediaById.get(c.mediaId)!;
			// With "Remove the original voices", the clip's sound is its voice-free background.
			return { path: m.path, in: c.in, out: c.out, hasAudio: m.hasAudio, audioPath: replacing ? voiceNow.backgrounds?.[m.id] : undefined };
		});
		const voice = voiceSettings(project);
		const voiceLines = voice.enabled ? voiceCues(project) : [];
		if (voice.enabled && voiceLines.length < project.cues.filter((c) => c.text.trim()).length) {
			useEditor.getState().showToast("Some lines have no voice yet; they'll be silent. Press 'Make voice-over' to fill them.", "error");
		}
		return window.kroma.exportVideo(id, {
			outPath: target,
			...frame,
			fit: project.fit,
			clips,
			overlays,
			bandTop: band.top,
			bandHeight: band.height,
			quality,
			objects: await objectsForExport(project, frame),
			voice: voiceLines.length ? { lines: voiceLines, originalVolume: replacing ? (voice.backgroundVolume ?? 1) : voice.originalVolume } : undefined,
		});
		},
		// Posting exports quietly and notifies once it's posted.
		{ kind: "export", done: false, failed: quiet ? "Export for posting failed" : "Export failed", retry: quiet ? undefined : () => exportVideo(quality, quiet) },
	);
	if (!result) return null;
	// Remember it (per format), so posting can reuse this file while nothing in the video changes.
	state().update((p) => recordExport(p, project.aspect, result, videoFingerprint(project)), false);
	if (!quiet) {
		notify({ kind: "export", tone: "success", title: `Exported ${short(project.name)} · ${Math.min(frame.width, frame.height)}p`, detail: result.replace(/^\/Users\/[^/]+/, "~"), action: { kind: "showFile", path: result } });
		void window.kroma.showInFolder(result);
	}
	return result;
}

/**
 * The video in one format: the current export of that format when nothing changed since, else exported now (the
 * project's format is switched for the export and back after). Returns the file, or null.
 */
export async function exportFormat(format: PostFormat, quality: ExportQuality, outPath?: string): Promise<string | null> {
	const original = state().project.aspect;
	const as = (aspect: Project["aspect"]) => state().update((p) => (p.aspect === aspect ? p : { ...p, aspect }), false);
	as(format);
	try {
		const now = state().project;
		const ready = currentExport(now, format, videoFingerprint(now));
		if (ready && (!outPath || ready === outPath) && (await window.kroma.fileExists(ready))) return ready;
		return await exportVideo(quality, true, outPath);
	} finally {
		as(original);
	}
}

/** Changes whenever anything that ends up in the exported video changes (not the posts or notes). */
// Projects are replaced, never changed in place, so each version's fingerprint is worked out once (the step bar asks
// on every playback tick).
const fingerprints = new WeakMap<Project, string>();
export function videoFingerprint(p: Project): string {
	const cached = fingerprints.get(p);
	if (cached) return cached;
	const text = JSON.stringify([p.aspect, p.fit, p.media.map((m) => m.path), p.clips, p.cues, p.style, p.objects, p.voice]);
	let h = 5381;
	for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
	const print = `${text.length}:${(h >>> 0).toString(36)}`;
	fingerprints.set(p, print);
	return print;
}

export async function exportSrt(which: "khmer" | "source"): Promise<void> {
	const { project } = state();
	const content = toSrt(project.cues.map((c) => ({ start: c.start, end: c.end, text: which === "khmer" ? c.text : c.source })));
	const path = await window.kroma.exportSrt(`${project.name}${which === "khmer" ? ".km" : ""}`, content);
	if (path) {
		state().showToast("Subtitles saved", "info", path.replace(/^\/Users\/[^/]+/, "~"));
		void window.kroma.showInFolder(path);
	}
}

export async function importSrt(): Promise<void> {
	const cues = await window.kroma.importSrt();
	if (!cues) return;
	if (!confirmReplace(state().project.cues.length, `Import ${cues.length} lines from this file?`)) return;
	const khmer = cues.some((c) => /[ក-៿]/.test(c.text));
	state().update((p) => ({
		...p,
		cues: cues.map((c) => ({ id: uid(), start: c.start, end: c.end, source: khmer ? "" : c.text, text: khmer ? c.text : "" })),
	}));
	state().showToast(`Imported ${cues.length} lines.`);
}

/** True (and says why) while a batch is using the editor. */
export function editorLocked(): boolean {
	const { locked } = state();
	if (locked) useEditor.getState().showToast("A batch is using the editor", "error", locked);
	return Boolean(locked);
}

export async function saveProject(saveAs = false): Promise<void> {
	if (editorLocked()) return;
	const { project, projectPath, markSaved, showToast } = state();
	const path = await window.kroma.saveProject(project, saveAs ? null : projectPath);
	if (path) {
		markSaved(path);
		showToast("Project saved.");
	}
}

export async function openProject(): Promise<void> {
	if (editorLocked()) return;
	const res = await window.kroma.openProject();
	if (res) state().load(res.project, res.path);
}

/** Opens a project file (from the Download Center) in the editor, asking first when the open one isn't saved. */
export async function openProjectAt(path: string): Promise<boolean> {
	if (editorLocked()) return false;
	const { dirty, projectPath, project, load, showToast } = state();
	if (dirty && project.clips.length && !window.confirm(projectPath ? "Open another project? Changes to this one since you last saved are lost." : "Open another project? The current one isn't saved to a file (it stays in autosave until you open another).")) return false;
	try {
		load(await window.kroma.readProject(path), path);
	} catch {
		showToast("Couldn't open the project", "error", "The file was moved or deleted.");
		return false;
	}
	useEditor.setState({ view: { name: "editor" }, panel: "media" });
	return true;
}

export const voiceSettings = (project: Project): VoiceSettings => project.voice ?? DEFAULT_VOICE;

/** The voice that speaks a line: its character's, or the project's default voice. */
export function voiceOf(project: Project, cue: Cue): string {
	const voice = voiceSettings(project);
	return (cue.speaker && voice.cast?.find((c) => c.name === cue.speaker)?.voice) || voice.voice;
}

/** What a recording depends on besides the text: the voice, and the speed for instant voices. */
export function voiceKey(project: Project, cue: Cue): string {
	const v = voiceOf(project, cue);
	return isKvsVoice(v) ? v : `${v}@${voiceSettings(project).rate}`;
}

/** A recording is current when its text and voice still match the line (older recordings have no voice: they match). */
const isCurrent = (project: Project, cue: Cue): boolean => {
	const line = voiceSettings(project).lines[cue.id];
	return Boolean(line && cue.text.trim() && line.text === cue.text.trim() && (line.voice === undefined || line.voice === voiceKey(project, cue)));
};

/** Lines whose Khmer text has no up-to-date voice recording. */
export function linesNeedingVoice(project: Project): { id: string; text: string }[] {
	return project.cues.filter((c) => c.text.trim() && !isCurrent(project, c)).map((c) => ({ id: c.id, text: c.text.trim() }));
}

/** The voice lines to play or export, each allowed to run until the next line starts. */
export function voiceCues(project: Project): VoiceCue[] {
	const voice = voiceSettings(project);
	const total = totalDuration(project.clips);
	const spoken = project.cues.filter((c) => isCurrent(project, c));
	return spoken.map((c, i) => ({
		id: c.id,
		start: c.start,
		slotEnd: Math.min(spoken[i + 1]?.start ?? total, total),
		path: voice.lines[c.id].path,
		duration: voice.lines[c.id].duration,
	}));
}

/** Recordings without a voice key were made with the voice the line has now; stamp them so a change re-voices only the lines it affects. */
function stamped(p: Project): Project {
	const current = voiceSettings(p);
	const lines = Object.fromEntries(
		Object.entries(current.lines).map(([id, line]) => {
			const cue = p.cues.find((c) => c.id === id);
			return [id, line.voice || !cue ? line : { ...line, voice: voiceKey(p, cue) }];
		}),
	);
	return { ...p, voice: { ...current, lines } };
}

/** Changes anything that decides which voice speaks a line (voices, cast, speakers). */
const updateVoicing = (fn: (p: Project) => Project) => state().update((p) => fn(stamped(p)));

/** After deleting a voice: the project and any character that used it move to the language's first instant voice. */
export function forgetVoice(voice: string): void {
	const { project } = state();
	const v = voiceSettings(project);
	const fallback = languageOf(project.language).voices[0].id;
	const usedByCast = v.cast?.some((c) => c.voice === voice) ?? false;
	if (v.voice !== voice && !usedByCast) return;
	setVoice({ ...(v.voice === voice ? { voice: fallback } : {}), ...(usedByCast ? { cast: v.cast?.map((c) => (c.voice === voice ? { ...c, voice: fallback } : c)) } : {}) });
}

export function setVoice(patch: Partial<VoiceSettings>): void {
	updateVoicing((p) => ({ ...p, voice: { ...voiceSettings(p), ...patch } }));
}

/** Makes the voice-free background (music and effects) of every video on the timeline, then switches it on. */
export async function removeOriginalVoices(quality: "fast" | "best"): Promise<boolean> {
	const { project } = state();
	const used = project.media.filter((m) => m.hasAudio && project.clips.some((c) => c.mediaId === m.id));
	if (!used.length) {
		state().showToast("Add a video with sound first.", "error");
		return false;
	}
	const backgrounds: Record<string, string> = { ...(voiceSettings(project).backgrounds ?? {}) };
	for (const media of used) {
		const path = await runTask(`separate-${Date.now()}`, "Remove voices", (id) => window.kroma.removeVoices(id, media.path, media.duration, quality), {
			kind: "voices",
			done: false,
			failed: "Couldn't remove the original voices",
			retry: () => removeOriginalVoices(quality),
		});
		if (!path) return false;
		backgrounds[media.id] = path;
	}
	state().update((p) => ({ ...p, voice: { ...voiceSettings(p), removeVoices: true, separation: quality, backgrounds, enabled: true } }));
	notify({ kind: "voices", tone: "success", title: "Original voices removed", detail: "The voice-over now plays over the music and effects only." });
	return true;
}

/** Speaks every line that has no current recording. True when every line has its voice. */
export async function makeVoiceOver(): Promise<boolean> {
	const { project } = state();
	const lines = linesNeedingVoice(project);
	if (!lines.length) {
		const has = project.cues.some((c) => c.text.trim());
		// Nothing left to voice is success for a batch (a retry after the voice-over finished).
		if (batchMode.on && has) return true;
		state().showToast(has ? "Every line already has a voice." : `Make the ${languageOf(project.language).name} subtitles first.`, "error");
		return false;
	}
	// One run per voice: each character's lines are spoken together, so the voice stays the same.
	const groups = new Map<string, { id: string; text: string }[]>();
	for (const line of lines) {
		const v = voiceOf(project, project.cues.find((c) => c.id === line.id)!);
		groups.set(v, [...(groups.get(v) ?? []), line]);
	}
	const voice = voiceSettings(project);
	let voiced = 0;
	let k = 0;
	for (const [v, group] of groups) {
		k += 1;
		const who = voice.cast?.filter((c) => c.voice === v).map((c) => c.name).join(", ");
		const label = groups.size > 1 ? `Voice-over ${k}/${groups.size}${who ? `: ${who}` : ""}` : "Voice-over";
		const result = await runTask(`voice-${Date.now()}`, label, (id) => window.kroma.voiceOver(id, group, v, voice.rate), { kind: "voices", done: false, failed: `${label} failed`, retry: () => makeVoiceOver() });
		if (!result) break;
		voiced += Object.keys(result).length;
		state().update((p) => {
			const current = voiceSettings(p);
			const stamped = Object.fromEntries(Object.entries(result).map(([id, line]) => [id, { ...line, voice: voiceKey(p, p.cues.find((c) => c.id === id)!) }]));
			return { ...p, voice: { ...current, enabled: true, lines: { ...current.lines, ...stamped } } };
		});
	}
	if (!voiced) return false;
	const missed = lines.length - voiced;
	notify(
		missed
			? { kind: "voices", tone: "error", title: `Voiced ${voiced} of ${lines.length} lines`, detail: `${missed} not done yet.`, action: { label: "Finish them", run: () => makeVoiceOver() } }
			: { kind: "voices", tone: "success", title: `Voice-over ready · ${voiced} lines`, detail: short(project.name) },
	);
	await removeVoicesUnlessOff();
	if (missed) noteBatchError(`${missed} of ${lines.length} lines have no voice yet.`);
	return !missed;
}

/**
 * A voice-over replaces the original speech, so the original voices are removed too (music and effects stay),
 * unless the creator switched that off. Runs once per video; later it's instant (cached).
 */
async function removeVoicesUnlessOff(): Promise<void> {
	const voice = voiceSettings(state().project);
	if (!voice.enabled || voice.removeVoices !== undefined) return;
	const ok = await removeOriginalVoices(voice.separation ?? "fast");
	if (!ok) state().showToast("The original voices are still in", "error", "Removing them didn't work, so the original sound plays quietly under the voice-over. Try again from Voice → Mix.");
}

/** The voices the character finder may choose from: the language's instant voices, and the engine's templates for Khmer (not clones of real people). */
function castableVoices(languageCode?: string): { id: string; label: string; description: string }[] {
	const lang = languageOf(languageCode);
	return [
		...lang.voices.map((v) => ({ id: v.id, label: v.label, description: `${v.label.includes("female") ? "adult woman" : "adult man"}, plain and quick (instant voice)` })),
		...(lang.code === "km" ? KVS_TEMPLATES.map((t) => ({ id: `kvs-design:${t.name}`, label: t.name, description: t.description })) : []),
	];
}

/**
 * Switches the language the subtitles are translated into. Instant voices of the old language move to the new
 * language's voice of the same gender; existing translations stay until "Translate" runs again.
 */
export function setLanguage(code: string): void {
	const lang = languageOf(code);
	const swap = (voice: string) => {
		const from = languageOfVoice(voice);
		if (!from || from.code === lang.code) return voice;
		const female = from.voices.find((v) => v.id === voice)?.label.includes("female");
		return (lang.voices.find((v) => v.label.includes("female") === female) ?? lang.voices[0]).id;
	};
	updateVoicing((p) => {
		const voice = voiceSettings(p);
		return { ...p, language: lang.code, voice: { ...voice, voice: swap(voice.voice), cast: voice.cast?.map((c) => ({ ...c, voice: swap(c.voice) })) } };
	});
}

/** Works out who says each line and gives each character a voice. */
export async function findCharacters(): Promise<boolean> {
	const { project } = state();
	const lines = project.cues.filter((c) => (c.source || c.text).trim()).map((c) => ({ id: c.id, text: (c.source || c.text).trim(), start: c.start }));
	if (!lines.length) {
		state().showToast("Make the subtitles first.", "error");
		return false;
	}
	// Prefer the voice family already in use: designed voices when the default is one, instant ones otherwise.
	const all = castableVoices(project.language);
	const kvs = isKvsVoice(voiceSettings(project).voice) && all.some((v) => isKvsVoice(v.id));
	const voices = all.filter((v) => isKvsVoice(v.id) === kvs);
	const result = await runTask(`characters-${Date.now()}`, "Find characters", (id) => window.kroma.findCharacters(id, lines, voices, project.context), {
		kind: "voices",
		done: false,
		failed: "Couldn't find the characters",
		retry: () => findCharacters(),
	});
	if (!result) return false;
	updateVoicing((p) => {
		const current = voiceSettings(p);
		// Keep voices the creator already chose for characters with the same name.
		const cast = result.characters.map((c) => ({ ...c, voice: current.cast?.find((x) => x.name === c.name)?.voice ?? c.voice }));
		return { ...p, cues: p.cues.map((c) => ({ ...c, speaker: result.speakers[c.id] ?? c.speaker })), voice: { ...current, cast } };
	});
	notify({ kind: "voices", tone: "success", title: `Found ${result.characters.length} character${result.characters.length === 1 ? "" : "s"}`, detail: "Each has a voice. Change any voice in the list, or who says a line in the subtitles." });
	return true;
}

export function setCharacterVoice(name: string, voice: string): void {
	setVoice({ cast: (voiceSettings(state().project).cast ?? []).map((c) => (c.name === name ? { ...c, voice } : c)) });
}

export function renameCharacter(from: string, to: string): void {
	const name = to.trim();
	if (!name || name === from) return;
	updateVoicing((p) => {
		const current = voiceSettings(p);
		const exists = current.cast?.some((c) => c.name === name);
		const cast = exists ? current.cast!.filter((c) => c.name !== from) : current.cast!.map((c) => (c.name === from ? { ...c, name } : c));
		return { ...p, cues: p.cues.map((c) => (c.speaker === from ? { ...c, speaker: name } : c)), voice: { ...current, cast } };
	});
}

/** Removes a character; their lines go back to the default voice. */
export function removeCharacter(name: string): void {
	updateVoicing((p) => {
		const current = voiceSettings(p);
		return { ...p, cues: p.cues.map((c) => (c.speaker === name ? { ...c, speaker: undefined } : c)), voice: { ...current, cast: current.cast?.filter((c) => c.name !== name) } };
	});
}

export function addCharacter(): string {
	const current = voiceSettings(state().project);
	const cast = current.cast ?? [];
	let n = cast.length + 1;
	while (cast.some((c) => c.name === `Character ${n}`)) n += 1;
	const name = `Character ${n}`;
	setVoice({ cast: [...cast, { name, voice: current.voice }] });
	return name;
}

export function setSpeaker(cueId: string, speaker: string | undefined): void {
	updateVoicing((p) => ({ ...p, cues: p.cues.map((c) => (c.id === cueId ? { ...c, speaker } : c)) }));
}

export function startNewProject(): void {
	if (editorLocked()) return;
	const { dirty, projectPath, load } = state();
	if (dirty && !projectPath && state().project.clips.length && !window.confirm("Start a new project? The current one isn't saved to a file (it stays in autosave until you start another).")) return;
	load(newProject(), null);
}

/** Writes the open project to the autosave file a moment after each change. */
export function startAutosave(): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const unsubscribe = useEditor.subscribe((s, prev) => {
		if (s.project === prev.project && s.projectPath === prev.projectPath) return;
		// A batch borrows the editor for its projects: the autosave keeps your own project meanwhile.
		if (s.locked || prev.locked) return;
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

/** How many translated lines contain the text. */
export function countInLines(project: Project, find: string): number {
	return find ? project.cues.filter((c) => c.text.includes(find)).length : 0;
}

/**
 * Replaces text in every translated line (one undo step). With `remember`, the translator's notes get the fix, so
 * the next translation writes it right.
 */
export function replaceInLines(find: string, replace: string, remember: boolean): number {
	if (!find) return 0;
	const count = countInLines(state().project, find);
	if (!count) return 0;
	state().update((p) => {
		const note = `Write "${replace}", never "${find}".`;
		const context = remember && !p.context.includes(note) ? `${p.context.trim()}\n${note}`.trim() : p.context;
		return { ...p, context, cues: p.cues.map((c) => (c.text.includes(find) ? { ...c, text: c.text.split(find).join(replace) } : c)) };
	});
	return count;
}

// ── Posting ──

/** Writes the YouTube, Facebook and TikTok posts with AI and keeps them in the project. */
export async function writePosts(): Promise<boolean> {
	const { project } = state();
	const transcript = project.cues.map((c) => c.text.trim()).filter(Boolean).join("\n");
	if (!transcript) {
		state().showToast(`Make the ${languageOf(project.language).name} subtitles first.`, "error");
		return false;
	}
	const posts = await runTask(`captions-${Date.now()}`, "Write posts", (id) => window.kroma.captions(id, { transcript, title: project.name, context: project.context, language: project.language }), {
		done: () => ({ kind: "export", tone: "success", title: "Posts written", detail: `YouTube, Facebook and TikTok · ${short(project.name)}` }),
		failed: "Couldn't write the posts",
		retry: () => writePosts(),
	});
	if (!posts) return false;
	state().update((p) => ({ ...p, posts }));
	return true;
}

export function updatePost(platform: PlatformCaption["platform"], patch: Partial<PlatformCaption>): void {
	state().update((p) => ({ ...p, posts: (p.posts ?? []).map((x) => (x.platform === platform ? { ...x, ...patch } : x)) }), false);
}

export interface PublishOptions extends PostChoice {
	quality: ExportQuality;
}

/**
 * One click: writes the posts if needed, exports each format the chosen platforms need (or reuses an export when
 * nothing changed), uploads each platform its own file through Upload-Post, and records where it went. Returns the
 * results (null when it didn't post).
 */
export async function publishVideo(options: PublishOptions): Promise<PublishResult[] | null> {
	const settings = await window.kroma.getSettings();
	if (!settings.hasPostKey) {
		state().showToast("Connect your accounts first", "error", "Add your Upload-Post key in Settings → Posting.");
		if (!batchMode.on) state().openSettings("posting");
		return null;
	}
	if (!options.platforms.length) {
		state().showToast("Choose where to post.", "error");
		return null;
	}
	if (!state().project.posts?.length && !(await writePosts())) return null;

	let pageId = settings.facebookPageId;
	if (options.platforms.includes("facebook") && !pageId) {
		const pages = await window.kroma.facebookPages().catch(() => []);
		if (pages.length !== 1) {
			state().showToast("Choose your Facebook Page", "error", "Pick the Page to post to in Settings → Posting.");
			if (!batchMode.on) state().openSettings("posting");
			return null;
		}
		pageId = pages[0].id;
	}

	// Each format once, however many platforms share it.
	const files: Partial<Record<PostFormat, string>> = {};
	for (const format of neededFormats(options)) {
		const file = await exportFormat(format, options.quality);
		if (!file) return null;
		files[format] = file;
	}

	const project = state().project;
	const req: PublishRequest = publishRequest({
		name: project.name,
		posts: project.posts ?? [],
		choice: options,
		files,
		duration: totalDuration(project.clips),
		profile: settings.postProfile,
		pageId,
		key: `${videoFingerprint(project)}-${Date.now()}`,
	});
	const results = await runTask(`publish-${Date.now()}`, "Post", (id) => window.kroma.publish(id, req), { kind: "export", done: false, failed: "Posting failed", retry: () => publishVideo(options) });
	if (!results) return null;
	state().update((p) => ({ ...p, published: [...(p.published ?? []), { at: Date.now(), results }] }), false);
	const failed = results.filter((r) => r.state === "failed");
	const names = (rs: PublishResult[]) => rs.map((r) => PLATFORM_NAMES[r.platform]).join(", ");
	if (failed.length) notify({ kind: "export", tone: "error", title: `Not posted to ${names(failed)}`, detail: failed[0].message ?? "See the Post panel for details." });
	else notify({ kind: "export", tone: "success", title: `Posted ${short(project.name)} to ${names(results)}`, detail: options.tiktokMode === "draft" && options.platforms.includes("tiktok") ? "TikTok: open the app and post it from your drafts." : undefined });
	return results;
}

/** A name short enough for a notification title. */
export function short(text: string, max = 48): string {
	const t = text.trim();
	return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export const PLATFORM_NAMES: Record<PublishPlatform, string> = { youtube: "YouTube", facebook: "Facebook", tiktok: "TikTok" };
