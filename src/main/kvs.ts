import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { KvsStatus, KvsVoice, Settings, VoiceLine } from "@shared/types";
import { LIBRARY_DIR } from "./download";
import { requireTool, run } from "./tools";

// Client for the Khmer Voice Studio engine (../KHMER.VOICE.STUDIO/engine): VoxCPM2 cloned and designed Khmer voices.
// It runs on this Mac (make engine) or on a free Colab GPU (its notebook prints a URL + token). The engine keeps no
// voices: each job carries the reference recording. Kroma sends all lines as one "story" job so the voice stays
// consistent, then cuts the result into one clip per subtitle line using the engine's own timings.

const VOICES_DIR = join(LIBRARY_DIR, "voices");
const CACHE_DIR = join(LIBRARY_DIR, "voice-cache");

interface EngineJob {
	id: string;
	status: "queued" | "running" | "done" | "failed" | "cancelled";
	progress: number;
	message: string;
	error: string | null;
	result: { cues?: [number, number, string][]; seconds?: number; transcript?: string } | null;
	files: { name: string; size: number }[];
	eta_seconds: number | null;
}

const base = (settings: Settings) => settings.kvsUrl.replace(/\/$/, "");
const headers = (settings: Settings): Record<string, string> => (settings.kvsToken ? { Authorization: `Bearer ${settings.kvsToken}` } : {});

async function call<T>(settings: Settings, path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${base(settings)}${path}`, { ...init, headers: { ...headers(settings), ...(init.headers as Record<string, string>) }, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
	} catch {
		throw new Error(`Can't reach the voice engine at ${settings.kvsUrl}. Start it (KVS: make engine, or the Colab notebook) and check Settings → Voice Engine.`);
	}
	if (response.status === 401 || response.status === 403) throw new Error("The voice engine refused the token. Copy the token from the engine (Colab prints it) into Settings → Voice Engine.");
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Voice engine error ${response.status}: ${body.match(/"detail":\s*"([^"]+)"/)?.[1] ?? body.slice(0, 200)}`);
	}
	return (await response.json()) as T;
}

export async function kvsStatus(settings: Settings): Promise<KvsStatus> {
	try {
		const health = await call<{ device: string; busy: number; auth: boolean }>(settings, "/health", {}, 5000);
		const meta = await call<{ design_presets: Record<string, string> }>(settings, "/meta", {}, 8000);
		return { online: true, device: health.device, busy: health.busy, presets: Object.entries(meta.design_presets).map(([name, description]) => ({ name, description })) };
	} catch (err) {
		return { online: false, error: (err as Error).message, presets: [] };
	}
}

async function submit(settings: Settings, kind: string, params: object, files: Record<string, string>, signal?: AbortSignal): Promise<EngineJob> {
	const form = new FormData();
	form.append("kind", kind);
	form.append("params", JSON.stringify(params));
	for (const [field, path] of Object.entries(files)) form.append(field, new Blob([readFileSync(path)]), field === "media" ? "media.wav" : `${field}.wav`);
	return call<EngineJob>(settings, "/jobs", { method: "POST", body: form, signal }, 120_000);
}

/** Follows a job until it ends, reporting the engine's own progress. */
async function follow(settings: Settings, id: string, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<EngineJob> {
	for (;;) {
		if (signal?.aborted) {
			await call(settings, `/jobs/${id}`, { method: "DELETE" }).catch(() => undefined);
			throw new Error("Cancelled");
		}
		const job = await call<EngineJob>(settings, `/jobs/${id}`);
		if (job.status === "done") return job;
		if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error || "The voice engine stopped this job.");
		const eta = job.eta_seconds ? ` · about ${job.eta_seconds > 90 ? `${Math.round(job.eta_seconds / 60)} min` : `${job.eta_seconds} s`} left` : "";
		onProgress(job.status === "queued" ? -1 : job.progress, `Voice engine: ${job.message}${eta}`);
		await new Promise((r) => setTimeout(r, 1500));
	}
}

async function download(settings: Settings, id: string, name: string, to: string): Promise<void> {
	const response = await fetch(`${base(settings)}/jobs/${id}/files/${encodeURIComponent(name)}`, { headers: headers(settings) });
	if (!response.ok) throw new Error(`Couldn't fetch ${name} from the voice engine.`);
	writeFileSync(to, Buffer.from(await response.arrayBuffer()));
}

// ── Voice library (clones live on this Mac; designed voices come from the engine's presets) ──

