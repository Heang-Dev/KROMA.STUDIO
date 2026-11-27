import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Settings, StoryRecord, StoryRequest } from "@shared/types";
import { parseStory } from "@shared/story";
import { LIBRARY_DIR } from "./download";
import { call, download, follow, kvsStatus, submit, voiceSpec } from "./kvs";

// Story studio: a whole script read by the voice engine in one "story" job, a voice (and style) per speaker, pauses
// and one-line styles written in the script. Each story is kept in the library (story.mp3 / .wav / .srt + story.json).
// Redoing a line is a new story: the engine speaks that one line again and puts it in place of the old one.

const STORIES_DIR = join(LIBRARY_DIR, "stories");
const FILES = ["story.mp3", "story.wav", "story.srt"] as const;

const dirOf = (id: string) => {
	if (!/^[\w-]+$/.test(id)) throw new Error("Unknown story.");
	return join(STORIES_DIR, id);
};

/** The engine's speakers ({name: {voice, style}}) and the reference recordings to upload, one field per speaker. */
function engineSpeakers(request: StoryRequest, presets: { name: string; description: string }[]) {
	const speakers: Record<string, { voice: object | null; style: string }> = {};
	const files: Record<string, string> = {};
	Object.entries(request.speakers).forEach(([name, { voice, style }], i) => {
		if (!voice || voice === "default") {
			speakers[name] = { voice: null, style };
			return;
		}
		const made = voiceSpec(voice, presets);
		const spec = made.spec as { ref?: string };
		const upload = Object.values(made.files)[0];
		// voiceSpec names its one upload voice_clone / voice_preset; two speakers may both need one, so each gets its own.
		if (spec.ref && upload) {
			spec.ref = `s${i}`;
			files[`voice_s${i}`] = upload;
		}
		speakers[name] = { voice: spec, style };
	});
	return { speakers, files };
}

/** Speaks a story (or, with `redo`, one line of an earlier story again) and keeps it in the library. */
export async function tellStory(
	settings: Settings,
	request: StoryRequest,
	onProgress: (p: number, m: string) => void,
	signal?: AbortSignal,
	redo?: { from: string; line: number },
): Promise<StoryRecord> {
	if (!parseStory(request.script).some((i) => i.type === "line")) throw new Error("Write a script first, like  Narrator: …  /  Sokha: …");
	const status = await kvsStatus(settings);
	if (!status.online) throw new Error(status.error);
	const { speakers, files } = engineSpeakers(request, status.presets);
	const params: Record<string, unknown> = { script: request.script, speakers };
	let title = request.title.trim() || request.script.replace(/\s+/g, " ").trim().slice(0, 60);
	if (redo) {
		const old = readStory(redo.from);
		if (!old) throw new Error("That story is gone.");
		if (redo.line < 0 || redo.line >= old.cues.length) throw new Error(`This story has no line ${redo.line + 1}.`);
		params.redo = { line: redo.line };
		params.cues = old.cues;
		files.base = join(dirOf(old.id), "story.wav");
		title = `${old.title.replace(/ · line \d+$/, "")} · line ${redo.line + 1}`;
	}

	onProgress(-1, redo ? `Speaking line ${redo.line + 1} again` : "Sending the story to the voice engine");
	const job = await submit(settings, "story", params, files, signal);
	const done = await follow(settings, job.id, onProgress, signal);
	const id = `${Date.now()}`;
	const dir = dirOf(id);
	mkdirSync(dir, { recursive: true });
	try {
		for (const name of FILES) if (done.files.some((f) => f.name === name)) await download(settings, done.id, name, join(dir, name));
	} catch (err) {
		rmSync(dir, { recursive: true, force: true });
		throw err;
	} finally {
		await call(settings, `/jobs/${done.id}`, { method: "DELETE" }).catch(() => undefined);
	}
	const record: StoryRecord = {
		id,
		title,
		script: request.script,
		speakers: request.speakers,
		cues: done.result?.cues ?? [],
		seconds: done.result?.seconds ?? 0,
		created: Date.now(),
		...(redo ? { redoneLine: redo.line } : {}),
	};
	writeFileSync(join(dir, "story.json"), JSON.stringify(record, null, "\t"));
	return withPaths(record);
}

function withPaths(record: StoryRecord): StoryRecord {
	const dir = dirOf(record.id);
	const audio = ["story.mp3", "story.wav"].map((n) => join(dir, n)).find((p) => existsSync(p));
	const srt = join(dir, "story.srt");
	return { ...record, audio, srt: existsSync(srt) ? srt : undefined };
}

export function readStory(id: string): StoryRecord | null {
	try {
		return withPaths(JSON.parse(readFileSync(join(dirOf(id), "story.json"), "utf8")) as StoryRecord);
	} catch {
		return null;
	}
}

/** Every saved story, newest first. */
export function listStories(): StoryRecord[] {
	if (!existsSync(STORIES_DIR)) return [];
	return readdirSync(STORIES_DIR)
		.map(readStory)
		.filter((s): s is StoryRecord => s !== null)
		.sort((a, b) => b.created - a.created);
}

export function deleteStory(id: string): void {
	rmSync(dirOf(id), { recursive: true, force: true });
}

/** The story's folder (for Save as… and Show in Finder). */
export const storyDir = dirOf;
