// Google Translate's free web endpoint (the one the translate.google.com widget uses): no key, no cost, basic quality.
// Lines are sent in batches joined by newlines and split back; a batch that doesn't split back cleanly is redone
// line by line so every line keeps its own translation.

import { t } from "@shared/i18n";

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MAX_QUERY_BYTES = 6000; // URL-encoded size of one request's text

export interface Line {
	id: string;
	text: string;
}

/** Groups lines into requests that stay under the URL size limit. */
export function batchLines(lines: Line[], maxBytes = MAX_QUERY_BYTES): Line[][] {
	const batches: Line[][] = [];
	let current: Line[] = [];
	let size = 0;
	for (const line of lines) {
		const bytes = encodeURIComponent(`${line.text.replace(/\n/g, " ")}\n`).length;
		if (current.length && size + bytes > maxBytes) {
			batches.push(current);
			current = [];
			size = 0;
		}
		current.push(line);
		size += bytes;
	}
	if (current.length) batches.push(current);
	return batches;
}

/** Joins the translated segments of a response (data[0] is [[translated, original, …], …]). */
export function parseResponse(data: unknown): string {
	if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
	return (data[0] as unknown[]).map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "")).join("");
}

async function request(text: string, signal: AbortSignal | undefined, target: string): Promise<string> {
	const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
	for (let attempt = 0; ; attempt++) {
		const response = await fetch(url, { signal, headers: { "User-Agent": "Mozilla/5.0" } });
		if (response.ok) return parseResponse(await response.json());
		if ((response.status !== 429 && response.status < 500) || attempt >= 4)
			throw new Error(response.status === 429 ? t("Google Translate is busy (too many requests). Try again in a few minutes, or use Gemini.") : t("Google Translate error {status}", { status: response.status }));
		await new Promise((r) => setTimeout(r, 2 ** attempt * 3000));
	}
}

export async function googleTranslate(lines: Line[], onBatch: (done: number, total: number) => void, signal?: AbortSignal, target = "km"): Promise<Record<string, string>> {
	const result: Record<string, string> = {};
	const batches = batchLines(lines);
	for (let i = 0; i < batches.length; i++) {
		const batch = batches[i];
		const joined = batch.map((l) => l.text.replace(/\n/g, " ")).join("\n");
		const parts = (await request(joined, signal, target)).split("\n").map((t) => t.trim());
		if (parts.length === batch.length) batch.forEach((l, k) => (result[l.id] = parts[k]));
		else for (const l of batch) result[l.id] = (await request(l.text, signal, target)).trim();
		onBatch(i + 1, batches.length);
		// One request at a time, gently spaced: the free endpoint blocks bursts.
		if (i < batches.length - 1) await new Promise((r) => setTimeout(r, 400));
	}
	return result;
}
