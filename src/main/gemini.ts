// Google Gemini through its REST API (Google AI Studio key; the free tier is enough for subtitles).
// Answers come back as JSON matching a schema, like Claude's structured output.

import type { Settings } from "@shared/types";
import { saveSettings } from "./settings";

const API = "https://generativelanguage.googleapis.com/v1beta";

export const GEMINI_FALLBACK_MODEL = "gemini-flash-latest";
/** Lighter model, tried when the main one stays busy. */
export const GEMINI_LITE_MODEL = "gemini-flash-lite-latest";
const REQUEST_TIMEOUT_MS = 40_000;
// Subtitles don't need deep reasoning; low thinking is much faster. Dropped for models that refuse the setting.
let sendThinkingLevel = true;

/** The saved model no longer exists for this key (Google retires model names). */
export class GeminiModelMissing extends Error {}
/** The free daily quota for this model is used up (resets the next day). */
export class GeminiQuotaExceeded extends Error {}

export interface GeminiModel {
	id: string;
	label: string;
}

/** The text models this key can use, newest first (asked live, so new Gemini versions show up by themselves). */
export async function listGeminiModels(key: string): Promise<GeminiModel[]> {
	const response = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
	if (!response.ok) throw new Error(geminiError(response.status, await response.text()));
	const data = (await response.json()) as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
	return (data.models ?? [])
		.filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /gemini/i.test(m.name) && !/embedding|tts|image|audio|live|vision|aqa|robotics|banana|transcribe|imagen|veo/i.test(m.name))
		.map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName ?? m.name }))
		.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
}

/** Asks Gemini for JSON matching `schema` (OpenAPI subset). Waits and retries when the free tier says "too many requests". */
export interface GeminiRequest {
	key: string;
	model: string;
	system: string;
	prompt: string;
	schema: object;
	/** Audio sent along with the prompt (speech to text). */
	audio?: { mimeType: string; data: string };
	/** Per-try time limit; listening to audio takes longer than translating text. */
	timeoutMs?: number;
	/** Thinking: "low" (fast, default; fine for translating) or "model" (the model's own default; listening needs it). */
	thinking?: "low" | "model";
	/** 0.4 by default (natural wording); 0 for exact work like transcribing. */
	temperature?: number;
	signal?: AbortSignal;
	onRetry?: (reason: string) => void;
}

export async function geminiJson<T>(opts: GeminiRequest): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		const parts: object[] = opts.audio ? [{ inlineData: opts.audio }, { text: opts.prompt }] : [{ text: opts.prompt }];
		const body = JSON.stringify({
			systemInstruction: { parts: [{ text: opts.system }] },
			contents: [{ role: "user", parts }],
			generationConfig: { responseMimeType: "application/json", responseSchema: opts.schema, temperature: opts.temperature ?? 0.4, ...(sendThinkingLevel && opts.thinking !== "model" ? { thinkingConfig: { thinkingLevel: "low" } } : {}) },
		});
		// Each try gets its own time limit, so a stalled request is retried instead of hanging for minutes.
		const timeout = AbortSignal.timeout(opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
		const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
		let response: Response;
		try {
			response = await fetch(`${API}/models/${encodeURIComponent(opts.model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": opts.key, "Content-Type": "application/json" }, body, signal });
		} catch (err) {
			if (opts.signal?.aborted) throw new Error("Cancelled");
			// One retry for a stalled request; after that the caller moves on (lighter model, then Google Translate).
			if (attempt >= 1) throw new Error(timeout.aborted ? "Gemini didn't answer in time (it's very busy right now)." : `Couldn't reach Gemini: ${(err as Error).message}`);
			opts.onRetry?.("Gemini is slow right now, retrying…");
			await sleep(2000, opts.signal);
			continue;
		}
		if (response.ok) {
			const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
			if (data.promptFeedback?.blockReason) throw new Error(`Gemini declined this part (${data.promptFeedback.blockReason}).`);
			const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
			if (!text) throw new Error(`Gemini returned nothing (${data.candidates?.[0]?.finishReason ?? "no answer"}).`);
			return JSON.parse(text) as T;
		}
		const errorText = await response.text();
		if (response.status === 400 && sendThinkingLevel && /thinking/i.test(errorText)) {
			sendThinkingLevel = false;
			continue;
		}
		if (response.status === 404) throw new GeminiModelMissing(geminiError(404, errorText));
		// A daily free quota won't come back by waiting a few seconds (no short retryDelay): stop and let the caller fall back.
		const hinted = Number(errorText.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1]);
		if (response.status === 429 && /quota/i.test(errorText) && !(hinted > 0 && hinted <= 60)) throw new GeminiQuotaExceeded(geminiError(429, errorText));
		const retryable = response.status === 429 || response.status >= 500;
		if (!retryable || attempt >= 2) throw new Error(geminiError(response.status, errorText));
		// The free tier answers 429 with how long to wait ("retryDelay": "23s"); 503 means "busy, try again". Never wait long.
		const wait = Math.min(20, (hinted || 2 ** attempt * 3) + 1);
		opts.onRetry?.(`Gemini is busy, retrying in ${Math.round(wait)} s…`);
		await sleep(wait * 1000, opts.signal);
	}
}

function geminiError(status: number, body: string): string {
	if (status === 400 && /api key/i.test(body)) return "The Gemini API key was refused. Check it in Settings → Translation.";
	if (status === 403) return "This Gemini key can't use that model. Pick another model in Settings → Translation.";
	if (status === 404) return "That Gemini model isn't available. Pick another one in Settings → Translation.";
	if (status === 429 && /quota/i.test(body)) return "Gemini's free daily limit is used up (it resets tomorrow). Switch to Google Translate, or add a Groq key for speech to text.";
	if (status === 429) return "Gemini's free limit is used up for now. Wait a minute, lower 'Parallel requests', or switch to Google Translate.";
	if (status === 503) return "Gemini is very busy right now. Try again in a few minutes.";
	const message = body.match(/"message":\s*"([^"]+)"/)?.[1];
	return `Gemini error ${status}${message ? `: ${message}` : ""}`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(new Error("Cancelled"));
			},
			{ once: true },
		);
	});
}

/**
 * Calls Gemini with the saved model. A retired model is replaced by the always-current Flash alias (and saved);
 * a model that stays busy gets one more try on the lighter Flash-Lite model.
 */
export async function geminiWithFallback<T>(settings: Settings, opts: Omit<GeminiRequest, "key" | "model"> & { onFallback?: (reason: "quota" | "busy") => void }): Promise<T> {
	try {
		return await geminiJson<T>({ key: settings.geminiKey, model: settings.geminiModel, ...opts });
	} catch (err) {
		if (opts.signal?.aborted) throw err;
		if (err instanceof GeminiModelMissing && settings.geminiModel !== GEMINI_FALLBACK_MODEL) {
			settings.geminiModel = GEMINI_FALLBACK_MODEL;
			saveSettings({ geminiModel: GEMINI_FALLBACK_MODEL });
			return geminiWithFallback<T>(settings, opts);
		}
		if (settings.geminiModel === GEMINI_LITE_MODEL || err instanceof GeminiModelMissing) throw err;
		const quota = err instanceof GeminiQuotaExceeded;
		opts.onRetry?.(quota ? "Gemini's free daily limit is reached, using the lighter Flash-Lite model…" : "Gemini is busy, trying the lighter Flash-Lite model…");
		opts.onFallback?.(quota ? "quota" : "busy");
		return geminiJson<T>({ key: settings.geminiKey, model: GEMINI_LITE_MODEL, ...opts });
	}
}
