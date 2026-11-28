import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { type TargetLanguage, hasWrongScript, languageOf } from "@shared/languages";
import type { CaptionRequest, PlatformCaption, Settings } from "@shared/types";
import { type GlossaryTerm, applyGlossary, cleanGlossary, glossaryPrompt } from "@shared/glossary";
import { geminiWithFallback as gemini } from "./gemini";
import { googleTranslate } from "./google-translate";
import { mapLimit } from "./tools";
import { t } from "@shared/i18n";

// Translation (Khmer, or another chosen language) and the post writer: Gemini (free tier), Google Translate (free, no key) or Claude (paid, best).

const BATCH = 60;
const CONTEXT_LINES = 6;

function client(settings: Settings): Anthropic {
	if (!settings.anthropicKey) throw new Error(t("Add your Anthropic API key in Settings to translate with Claude."));
	return new Anthropic({ apiKey: settings.anthropicKey, maxRetries: 4 });
}

/** The translator's instructions for a target language. */
function translateSystem(lang: TargetLanguage): string {
	return `You translate video subtitles into natural, spoken ${lang.name} (${lang.native}) for ${lang.audience} on YouTube, Facebook and TikTok.

Rules:
- Translate the meaning the way a native speaker would say it out loud, not word by word. Keep it short enough to read on screen.
- Keep each line separate: return exactly one ${lang.name} line for every numbered input line, with the same number.
- Use the earlier lines only to understand the scene; do not translate them again.
- Keep names consistent across the whole video, unless the notes give a spelling.
${lang.notes ? `- ${lang.notes}\n` : ""}- No quotes, no notes, no romanisation.
- If a line is only a sound or music, return an empty string for it.
- The ${lang.name} is also read aloud as a voice-over. Each line shows how long it's on screen, like [2.1s]: keep it short enough to say naturally in about that time (${lang.pace}). Shorten wordy phrasing, keep the meaning. Never put the [time] in your answer.`;
}

const TranslationSchema = z.object({
	lines: z.array(z.object({ n: z.number().int(), km: z.string() })),
});

export interface TranslateLine {
	id: string;
	text: string;
	/** How long the line is on screen, in seconds; the Khmer is written to be spoken in about that time. */
	seconds?: number;
}

export async function translateToKhmer(
	lines: TranslateLine[],
	notes: string,
	settings: Settings,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
	/** Target language code (Khmer unless chosen otherwise). */
	languageCode?: string,
	/** Set on the second pass that re-translates lines written in the wrong script. */
	repairing = false,
	/** The series glossary: names and terms every episode translates the same way. */
	glossary: GlossaryTerm[] = [],
): Promise<Record<string, string>> {
	// Google Translate can't follow instructions, so it gets the names already swapped in.
	const forGoogle = (ls: TranslateLine[]) => (glossary.length ? ls.map((l) => ({ ...l, text: applyGlossary(l.text, glossary) })) : ls);
	const lang = languageOf(languageCode);
	const TRANSLATE_SYSTEM = translateSystem(lang);
	if (settings.translateProvider === "google") {
		onProgress(0, t("Translating with {name}", { name: "Google Translate" }));
		return googleTranslate(forGoogle(lines), (done, total) => onProgress(done / total, t("Translating with Google Translate · {done}/{total}", { done, total })), signal, lang.code);
	}

	const useGemini = settings.translateProvider === "gemini";
	if (useGemini && !settings.geminiKey) throw new Error(t("Add your free Gemini key in Settings → Translation, or choose Google Translate there."));
	const anthropic = useGemini ? null : client(settings);
	const name = useGemini ? "Gemini" : "Claude";
	const batches: { start: number; items: TranslateLine[] }[] = [];
	for (let i = 0; i < lines.length; i += BATCH) batches.push({ start: i, items: lines.slice(i, i + BATCH) });

	const result: Record<string, string> = {};
	let done = 0;
	const failures: string[] = [];
	onProgress(0, t("Translating with {name} · {done}/{total} batches", { name, done: 0, total: batches.length }));

	// Gemini's free tier allows few requests a minute, so it runs fewer at once.
	await mapLimit(batches, useGemini ? Math.min(settings.concurrency, 2) : settings.concurrency, async ({ start, items }) => {
		const before = lines.slice(Math.max(0, start - CONTEXT_LINES), start);
		const prompt = [
			notes.trim() ? `Notes about this video:\n${notes.trim()}\n` : "",
			before.length ? `Earlier lines (context only):\n${before.map((l) => l.text).join("\n")}\n` : "",
			glossaryPrompt(glossary, items.map((l) => l.text).join("\n")),
			"Translate these lines:",
			...items.map((l, k) => `${k + 1}. ${l.seconds ? `[${l.seconds.toFixed(1)}s] ` : ""}${l.text}`),
		]
			.filter(Boolean)
			.join("\n");

		try {
			let translated: { n: number; km: string }[];
			if (useGemini) {
				const answer = await gemini<{ lines: { n: number; km: string }[] }>(settings, {
					system: TRANSLATE_SYSTEM,
					prompt,
					schema: GEMINI_TRANSLATION_SCHEMA,
					signal,
					onRetry: (reason) => onProgress(done / batches.length, t("{reason} · {done}/{total} batches done", { reason, done, total: batches.length })),
				});
				translated = answer.lines ?? [];
			} else {
				const response = await anthropic!.beta.messages.parse(
					{
						model: settings.translateModel,
						max_tokens: 16000,
						betas: ["server-side-fallback-2026-07-01"],
						fallbacks: "default",
						output_config: { effort: "low", format: betaZodOutputFormat(TranslationSchema) },
						system: TRANSLATE_SYSTEM,
						messages: [{ role: "user", content: prompt }],
					},
					{ signal },
				);
				if (response.stop_reason === "refusal") throw new Error(t("Claude declined this part"));
				translated = response.parsed_output?.lines ?? [];
			}
			for (const line of translated) {
				const item = items[line.n - 1];
				if (item) result[item.id] = line.km.trim();
			}
		} catch (err) {
			if (signal?.aborted) throw err;
			failures.push(errorText(err));
		}
		done += 1;
		onProgress(done / batches.length, t("Translating with {name} · {done}/{total} batches", { name, done, total: batches.length }));
	});

	// Lines Gemini couldn't do (busy, timed out) still get a translation from Google Translate.
	const missing = lines.filter((l) => result[l.id] === undefined);
	if (useGemini && missing.length) {
		onProgress(-1, t("Gemini is busy: translating {n} lines with Google Translate", { n: missing.length }));
		try {
			Object.assign(result, await googleTranslate(forGoogle(missing), () => undefined, signal, lang.code));
			fallbackCount.set(lines, missing.length);
			return result;
		} catch {
			// fall through to the Gemini error below
		}
	}
	if (failures.length === batches.length) throw new Error(failures[0]);
	return repairing ? result : repairScript(result, lines, notes, settings, onProgress, signal, lang, glossary);
}

