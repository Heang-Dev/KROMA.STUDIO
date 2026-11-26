import { extractShareTitle } from "@shared/links";
import { toSrt } from "@shared/srt";
import { languageOf, languageOfVoice } from "@shared/languages";
import { ASPECT_SIZE, type Cue, type ExportQuality, type PlatformCaption, type PublishPlatform, type PublishRequest, type PublishResult, DEFAULT_VOICE, type ExportRequest, KHMER_VOICES, KVS_TEMPLATES, isKvsVoice, type MediaItem, type Project, type SourceCue, type VoiceCue, type VoiceSettings } from "@shared/types";
import { newProject, runTask, useEditor } from "@/state/store";
import { objectsForExport } from "./objects";
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
	// The title from a pasted share message ("【…】 https://…") wins; otherwise the site's own title.
	const title = extractShareTitle(url) ?? result.title;
	result.media.name = title;
	const firstVideo = state().project.clips.length === 0;
	addMedia([result.media]);
	if (firstVideo) state().update((p) => ({ ...p, name: title.slice(0, 80) }));
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
	const lines = project.cues.filter((c) => c.source.trim() && (!onlyMissing || !c.text.trim())).map((c) => ({ id: c.id, text: c.source, seconds: c.end - c.start }));
	if (!lines.length) {
		state().showToast(onlyMissing ? "Every line is already translated." : "There are no lines to translate yet.", "error");
		return false;
	}
	const lang = languageOf(project.language);
	const answer = await runTask(`translate-${Date.now()}`, `Translate to ${lang.name}`, (id) => window.kroma.translate(id, lines, project.context, lang.code));
	if (!answer) return false;
	const result = answer.translations;
	state().update((p) => ({ ...p, cues: p.cues.map((c) => (result[c.id] !== undefined ? { ...c, text: result[c.id] } : c)) }));
	const missed = lines.length - Object.keys(result).length;
	if (missed) state().showToast(`Translated ${lines.length - missed} of ${lines.length} lines`, "error", `${missed} need another try: press "Translate missing".`);
	else if (answer.fallback) state().showToast(`Translated ${lines.length} lines to ${lang.name}`, "info", `Gemini was busy, so ${answer.fallback} lines used Google Translate. Press "Translate all" later for Gemini's better wording.`);
	else state().showToast(`Translated ${lines.length} lines to ${lang.name}.`);
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

/** Exports the video; returns the file (null when cancelled or failed). `quiet` skips revealing it in Finder (posting). */
export async function exportVideo(quality: ExportQuality, quiet = false): Promise<string | null> {
	if (!state().project.clips.length) {
		state().showToast("The timeline is empty.", "error");
		return null;
	}
	// A voice-over made before voices were removed automatically: remove them now, so no original speech is heard.
	if (voiceCues(state().project).length) await removeVoicesUnlessOff();
	const { project } = state();
	const outPath = await window.kroma.saveVideoDialog(`${project.name} (${project.aspect.replace(":", "x")})`);
	if (!outPath) return null;
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
			outPath,
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
	});
	if (!result) return null;
	// Remember it, so posting can reuse this file while nothing in the video changes.
	state().update((p) => ({ ...p, lastExport: { path: result, fingerprint: videoFingerprint(project) } }), false);
	if (!quiet) {
		state().showToast("Export finished", "info", result.replace(/^\/Users\/[^/]+/, "~"));
		void window.kroma.showInFolder(result);
	}
	return result;
}

/** Changes whenever anything that ends up in the exported video changes (not the posts or notes). */
export function videoFingerprint(p: Project): string {
	const text = JSON.stringify([p.aspect, p.fit, p.media.map((m) => m.path), p.clips, p.cues, p.style, p.objects, p.voice]);
	let h = 5381;
	for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
	return `${text.length}:${(h >>> 0).toString(36)}`;
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
		const path = await runTask(`separate-${Date.now()}`, "Remove voices", (id) => window.kroma.removeVoices(id, media.path, media.duration, quality));
		if (!path) return false;
		backgrounds[media.id] = path;
	}
	state().update((p) => ({ ...p, voice: { ...voiceSettings(p), removeVoices: true, separation: quality, backgrounds, enabled: true } }));
	state().showToast("Original voices removed", "info", "The voice-over now plays over the music and effects only.");
	return true;
}

