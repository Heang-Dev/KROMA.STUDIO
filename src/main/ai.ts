import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { CaptionRequest, PlatformCaption, Settings } from "@shared/types";
import { geminiWithFallback as gemini } from "./gemini";
import { googleTranslate } from "./google-translate";
import { mapLimit } from "./tools";

// Translation to Khmer and the post writer: Gemini (free tier), Google Translate (free, no key) or Claude (paid, best).

const BATCH = 60;
const CONTEXT_LINES = 6;

function client(settings: Settings): Anthropic {
	if (!settings.anthropicKey) throw new Error("Add your Anthropic API key in Settings to translate with Claude.");
	return new Anthropic({ apiKey: settings.anthropicKey, maxRetries: 4 });
}

const TRANSLATE_SYSTEM = `You translate video subtitles into natural, spoken Khmer (ភាសាខ្មែរ) for Cambodian viewers on YouTube, Facebook and TikTok.

Rules:
- Translate the meaning the way a Cambodian would say it out loud, not word by word. Keep it short enough to read on screen.
- Keep each line separate: return exactly one Khmer line for every numbered input line, with the same number.
- Use the earlier lines only to understand the scene; do not translate them again.
- Keep names consistent across the whole video. Write foreign names in Khmer script by sound, unless the notes give a spelling.
- Use pronouns and politeness that fit who is speaking to whom (e.g. បង/អូន, លោក, ព្រះករុណា for royalty in historical dramas).
- Write numbers with Khmer or Arabic digits as reads naturally. No quotes, no notes, no romanisation.
- If a line is only a sound or music, return an empty string for it.
- The Khmer is also read aloud as a voice-over. Each line shows how long it's on screen, like [2.1s]: keep the Khmer short enough to say naturally in about that time (roughly 5 Khmer syllables per second). Shorten wordy phrasing, keep the meaning. Never put the [time] in your answer.`;

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
): Promise<Record<string, string>> {
	if (settings.translateProvider === "google") {
		onProgress(0, "Translating with Google Translate");
		return googleTranslate(lines, (done, total) => onProgress(done / total, `Translating with Google Translate · ${done}/${total}`), signal);
	}

	const useGemini = settings.translateProvider === "gemini";
	if (useGemini && !settings.geminiKey) throw new Error("Add your free Gemini key in Settings → Translation, or choose Google Translate there.");
	const anthropic = useGemini ? null : client(settings);
	const name = useGemini ? "Gemini" : "Claude";
	const batches: { start: number; items: TranslateLine[] }[] = [];
	for (let i = 0; i < lines.length; i += BATCH) batches.push({ start: i, items: lines.slice(i, i + BATCH) });

	const result: Record<string, string> = {};
	let done = 0;
	const failures: string[] = [];
	onProgress(0, `Translating with ${name} · 0/${batches.length} batches`);

	// Gemini's free tier allows few requests a minute, so it runs fewer at once.
	await mapLimit(batches, useGemini ? Math.min(settings.concurrency, 2) : settings.concurrency, async ({ start, items }) => {
		const before = lines.slice(Math.max(0, start - CONTEXT_LINES), start);
		const prompt = [
			notes.trim() ? `Notes about this video:\n${notes.trim()}\n` : "",
			before.length ? `Earlier lines (context only):\n${before.map((l) => l.text).join("\n")}\n` : "",
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
					onRetry: (reason) => onProgress(done / batches.length, `${reason} · ${done}/${batches.length} batches done`),
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
				if (response.stop_reason === "refusal") throw new Error("Claude declined this part");
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
		onProgress(done / batches.length, `Translating with ${name} · ${done}/${batches.length} batches`);
	});

	// Lines Gemini couldn't do (busy, timed out) still get a translation from Google Translate.
	const missing = lines.filter((l) => result[l.id] === undefined);
	if (useGemini && missing.length) {
		onProgress(-1, `Gemini is busy: translating ${missing.length} lines with Google Translate`);
		try {
			Object.assign(result, await googleTranslate(missing, () => undefined, signal));
			fallbackCount.set(lines, missing.length);
			return result;
		} catch {
			// fall through to the Gemini error below
		}
	}
	if (failures.length === batches.length) throw new Error(failures[0]);
	return result;
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

const CAPTION_SYSTEM =
	"You write social media posts in Khmer for a Cambodian creator who shares videos with Khmer subtitles. " +
	"Write one post each for YouTube, Facebook and TikTok, in the style that works on that platform: " +
	"YouTube gets a searchable title (under 90 characters) and a description of 2-3 short paragraphs; " +
	"Facebook gets a warm, curiosity-building post; TikTok gets a very short hook. " +
	"Do not invent facts that aren't in the video. Hashtags: 5-10, mixing Khmer and English, without the # sign.";

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
	const prompt = `Video title: ${request.title || "(unknown)"}\n${request.context ? `Notes: ${request.context}\n` : ""}\nKhmer subtitles of the video:\n${transcript}`;
	const tidy = (posts: PlatformCaption[]) => posts.map((p) => ({ ...p, hashtags: p.hashtags.map((h) => h.replace(/^#/, "")) }));

	const useClaude = settings.translateProvider === "claude" ? Boolean(settings.anthropicKey) : !settings.geminiKey && Boolean(settings.anthropicKey);
	if (!useClaude) {
		if (!settings.geminiKey) throw new Error("Writing posts needs an AI: add a free Gemini key (or a Claude key) in Settings → Translation.");
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
	if (response.stop_reason === "refusal") throw new Error("Claude declined to write posts for this video.");
	return tidy(response.parsed_output?.posts ?? []);
}

function errorText(err: unknown): string {
	if (err instanceof Anthropic.AuthenticationError) return "The Anthropic API key was refused. Check it in Settings.";
	if (err instanceof Anthropic.RateLimitError) return "Claude is rate limiting this key. Lower 'parallel requests' in Settings or try again shortly.";
	if (err instanceof Anthropic.APIError) return `Claude error ${err.status ?? ""}: ${err.message}`;
	return err instanceof Error ? err.message : String(err);
}