/** Lines that came back with letters of another script (a Thai word in Khmer, Chinese left as is) get one more try. */
async function repairScript(
	result: Record<string, string>,
	lines: TranslateLine[],
	notes: string,
	settings: Settings,
	onProgress: (progress: number, message: string) => void,
	signal: AbortSignal | undefined,
	lang: TargetLanguage,
	glossary: GlossaryTerm[],
): Promise<Record<string, string>> {
	const wrong = lines.filter((l) => result[l.id] && hasWrongScript(result[l.id], lang.code));
	if (!wrong.length) return result;
	onProgress(-1, wrong.length === 1 ? t("Fixing 1 line that mixed in another script") : t("Fixing {n} lines that mixed in another script", { n: wrong.length }));
	const note = `${notes}\nThese lines must be written only in ${lang.name} script: an earlier answer mixed in letters of another language.`.trim();
	try {
		const again = await translateToKhmer(wrong, note, settings, () => undefined, signal, lang.code, true, glossary);
		for (const l of wrong) if (again[l.id] && !hasWrongScript(again[l.id], lang.code)) result[l.id] = again[l.id];
	} catch {
		// keep the first answer; the line can be fixed by hand
	}
	return result;
}

const GlossarySchema = z.object({ terms: z.array(z.object({ source: z.string(), target: z.string(), note: z.string() })) });
const GEMINI_GLOSSARY_SCHEMA = {
	type: "OBJECT",
	properties: { terms: { type: "ARRAY", items: { type: "OBJECT", properties: { source: { type: "STRING" }, target: { type: "STRING" }, note: { type: "STRING" } }, required: ["source", "target", "note"] } } },
	required: ["terms"],
};

/**
 * Finds the names and recurring terms in translated subtitles (people, places, titles, groups, special words) with the
 * spelling the translation used, for the series glossary. Needs Gemini or Claude.
 */