export async function makeVoiceOver(): Promise<void> {
	const { project } = state();
	const lines = linesNeedingVoice(project);
	if (!lines.length) {
		state().showToast(project.cues.some((c) => c.text.trim()) ? "Every line already has a voice." : `Make the ${languageOf(project.language).name} subtitles first.`, "error");
		return;
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
		const result = await runTask(`voice-${Date.now()}`, label, (id) => window.kroma.voiceOver(id, group, v, voice.rate));
		if (!result) break;
		voiced += Object.keys(result).length;
		state().update((p) => {
			const current = voiceSettings(p);
			const stamped = Object.fromEntries(Object.entries(result).map(([id, line]) => [id, { ...line, voice: voiceKey(p, p.cues.find((c) => c.id === id)!) }]));
			return { ...p, voice: { ...current, enabled: true, lines: { ...current.lines, ...stamped } } };
		});
	}
	if (!voiced) return;
	const missed = lines.length - voiced;
	state().showToast(missed ? `Voiced ${voiced} lines; ${missed} not done. Press again to finish them.` : `Voiced ${voiced} lines.`, missed ? "error" : "info");
	await removeVoicesUnlessOff();
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

/** The voices the character finder may choose from: the language's instant voices, and the KVS templates for Khmer (not clones of real people). */
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
export async function findCharacters(): Promise<void> {
	const { project } = state();
	const lines = project.cues.filter((c) => (c.source || c.text).trim()).map((c) => ({ id: c.id, text: (c.source || c.text).trim(), start: c.start }));
	if (!lines.length) return state().showToast("Make the subtitles first.", "error");
	// Prefer the voice family already in use: designed voices when the default is one, instant ones otherwise.
	const all = castableVoices(project.language);
	const kvs = isKvsVoice(voiceSettings(project).voice) && all.some((v) => isKvsVoice(v.id));
	const voices = all.filter((v) => isKvsVoice(v.id) === kvs);
	const result = await runTask(`characters-${Date.now()}`, "Find characters", (id) => window.kroma.findCharacters(id, lines, voices, project.context));
	if (!result) return;
	updateVoicing((p) => {
		const current = voiceSettings(p);
		// Keep voices the creator already chose for characters with the same name.
		const cast = result.characters.map((c) => ({ ...c, voice: current.cast?.find((x) => x.name === c.name)?.voice ?? c.voice }));
		return { ...p, cues: p.cues.map((c) => ({ ...c, speaker: result.speakers[c.id] ?? c.speaker })), voice: { ...current, cast } };
	});
	state().showToast(`Found ${result.characters.length} character${result.characters.length === 1 ? "" : "s"}`, "info", "Each has a voice. Change any voice in the list, or who says a line in the subtitles.");
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
	const posts = await runTask(`captions-${Date.now()}`, "Write posts", (id) => window.kroma.captions(id, { transcript, title: project.name, context: project.context, language: project.language }));
	if (!posts) return false;
	state().update((p) => ({ ...p, posts }));
	return true;
}

export function updatePost(platform: PlatformCaption["platform"], patch: Partial<PlatformCaption>): void {
	state().update((p) => ({ ...p, posts: (p.posts ?? []).map((x) => (x.platform === platform ? { ...x, ...patch } : x)) }), false);
}

export interface PublishOptions {
	platforms: PublishPlatform[];
	youtubePrivacy: "public" | "unlisted" | "private";
	tiktokMode: "post" | "draft";
	quality: ExportQuality;
}

/**
 * One click: writes the posts if needed, exports the video (or reuses the last export when nothing changed), uploads
 * it to every chosen platform through Upload-Post, and records where it went.
 */
export async function publishVideo(options: PublishOptions): Promise<void> {
	const settings = await window.kroma.getSettings();
	if (!settings.hasPostKey) {
		state().showToast("Connect your accounts first", "error", "Add your Upload-Post key in Settings → Posting.");
		state().openSettings("posting");
		return;
	}
	if (!options.platforms.length) return state().showToast("Choose where to post.", "error");
	if (!state().project.posts?.length && !(await writePosts())) return;

	let pageId = settings.facebookPageId;
	if (options.platforms.includes("facebook") && !pageId) {
		const pages = await window.kroma.facebookPages().catch(() => []);
		if (pages.length !== 1) {
			state().showToast("Choose your Facebook Page", "error", "Pick the Page to post to in Settings → Posting.");
			state().openSettings("posting");
			return;
		}
		pageId = pages[0].id;
	}

	// The same video as last time? Post that file instead of exporting again.
	const project = state().project;
	const last = project.lastExport;
	const reuse = last && last.fingerprint === videoFingerprint(project) && (await window.kroma.fileExists(last.path));
	const video = reuse ? last.path : await exportVideo(options.quality, true);
	if (!video) return;

	const posts = state().project.posts ?? [];
	const post = (name: PlatformCaption["platform"]) => posts.find((p) => p.platform === name) ?? { platform: name, title: project.name, description: "", hashtags: [] };
	const yt = post("YouTube");
	const fb = post("Facebook");
	const tt = post("TikTok");
	const duration = totalDuration(project.clips);
	const req: PublishRequest = {
		video,
		profile: settings.postProfile,
		platforms: options.platforms,
		youtube: { title: yt.title, description: yt.description, tags: yt.hashtags, privacy: options.youtubePrivacy },
		// Reels must be vertical and at most 90 s; anything else goes up as a normal Page video.
		facebook: { title: fb.title, description: fb.description, tags: fb.hashtags, pageId, mediaType: project.aspect === "9:16" && duration <= 90 ? "REELS" : "VIDEO" },
		tiktok: { caption: [tt.title, tt.description].filter(Boolean).join("\n").slice(0, 1800), tags: tt.hashtags, mode: options.tiktokMode },
		idempotencyKey: `${videoFingerprint(project)}-${Date.now()}`,
	};
	const results = await runTask(`publish-${Date.now()}`, "Post", (id) => window.kroma.publish(id, req));
	if (!results) return;
	state().update((p) => ({ ...p, published: [...(p.published ?? []), { at: Date.now(), results }] }), false);
	const failed = results.filter((r) => r.state === "failed");
	const names = (rs: PublishResult[]) => rs.map((r) => PLATFORM_NAMES[r.platform]).join(", ");
	if (failed.length) state().showToast(`Not posted to ${names(failed)}`, "error", failed[0].message ?? "See the Post panel for details.");
	else state().showToast(`Posted to ${names(results)}`, "info", options.tiktokMode === "draft" && options.platforms.includes("tiktok") ? "TikTok: open the app and post it from your drafts." : undefined);
}

export const PLATFORM_NAMES: Record<PublishPlatform, string> = { youtube: "YouTube", facebook: "Facebook", tiktok: "TikTok" };
