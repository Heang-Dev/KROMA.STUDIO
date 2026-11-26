import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { CaptionRequest, PlatformCaption, Settings } from "@shared/types";
import { mapLimit } from "./tools";

// Claude translates subtitles to Khmer and writes the post text for each platform.

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
- If a line is only a sound or music, return an empty string for it.`;

const TranslationSchema = z.object({
	lines: z.array(z.object({ n: z.number().int(), km: z.string() })),
});

export interface TranslateLine {
	id: string;
	text: string;
}

export async function translateToKhmer(
	lines: TranslateLine[],
	notes: string,
	settings: Settings,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
): Promise<Record<string, string>> {
	const anthropic = client(settings);
	const batches: { start: number; items: TranslateLine[] }[] = [];
	for (let i = 0; i < lines.length; i += BATCH) batches.push({ start: i, items: lines.slice(i, i + BATCH) });

	const result: Record<string, string> = {};
	let done = 0;
	const failures: string[] = [];
	onProgress(0, `Translating with Claude · 0/${batches.length} batches`);

	await mapLimit(batches, settings.concurrency, async ({ start, items }) => {
		const before = lines.slice(Math.max(0, start - CONTEXT_LINES), start);
		const prompt = [
			notes.trim() ? `Notes about this video:\n${notes.trim()}\n` : "",
			before.length ? `Earlier lines (context only):\n${before.map((l) => l.text).join("\n")}\n` : "",
			"Translate these lines:",
			...items.map((l, k) => `${k + 1}. ${l.text}`),
		]
			.filter(Boolean)
			.join("\n");

		try {
			const response = await anthropic.beta.messages.parse(
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
			for (const line of response.parsed_output?.lines ?? []) {
				const item = items[line.n - 1];
				if (item) result[item.id] = line.km.trim();
			}
		} catch (err) {
			if (signal?.aborted) throw err;
			failures.push(errorText(err));
		}
		done += 1;
		onProgress(done / batches.length, `Translating with Claude · ${done}/${batches.length} batches`);
	});

	if (failures.length === batches.length) throw new Error(failures[0]);
	return result;
}

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

export async function writeCaptions(request: CaptionRequest, settings: Settings, signal?: AbortSignal): Promise<PlatformCaption[]> {
	const anthropic = client(settings);
	const transcript = request.transcript.length > 60_000 ? `${request.transcript.slice(0, 60_000)}\n…` : request.transcript;
	const response = await anthropic.beta.messages.parse(
		{
			model: settings.translateModel,
			max_tokens: 16000,
			betas: ["server-side-fallback-2026-07-01"],
			fallbacks: "default",
			output_config: { effort: "medium", format: betaZodOutputFormat(CaptionSchema) },
			system:
				"You write social media posts in Khmer for a Cambodian creator who shares videos with Khmer subtitles. " +
				"Write one post each for YouTube, Facebook and TikTok, in the style that works on that platform: " +
				"YouTube gets a searchable title (under 90 characters) and a description of 2-3 short paragraphs; " +
				"Facebook gets a warm, curiosity-building post; TikTok gets a very short hook. " +
				"Do not invent facts that aren't in the video. Hashtags: 5-10, mixing Khmer and English, without the # sign.",
			messages: [
				{
					role: "user",
					content: `Video title: ${request.title || "(unknown)"}\n${request.context ? `Notes: ${request.context}\n` : ""}\nKhmer subtitles of the video:\n${transcript}`,
				},
			],
		},
		{ signal },
	);
	if (response.stop_reason === "refusal") throw new Error("Claude declined to write posts for this video.");
	return (response.parsed_output?.posts ?? []).map((p) => ({ ...p, hashtags: p.hashtags.map((h) => h.replace(/^#/, "")) }));
}

function errorText(err: unknown): string {
	if (err instanceof Anthropic.AuthenticationError) return "The Anthropic API key was refused. Check it in Settings.";
	if (err instanceof Anthropic.RateLimitError) return "Claude is rate limiting this key. Lower 'parallel requests' in Settings or try again shortly.";
	if (err instanceof Anthropic.APIError) return `Claude error ${err.status ?? ""}: ${err.message}`;
	return err instanceof Error ? err.message : String(err);
}