export async function findGlossaryTerms(pairs: { source: string; text: string }[], languageCode: string | undefined, settings: Settings, signal?: AbortSignal): Promise<GlossaryTerm[]> {
	const lang = languageOf(languageCode);
	// The chosen AI if it has a key; with Google Translate chosen, whichever AI has a key (Gemini first).
	const useGemini = settings.translateProvider === "claude" && settings.anthropicKey ? false : Boolean(settings.geminiKey);
	if (!useGemini && !settings.anthropicKey) throw new Error(t("Finding names needs Gemini or Claude: add a key in Settings → Translation."));
	const system = `You build a glossary for translating a video series into ${lang.name}. From the original subtitles and their ${lang.name} translation, list every name of a person, place, family, company, title or rank, and any special term that recurs, with the exact ${lang.name} spelling the translation used. Use a short note to say who or what it is (in English). Leave out ordinary words. If the translation spelled a name in different ways, choose the most common one.`;
	const sample = pairs.filter((p) => p.source.trim() && p.text.trim()).slice(0, 400);
	if (!sample.length) return [];
	const prompt = `Original → ${lang.name}:\n${sample.map((p) => `${p.source} → ${p.text}`).join("\n")}`;
	let terms: GlossaryTerm[];
	if (useGemini) {
		const answer = await gemini<{ terms: GlossaryTerm[] }>(settings, { system, prompt, schema: GEMINI_GLOSSARY_SCHEMA, signal });
		terms = answer.terms ?? [];
	} else {
		const response = await client(settings).beta.messages.parse(
			{ model: settings.translateModel, max_tokens: 8000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", output_config: { effort: "low", format: betaZodOutputFormat(GlossarySchema) }, system, messages: [{ role: "user", content: prompt }] },
			{ signal },
		);
		terms = response.parsed_output?.terms ?? [];
	}
	// Only terms that really are in the subtitles.
	const all = sample.map((p) => p.source).join("\n");
	return cleanGlossary(terms.filter((t) => all.includes(t.source)));
}

/** How many lines of a translate call fell back to Google Translate (read by the IPC handler). */
export const fallbackCount = new WeakMap<TranslateLine[], number>();

const GEMINI_TRANSLATION_SCHEMA = {
	type: "OBJECT",
	properties: { lines: { type: "ARRAY", items: { type: "OBJECT", properties: { n: { type: "INTEGER" }, km: { type: "STRING" } }, required: ["n", "km"] } } },
	required: ["lines"],
};

const CaptionSchema = z.object({
	posts: z.array(
		z.object({
			platform: z.enum(["YouTube", "Facebook", "TikTok"]),
			title: z.string(),
			description: z.string(),
			hashtags: z.array(z.string()),
		}),
	),
});

const captionSystem = (lang: TargetLanguage) =>
	`You write social media posts in ${lang.name} for a creator who shares videos with ${lang.name} subtitles with ${lang.audience}. ` +
	"Write one post each for YouTube, Facebook and TikTok, in the style that works on that platform: " +
	"YouTube gets a searchable title (under 90 characters) and a description of 2-3 short paragraphs; " +
	"Facebook gets a warm, curiosity-building post; TikTok gets a very short hook. " +
	`Do not invent facts that aren't in the video. Hashtags: 5-10, mixing ${lang.name}${lang.code === "en" ? "" : " and English"}, without the # sign.`;

const GEMINI_CAPTION_SCHEMA = {
	type: "OBJECT",
	properties: {
		posts: {
			type: "ARRAY",
			items: {
				type: "OBJECT",
				properties: { platform: { type: "STRING", enum: ["YouTube", "Facebook", "TikTok"] }, title: { type: "STRING" }, description: { type: "STRING" }, hashtags: { type: "ARRAY", items: { type: "STRING" } } },
				required: ["platform", "title", "description", "hashtags"],
			},
		},
	},
	required: ["posts"],
};

/** Posts come from Claude when chosen, otherwise from Gemini (Google Translate can't write posts). */
export async function writeCaptions(request: CaptionRequest, settings: Settings, signal?: AbortSignal): Promise<PlatformCaption[]> {
	const transcript = request.transcript.length > 60_000 ? `${request.transcript.slice(0, 60_000)}\n…` : request.transcript;
	const lang = languageOf(request.language);
	const CAPTION_SYSTEM = captionSystem(lang);
	const prompt = `Video title: ${request.title || "(unknown)"}\n${request.context ? `Notes: ${request.context}\n` : ""}\n${lang.name} subtitles of the video:\n${transcript}`;
	const tidy = (posts: PlatformCaption[]) => posts.map((p) => ({ ...p, hashtags: p.hashtags.map((h) => h.replace(/^#/, "")) }));

	const useClaude = settings.translateProvider === "claude" ? Boolean(settings.anthropicKey) : !settings.geminiKey && Boolean(settings.anthropicKey);
	if (!useClaude) {
		if (!settings.geminiKey) throw new Error(t("Writing posts needs an AI: add a free Gemini key (or a Claude key) in Settings → Translation."));
		const answer = await gemini<{ posts: PlatformCaption[] }>(settings, { system: CAPTION_SYSTEM, prompt, schema: GEMINI_CAPTION_SCHEMA, signal });
		return tidy(answer.posts ?? []);
	}
	const anthropic = client(settings);
	const response = await anthropic.beta.messages.parse(
		{
			model: settings.translateModel,
			max_tokens: 16000,
			betas: ["server-side-fallback-2026-07-01"],
			fallbacks: "default",
			output_config: { effort: "medium", format: betaZodOutputFormat(CaptionSchema) },
			system: CAPTION_SYSTEM,
			messages: [{ role: "user", content: prompt }],
		},
		{ signal },
	);
	if (response.stop_reason === "refusal") throw new Error(t("Claude declined to write posts for this video."));
	return tidy(response.parsed_output?.posts ?? []);
}

function errorText(err: unknown): string {
	if (err instanceof Anthropic.AuthenticationError) return t("The Anthropic API key was refused. Check it in Settings.");
	if (err instanceof Anthropic.RateLimitError) return t("Claude is rate limiting this key. Lower 'parallel requests' in Settings or try again shortly.");
	if (err instanceof Anthropic.APIError) return t("Claude error {status}: {message}", { status: err.status ?? "", message: err.message });
	return err instanceof Error ? err.message : String(err);
}
