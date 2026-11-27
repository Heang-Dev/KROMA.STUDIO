import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { KvsStatus, KvsVoice, Settings, VoiceLine } from "@shared/types";
import { LIBRARY_DIR } from "./download";
import { findTool, requireTool, run } from "./tools";

// Client for the Khmer Voice Studio engine (../KHMER.VOICE.STUDIO/engine): VoxCPM2 cloned and designed Khmer voices.
// It runs on this computer or on a free Colab GPU (its notebook prints a URL + token). The engine keeps no
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

export async function call<T>(settings: Settings, path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${base(settings)}${path}`, { ...init, headers: { ...headers(settings), ...(init.headers as Record<string, string>) }, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
	} catch {
		throw new Error(`Can't reach the voice engine at ${settings.kvsUrl}. Start it (on this computer, or in its Colab notebook) and check Settings → Voice Engine.`);
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

export async function submit(settings: Settings, kind: string, params: object, files: Record<string, string>, signal?: AbortSignal): Promise<EngineJob> {
	const form = new FormData();
	form.append("kind", kind);
	form.append("params", JSON.stringify(params));
	for (const [field, path] of Object.entries(files)) form.append(field, new Blob([readFileSync(path)]), field === "media" ? "media.wav" : `${field}.wav`);
	return call<EngineJob>(settings, "/jobs", { method: "POST", body: form, signal }, 120_000);
}

/** Follows a job until it ends, reporting the engine's own progress. */
export async function follow(settings: Settings, id: string, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<EngineJob> {
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

export async function download(settings: Settings, id: string, name: string, to: string): Promise<void> {
	const response = await fetch(`${base(settings)}/jobs/${id}/files/${encodeURIComponent(name)}`, { headers: headers(settings) });
	if (!response.ok) throw new Error(`Couldn't fetch ${name} from the voice engine.`);
	writeFileSync(to, Buffer.from(await response.arrayBuffer()));
}

// ── Voice library (clones and template samples live on this Mac) ──

// Like KVS: each template is designed once into a ~10 s sample (its sentence picked by keyword), checked for the
// right pitch, and then used as a reference, so the voice sounds the same in every job.
const SAMPLE_SENTENCES: Record<string, string> = {
	"emperor": "យើងបានស្ដាប់របាយការណ៍របស់អ្នករួចហើយ។ ពីថ្ងៃនេះតទៅ គ្មាននរណាម្នាក់អាចប្រើអំណាចតាមចិត្តបានទៀតទេ។ ចូរអនុវត្តតាមបញ្ជារបស់យើងភ្លាម។",
	"concubine": "ព្រះករុណា ខ្ញុំម្ចាស់គ្រាន់តែបារម្ភពីសុខភាពព្រះអង្គប៉ុណ្ណោះ។ តែស្ត្រីម្នាក់នោះ ហ៊ានធ្វើពុតជាស្លូតបូត ខ្ញុំម្ចាស់មើលមិនចូលទាល់តែសោះ។",
	"minister": "ទូលបង្គំសូមក្រាបទូល ឆ្នាំនេះទឹកជំនន់ធ្វើឱ្យស្រែចម្ការខូចខាតច្រើន។ សូមព្រះករុណាមេត្តាបើកឃ្លាំងស្រូវ ជួយប្រជារាស្ត្រផងព្រះអង្គ។",
	"assassin": "ខ្ញុំមិនមានឈ្មោះទេ។ គេជួលខ្ញុំឱ្យមក ខ្ញុំក៏មក។ កុំព្យាយាមរត់អី វាគ្មានប្រយោជន៍ទេ។ ការងាររបស់ខ្ញុំ មិនដែលបរាជ័យឡើយ។",
	"swordswoman": "កុំមើលងាយខ្ញុំ ព្រោះខ្ញុំជាស្ត្រី។ ដាវនេះបានការពារភូមិខ្ញុំអស់រយៈពេលដប់ឆ្នាំមកហើយ។ ចូលមក បើអ្នកហ៊ាន!",
	"elder": "កាលពីជំនាន់ខ្ញុំនៅក្មេង ភូមិនេះមានតែផ្ទះប៉ុន្មានខ្នងប៉ុណ្ណោះ។ អ្នកភូមិក្រីក្រ តែស្រឡាញ់គ្នាណាស់។ ក្មេងជំនាន់ឥឡូវត្រូវចាំរឿងនេះទុក។",
	"shopkeeper": "អញ្ជើញចូលមក អញ្ជើញ! ថ្ងៃនេះមានទំនិញថ្មីៗច្រើនណាស់។ ទិញពីរ ថែមមួយ! ថោកជាងនេះ រកលែងបានហើយបង។",
	"young master": "អ្នកដឹងទេថាខ្ញុំជានរណា? ប៉ាខ្ញុំជាអ្នកមានជាងគេនៅក្នុងទីក្រុងនេះ។ លុយប៉ុណ្ណឹង ខ្ញុំអាចទិញហាងនេះទាំងមូលបាន។",
	"ceo": "ខ្ញុំមិនចូលចិត្តនិយាយច្រើនទេ។ គម្រោងនេះត្រូវតែចប់មុនថ្ងៃសុក្រ។ បើធ្វើមិនបាន ចូរដាក់លិខិតលាឈប់មកលើតុខ្ញុំ។",
	"secretary": "លោកប្រធាន កិច្ចប្រជុំជាមួយដៃគូនឹងចាប់ផ្ដើមនៅម៉ោងដប់ព្រឹកនេះ។ ខ្ញុំបានរៀបចំឯកសារទាំងអស់រួចហើយ ហើយបានកក់កន្លែងញ៉ាំអាហារថ្ងៃត្រង់ផងដែរ។",
	"teenage boy": "ថ្ងៃនេះគ្រូឱ្យកិច្ចការផ្ទះច្រើនណាស់! ខ្ញុំចង់លេងហ្គេមជាមួយមិត្តភក្ដិ តែម៉ាក់ថាត្រូវធ្វើលំហាត់ឱ្យរួចសិន។ ធុញណាស់!",
	"teenage girl": "ថ្ងៃនេះគ្រូឱ្យកិច្ចការផ្ទះច្រើនណាស់! ខ្ញុំចង់ទៅដើរលេងផ្សារជាមួយមិត្តភក្ដិ តែម៉ាក់ថាត្រូវធ្វើលំហាត់ឱ្យរួចសិន។ ធុញណាស់!",
	"villainess": "អ្នកគិតថាគេពិតជាស្រឡាញ់អ្នកមែនទេ? គួរឱ្យអាណិតណាស់។ ចាំមើលចុះ ខ្ញុំនឹងធ្វើឱ្យអ្នកបាត់បង់អ្វីៗទាំងអស់។",
	"princess": "ថ្ងៃនេះ ផ្កានៅក្នុងសួនច្បារវាំងរីកស្អាតណាស់។ ខ្ញុំចង់ដើរលេងបន្តិច ហើយស្ដាប់សំឡេងសត្វស្លាបច្រៀង។ សូមកុំប្រាប់ព្រះមាតាខ្ញុំណា។",
	"prince": "បិតា ខ្ញុំសូមស្ម័គ្រចិត្តដឹកនាំទ័ពទៅការពារព្រំដែន។ ខ្ញុំមិនខ្លាចសត្រូវទេ។ ដរាបណាខ្ញុំនៅមានជីវិត ខ្ញុំនឹងមិនឱ្យនរណាម្នាក់ធ្វើបាបប្រជាជនរបស់យើងឡើយ។",
	"king": "យើងជាស្ដេចនៃនគរនេះ។ អ្នកណាហ៊ានប្រឆាំងនឹងបញ្ជារបស់យើង នឹងត្រូវទទួលទោស។ ប៉ុន្តែប្រជារាស្ត្រដែលស្មោះត្រង់ យើងនឹងការពារពួកគេជានិច្ច។",
	"queen": "ព្រះរាជវាំងនេះត្រូវការសេចក្ដីសុខ។ យើងមិនចង់ឃើញការឈ្លោះប្រកែកគ្នាទៀតទេ។ ចូរនាំគ្នាធ្វើការងាររបស់ខ្លួនឱ្យបានល្អ ហើយគោរពច្បាប់របស់វាំង។",
	"dowager": "ក្នុងវាំងនេះ គ្មានអ្វីដែលយើងមិនដឹងនោះទេ។ កុំគិតថាអាចលាក់បាំងយើងបាន។ ចូរនិយាយការពិតមក មុនពេលយើងបាត់បង់ការអត់ធ្មត់។",
	"general": "ទាហានទាំងអស់ ត្រៀមខ្លួន! សត្រូវកំពុងចូលមកជិតហើយ។ យើងត្រូវការពារទីក្រុងនេះរហូតដល់ដង្ហើមចុងក្រោយ។ ឆ្ពោះទៅមុខ!",
	"eunuch": "សូមក្រាបបង្គំទូល ព្រះករុណា។ មានសំបុត្របន្ទាន់មកពីខេត្តភាគខាងត្បូង។ ទូលបង្គំមិនហ៊ានពន្យារពេលទេ ទើបប្រញាប់យកមកថ្វាយភ្លាម។",
	"heroine": "អរគុណច្រើនណាស់ដែលបានជួយខ្ញុំ។ ខ្ញុំមិនដឹងថាត្រូវតបស្នងយ៉ាងម៉េចទេ។ បើថ្ងៃក្រោយអ្នកត្រូវការអ្វី សូមប្រាប់ខ្ញុំភ្លាមណា។",
	"hero": "កុំបារម្ភអី ខ្ញុំនឹងជួយអ្នក។ ទោះបីផ្លូវនេះពិបាកយ៉ាងណាក៏ដោយ ក៏យើងនឹងឆ្លងកាត់វាជាមួយគ្នា។ ជឿលើខ្ញុំចុះ។",
	"maid": "ម្ចាស់ សូមអភ័យទោស ខ្ញុំមិនមែនចេតនាទេ។ ខ្ញុំនឹងសម្អាតវាភ្លាមៗ។ សូមកុំដាក់ទោសខ្ញុំអី ខ្ញុំនឹងប្រយ័ត្នជាងនេះ។",
	"monk": "កូនអើយ ចិត្តដែលស្ងប់ គឺជាទ្រព្យសម្បត្តិដ៏ធំបំផុត។ កុំខឹង កុំច្រណែន ហើយចេះអភ័យទោសឱ្យអ្នកដទៃ។ ធ្វើល្អ នឹងបានល្អ។",
	"mother (": "កូនអើយ ញ៉ាំបាយសិនទៅ ម៉ាក់ធ្វើសម្លម្ជូរដែលកូនចូលចិត្ត។ ធ្វើការនឿយហត់ណាស់ហើយ ត្រូវថែរក្សាសុខភាពខ្លួនឯងផង។",
	"father (": "កូនត្រូវខិតខំរៀនសូត្រ ហើយធ្វើជាមនុស្សល្អ។ ប៉ាមិនត្រូវការឱ្យកូនមានលុយច្រើនទេ ប៉ាគ្រាន់តែចង់ឃើញកូនមានអនាគតល្អ។",
	storyteller: "កាលពីព្រេងនាយ មានភូមិតូចមួយនៅមាត់ទន្លេ។ អ្នកភូមិទាំងអស់រស់នៅយ៉ាងសុខសាន្ត ហើយតែងតែជួយគ្នាទៅវិញទៅមក។ ពេលល្ងាច ក្មេងៗតែងអង្គុយស្ដាប់ជីដូនជីតានិទានរឿង។",
	narrator: "សូមស្វាគមន៍មកកាន់កម្មវិធីរបស់យើង។ ថ្ងៃនេះ យើងនឹងស្វែងយល់អំពីប្រវត្តិសាស្ត្រ និងវប្បធម៌ដ៏សម្បូរបែបរបស់ប្រទេសកម្ពុជា ចាប់ពីប្រាសាទអង្គរ រហូតដល់ទំនៀមទម្លាប់ដ៏ស្រស់ស្អាតរបស់ប្រជាជនខ្មែរ។",
	news: "សួស្តីប្រិយមិត្តអ្នកទស្សនា។ អាកាសធាតុនៅរាជធានីភ្នំពេញថ្ងៃនេះ មានពពកច្រើន ហើយអាចមានភ្លៀងធ្លាក់បន្តិចនៅពេលល្ងាច។ សូមប្រិយមិត្តយកឆ័ត្រតាមខ្លួន និងប្រុងប្រយ័ត្នពេលធ្វើដំណើរ។",
	boy: "ថ្ងៃនេះ ខ្ញុំទៅលេងសួនច្បារជាមួយម៉ាក់ និងប៉ា។ ខ្ញុំឃើញផ្កាស្អាតៗ និងមេអំបៅជាច្រើន។ ខ្ញុំសប្បាយចិត្តណាស់! ពេលត្រឡប់មកផ្ទះវិញ ម៉ាក់ធ្វើនំឆ្ងាញ់ៗឱ្យខ្ញុំញ៉ាំទៀត។",
	girl: "ថ្ងៃនេះ ខ្ញុំទៅលេងសួនច្បារជាមួយម៉ាក់ និងប៉ា។ ខ្ញុំឃើញផ្កាស្អាតៗ និងមេអំបៅជាច្រើន។ ខ្ញុំសប្បាយចិត្តណាស់! ពេលត្រឡប់មកផ្ទះវិញ ម៉ាក់ធ្វើនំឆ្ងាញ់ៗឱ្យខ្ញុំញ៉ាំទៀត។",
	villain: "អ្នកគិតថាអាចរត់គេចពីខ្ញុំបានឬ? គ្មាននរណាម្នាក់អាចជួយអ្នកបានទេ។ យប់នេះ អ្វីៗទាំងអស់នឹងក្លាយជារបស់ខ្ញុំ។ ចូរចាំមើលចុះ ថាតើអ្នកនឹងធ្វើអ្វីបាន។",
	ghost: "នៅពាក់កណ្ដាលអធ្រាត្រ មានសំឡេងចម្លែកមួយលាន់ឮពីផ្ទះចាស់ ខាងចុងភូមិ។ គ្មាននរណាម្នាក់ហ៊ានដើរចូលទៅជិតទេ។",
	default: "សួស្តី ខ្ញុំរីករាយណាស់ដែលបានជួបអ្នកនៅថ្ងៃនេះ។ សូមស្ដាប់សំឡេងរបស់ខ្ញុំ ហើយជ្រើសរើសវាសម្រាប់រឿង ឬវីដេអូរបស់អ្នក។",
};

// Median pitch each template must land in (Hz); men ~85–155, women ~165–255, children higher. Whisper has none.
const PRESET_PITCH: Record<string, [number, number]> = {
	"Storyteller (warm grandfather)": [80, 150],
	"Storyteller (kind grandmother)": [180, 290],
	"Narrator (deep male)": [75, 140],
	"Narrator (clear female)": [180, 300],
	"News anchor (male)": [80, 150],
	"News anchor (female)": [170, 290],
	"Young boy": [230, 320],
	"Young girl": [230, 420],
	"Villain (dark, slow)": [65, 150],
	"King (majestic)": [75, 145],
	"Queen (elegant)": [170, 270],
	"Empress dowager (stern)": [160, 260],
	"Prince (young noble)": [95, 165],
	"Princess (gentle)": [190, 300],
	"General (bold warrior)": [80, 150],
	"Eunuch (palace servant)": [140, 230],
	"Young man (hero)": [95, 165],
	"Young woman (heroine)": [180, 290],
	"Maid (timid servant)": [200, 310],
	"Old monk (wise)": [75, 145],
	"Mother (caring)": [165, 260],
	"Father (strict)": [85, 150],
	"Emperor (cold)": [90, 160],
	"Concubine (scheming)": [190, 300],
	"Minister (old official)": [80, 150],
	"Assassin (cold killer)": [75, 140],
	"Swordswoman (fierce)": [170, 280],
	"Old man (village elder)": [80, 150],
	"Shopkeeper (cheerful)": [90, 160],
	"Rich young master (arrogant)": [95, 165],
	"CEO (cold boss)": [80, 145],
	"Secretary (office woman)": [180, 290],
	"Teenage boy (cheeky)": [130, 220],
	"Teenage girl (cheerful)": [200, 320],
	"Villainess (cruel)": [160, 260],
};

const sampleFor = (presetName: string) => {
	const lower = presetName.toLowerCase();
	const key = Object.keys(SAMPLE_SENTENCES).find((k) => k !== "default" && lower.includes(k));
	return SAMPLE_SENTENCES[key ?? "default"];
};

/** The saved sample of a template, if it has been made. */
export function presetVoice(presetName: string): KvsVoice | undefined {
	return listKvsVoices().find((v) => v.preset === presetName);
}

/** Designs a template once into a saved sample voice (pitch-checked), like KVS's preset voices. */
export async function makePresetVoice(settings: Settings, presetName: string, onProgress: (p: number, m: string) => void, signal?: AbortSignal): Promise<KvsVoice> {
	const status = await kvsStatus(settings);
	if (!status.online) throw new Error(status.error);
	const description = status.presets.find((p) => p.name === presetName)?.description;
	if (!description) throw new Error(`The voice engine has no template called "${presetName}".`);
	const sample = sampleFor(presetName);
	const pitch = PRESET_PITCH[presetName];
	const job = await submit(settings, "design", { description, sample_text: sample, ...(pitch ? { pitch, attempts: 5 } : {}) }, {}, signal);
	const done = await follow(settings, job.id, onProgress, signal);
	const old = presetVoice(presetName);
	if (old) deleteKvsVoice(old.id);
	const id = `${Date.now()}`;
	const dir = join(VOICES_DIR, id);
	mkdirSync(dir, { recursive: true });
	await download(settings, done.id, "preview.wav", join(dir, "ref.wav"));
	const voice = { name: presetName, transcript: sample, seconds: done.result?.seconds ?? 0, created: Date.now(), preset: presetName };
	writeFileSync(join(dir, "voice.json"), JSON.stringify(voice, null, "\t"));
	await call(settings, `/jobs/${done.id}`, { method: "DELETE" }).catch(() => undefined);
	return { id, ...voice };
}

/** The file to play for a KVS voice's sample (its recording or saved sample), if there is one. */
export function kvsSamplePath(voice: string): string | null {
	if (voice.startsWith("kvs-clone:")) {
		const path = join(VOICES_DIR, voice.slice(10), "ref.wav");
		return existsSync(path) ? path : null;
	}
	const saved = presetVoice(voice.slice("kvs-design:".length));
	return saved ? join(VOICES_DIR, saved.id, "ref.wav") : null;
}

export function listKvsVoices(): KvsVoice[] {
	if (!existsSync(VOICES_DIR)) return [];
	return readdirSync(VOICES_DIR)
		.map((id) => {
			try {
				return { id, ...JSON.parse(readFileSync(join(VOICES_DIR, id, "voice.json"), "utf8")), path: join(VOICES_DIR, id, "ref.wav") } as KvsVoice;
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
export async function cloneVoice(
	settings: Settings,
	name: string,
	recording: string,
	onProgress: (p: number, m: string) => void,
	signal?: AbortSignal,
	/** What the recording says, when it was read from a known text (then the engine needn't write it down). */
	knownTranscript?: string,
): Promise<KvsVoice> {
	const job = await submit(settings, "prepare_voice", { transcribe: !knownTranscript, language: "Khmer" }, { media: recording }, signal);
	const done = await follow(settings, job.id, onProgress, signal);
	const id = `${Date.now()}`;
	const dir = join(VOICES_DIR, id);
	mkdirSync(dir, { recursive: true });
	await download(settings, done.id, "ref.wav", join(dir, "ref.wav"));
	const voice = { name: name.trim() || "My voice", transcript: knownTranscript?.trim() || done.result?.transcript || "", seconds: done.result?.seconds ?? 0, created: Date.now() };
	writeFileSync(join(dir, "voice.json"), JSON.stringify(voice, null, "\t"));
	await call(settings, `/jobs/${done.id}`, { method: "DELETE" }).catch(() => undefined);
	return { id, ...voice };
}

// ── Speaking ──

/** "kvs-clone:<id>" or "kvs-design:<preset name>" → the engine's voice spec (+ the reference file to upload). */
export function voiceSpec(voice: string, presets: { name: string; description: string }[]): { spec: object; files: Record<string, string>; key: string } {
	if (voice.startsWith("kvs-clone:")) {
		const id = voice.slice(10);
		const dir = join(VOICES_DIR, id);
		const meta = JSON.parse(readFileSync(join(dir, "voice.json"), "utf8")) as { name: string; transcript: string };
		return { spec: { name: meta.name, ref: "clone", transcript: meta.transcript }, files: { voice_clone: join(dir, "ref.wav") }, key: `${voice}|${meta.transcript}` };
	}
	const name = voice.slice("kvs-design:".length);
	// A template with a saved sample speaks from that sample, so it sounds the same every time.
	const saved = presetVoice(name);
	if (saved) {
		return { spec: { name, ref: "preset", transcript: saved.transcript }, files: { voice_preset: join(VOICES_DIR, saved.id, "ref.wav") }, key: `kvs-preset:${saved.id}` };
	}
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

// ── Import from the Khmer Voice Studio dashboard (its database + storage) ──

export interface KvsImportable {
	kvsId: number;
	name: string;
	kind: "preset" | "clone";
	seconds: number;
	transcript: string;
	imported: boolean;
}

const hashes = new Map<string, { mtime: number; hash: string }>();
/** A recording's fingerprint (cached until the file changes). */
function fileHash(path: string): string {
	try {
		const mtime = statSync(path).mtimeMs;
		const cached = hashes.get(path);
		if (cached?.mtime === mtime) return cached.hash;
		const hash = createHash("sha1").update(readFileSync(path)).digest("hex");
		hashes.set(path, { mtime, hash });
		return hash;
	} catch {
		return "";
	}
}

/** KVS keeps voices in its Postgres database (names, transcripts) and storage/app/private (the recordings). */
async function kvsDashboardVoices(projectDir: string): Promise<(KvsImportable & { file: string })[]> {
	if (!projectDir) throw new Error("Choose your Khmer Voice Studio folder first: Settings → Voice Engine → Khmer Voice Studio folder.");
	if (!existsSync(join(projectDir, ".env"))) throw new Error(`That folder doesn't look like Khmer Voice Studio (no .env file in ${projectDir}). Choose it again in Settings → Voice Engine.`);
	const env = readFileSync(join(projectDir, ".env"), "utf8");
	const get = (k: string) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "") ?? "";
	const psql = findTool("psql");
	if (!psql) throw new Error("Importing from KVS needs psql (brew install postgresql).");
	const sql =
		"select id, name, source, is_preset, coalesce(seconds,0), ref_path, replace(coalesce(transcript,''), E'\\n', ' ') from voice_voices where status = 'ready' and deleted_at is null and ref_path is not null order by id";
	const out = await run(psql, ["-h", get("DB_HOST") || "127.0.0.1", "-p", get("DB_PORT") || "5432", "-U", get("DB_USERNAME") || "postgres", "-d", get("DB_DATABASE"), "-At", "-F", "\t", "-c", sql], {
		env: { PGPASSWORD: get("DB_PASSWORD") },
	}).catch((e: Error) => {
		throw new Error(`Couldn't read KVS's voices (is its database running?): ${e.message.split("\n")[0]}`);
	});
	const mine = listKvsVoices();
	return out
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((row) => {
			const [id, name, source, isPreset, seconds, refPath, transcript] = row.split("\t");
			const kind: "preset" | "clone" = source === "design" && isPreset === "t" ? "preset" : "clone";
			const file = join(projectDir, "storage", "app", "private", refPath);
			// Imported only when Kroma has this exact recording: a sample Kroma designed itself, or one KVS has since made
			// again (same id, new recording), sounds different.
			const imported = mine.some((v) => v.kvsId === Number(id) && v.path && fileHash(v.path) === fileHash(file));
			return { kvsId: Number(id), name, kind, seconds: Number(seconds), transcript, imported, file };
		})
		.filter((v) => existsSync(v.file));
}

export async function kvsImportable(projectDir: string): Promise<KvsImportable[]> {
	return (await kvsDashboardVoices(projectDir)).map(({ file: _file, ...v }) => v);
}

/** Copies the chosen KVS voices into Kroma's library (presets become template samples). */
export async function importKvsVoices(projectDir: string, ids: number[]): Promise<number> {
	const all = await kvsDashboardVoices(projectDir);
	let count = 0;
	for (const v of all.filter((x) => ids.includes(x.kvsId) && !x.imported)) {
		// KVS's sample replaces any other sample of the same preset (or an older copy of this voice), so both apps match.
		for (const old of listKvsVoices().filter((x) => x.kvsId === v.kvsId || (v.kind === "preset" && x.preset === v.name))) deleteKvsVoice(old.id);
		const id = `${Date.now()}${count}`;
		const dir = join(VOICES_DIR, id);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "ref.wav"), readFileSync(v.file));
		const meta = { name: v.name, transcript: v.transcript, seconds: v.seconds, created: Date.now(), kvsId: v.kvsId, ...(v.kind === "preset" ? { preset: v.name } : {}) };
		writeFileSync(join(dir, "voice.json"), JSON.stringify(meta, null, "\t"));
		count++;
	}
	return count;
}

/** Brings over KVS's preset samples that Kroma doesn't have yet (or has a different one of). Presets need no consent. */
export async function syncKvsPresets(projectDir: string): Promise<number> {
	if (!projectDir || !existsSync(join(projectDir, ".env"))) return 0;
	const all = await kvsDashboardVoices(projectDir);
	const missing = all.filter((v) => v.kind === "preset" && !v.imported).map((v) => v.kvsId);
	return missing.length ? importKvsVoices(projectDir, missing) : 0;
}

/** Saves a recording made in the app (webm from the microphone) as a WAV the engine and players read. */
export async function saveRecording(bytes: Uint8Array): Promise<string> {
	const dir = join(LIBRARY_DIR, "recordings");
	mkdirSync(dir, { recursive: true });
	const stamp = Date.now();
	const raw = join(dir, `rec-${stamp}.webm`);
	const wav = join(dir, `rec-${stamp}.wav`);
	writeFileSync(raw, bytes);
	try {
		await run(requireTool("ffmpeg"), ["-y", "-v", "error", "-i", raw, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", wav]);
	} finally {
		rmSync(raw, { force: true });
	}
	return wav;
}