export function listKvsVoices(): KvsVoice[] {
	if (!existsSync(VOICES_DIR)) return [];
	return readdirSync(VOICES_DIR)
		.map((id) => {
			try {
				return { id, ...JSON.parse(readFileSync(join(VOICES_DIR, id, "voice.json"), "utf8")) } as KvsVoice;
			} catch {
				return null;
			}
		})
		.filter((v): v is KvsVoice => v !== null)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function deleteKvsVoice(id: string): void {
	if (/^[\w-]+$/.test(id)) rmSync(join(VOICES_DIR, id), { recursive: true, force: true });
}

/** Cleans a recording into a clone reference on the engine (trimmed, normalised, ≤ 20 s) and writes down what it says. */
export async function cloneVoice(settings: Settings, name: string, recording: string, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<KvsVoice> {
	const job = await submit(settings, "prepare_voice", { transcribe: true, language: "Khmer" }, { media: recording }, signal);
	const done = await follow(settings, job.id, onProgress, signal);
	const id = `${Date.now()}`;
	const dir = join(VOICES_DIR, id);
	mkdirSync(dir, { recursive: true });
	await download(settings, done.id, "ref.wav", join(dir, "ref.wav"));
	const voice = { name: name.trim() || "My voice", transcript: done.result?.transcript ?? "", seconds: done.result?.seconds ?? 0, created: Date.now() };
	writeFileSync(join(dir, "voice.json"), JSON.stringify(voice, null, "\t"));
	await call(settings, `/jobs/${done.id}`, { method: "DELETE" }).catch(() => undefined);
	return { id, ...voice };
}

// ── Speaking ──

/** "kvs-clone:<id>" or "kvs-design:<preset name>" → the engine's voice spec (+ the reference file to upload). */
function voiceSpec(voice: string, presets: { name: string; description: string }[]): { spec: object; files: Record<string, string>; key: string } {
	if (voice.startsWith("kvs-clone:")) {
		const id = voice.slice(10);
		const dir = join(VOICES_DIR, id);
		const meta = JSON.parse(readFileSync(join(dir, "voice.json"), "utf8")) as { name: string; transcript: string };
		return { spec: { name: meta.name, ref: "clone", transcript: meta.transcript }, files: { voice_clone: join(dir, "ref.wav") }, key: `${voice}|${meta.transcript}` };
	}
	const name = voice.slice("kvs-design:".length);
	const description = presets.find((p) => p.name === name)?.description;
	if (!description) throw new Error(`The voice engine has no designed voice called "${name}".`);
	return { spec: { name, design: description }, files: {}, key: voice };
}

/**
 * Speaks the lines in one engine job and returns one clip per line (cached by voice + text, so only new or edited
 * lines go to the engine).
 */
export async function speakWithKvs(
	settings: Settings,
	lines: { id: string; text: string }[],
	voice: string,
	onProgress: (p: number, m: string) => void,
	signal?: AbortSignal,
): Promise<Record<string, VoiceLine>> {
	mkdirSync(CACHE_DIR, { recursive: true });
	const status = await kvsStatus(settings);
	if (!status.online) throw new Error(status.error);
	const { spec, files, key } = voiceSpec(voice, status.presets);
	const clipPath = (text: string) => join(CACHE_DIR, `kvs-${createHash("sha1").update(`${key}|${text}`).digest("hex").slice(0, 16)}.wav`);
	const ffmpeg = requireTool("ffmpeg");

	const result: Record<string, VoiceLine> = {};
	const todo = lines.filter((l) => {
		const path = clipPath(l.text);
		if (existsSync(path)) result[l.id] = { path, duration: wavSeconds(path), text: l.text };
		return !existsSync(path);
	});
	if (!todo.length) return result;

	// Speaker names can't contain colons and each line must stay on one line of the script.
	const script = todo.map((l) => `V: ${l.text.replace(/[\r\n]+/g, " ")}`).join("\n");
	onProgress(-1, `Sending ${todo.length} lines to the voice engine`);
	const job = await submit(settings, "story", { script, speakers: { V: { voice: spec, style: "" } } }, files, signal);
	const done = await follow(settings, job.id, onProgress, signal);
	const cues = done.result?.cues ?? [];
	if (cues.length !== todo.length) throw new Error(`The voice engine returned ${cues.length} lines for ${todo.length}.`);

	const story = join(CACHE_DIR, `story-${done.id}.wav`);
	await download(settings, done.id, "story.wav", story);
	try {
		for (let i = 0; i < todo.length; i++) {
			const [start, end] = cues[i];
			const out = clipPath(todo[i].text);
			// Plain 44-byte WAV header (no metadata chunks), so wavSeconds can read the length later.
			await run(ffmpeg, ["-y", "-v", "error", "-i", story, "-ss", start.toFixed(3), "-to", end.toFixed(3), "-map_metadata", "-1", "-fflags", "+bitexact", "-c:a", "pcm_s16le", out]);
			result[todo[i].id] = { path: out, duration: end - start, text: todo[i].text };
			onProgress(0.99, `Cutting the voice into lines ${i + 1}/${todo.length}`);
		}
	} finally {
		rmSync(story, { force: true });
		await call(settings, `/jobs/${done.id}`, { method: "DELETE" }).catch(() => undefined);
	}
	return result;
}

/** Length of a 16-bit WAV from its header (cached clips). */
function wavSeconds(path: string): number {
	const header = readFileSync(path).subarray(0, 44);
	const byteRate = header.readUInt32LE(28);
	const dataBytes = header.readUInt32LE(40);
	return byteRate ? dataBytes / byteRate : 0;
}
