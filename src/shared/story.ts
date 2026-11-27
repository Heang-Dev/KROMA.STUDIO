// Story scripts, read the way the voice engine reads them (engine/studio/text_utils.py
// parse_story): `Speaker: text`, `Speaker (style): text` (also `：` and Khmer `៖`); other lines are the Narrator's.
// `[pause 2s]`, `[pause 500ms]` or `[pause]` (1 s) on a line of its own is silence between lines; inside a line it is
// silence between that line's words.

export type StoryItem = { type: "line"; speaker: string; text: string; style: string | null } | { type: "pause"; seconds: number };

/** `\p{Nd}` matches any decimal digit, like the engine's Python `\d`. */
const PAUSE = /\[pause(?:\s+(\p{Nd}+(?:\.\p{Nd}+)?)\s*(ms|s)?)?\]/giu;
const SPEAKER = /^([^:：៖()]{1,30}?)\s*(?:\(([^)]{1,40})\))?\s*[:：៖]\s*(.+)$/u;
/** Python's str.splitlines boundaries, as the engine splits a script. */
const LINE_BREAK = /\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/u;

/** At most this many speakers get their own voice . */
export const MAX_SPEAKERS = 6;

/** Seconds of one `[pause]` token, kept between 0.1 and 10 s; a bare `[pause]` is 1 s. */
function pauseSeconds(number: string | undefined, unit: string | undefined): number {
	if (number === undefined) return 1;
	// Any script's digits (Khmer ២, Arabic-Indic ٢, …) to ASCII, so Number reads them as Python's float does.
	const ascii = number.replace(/\p{Nd}/gu, (d) => {
		const zero = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xe50, 0xed0, 0x17e0, 0xff10].find((z) => d.charCodeAt(0) >= z && d.charCodeAt(0) <= z + 9);
		return zero === undefined ? d : String(d.charCodeAt(0) - zero);
	});
	const seconds = Number(ascii) / ((unit ?? "s").toLowerCase() === "ms" ? 1000 : 1);
	return Number.isFinite(seconds) ? Math.min(10, Math.max(0.1, seconds)) : 1;
}

/** A line's text cut at its `[pause]` tokens: text parts (trimmed, non-empty) and pause seconds, in order. */
export function splitPauses(text: string): Array<string | number> {
	const out: Array<string | number> = [];
	let pos = 0;
	for (const match of text.matchAll(PAUSE)) {
		const part = text.slice(pos, match.index).trim();
		if (part) out.push(part);
		out.push(pauseSeconds(match[1], match[2]));
		pos = match.index + match[0].length;
	}
	const tail = text.slice(pos).trim();
	if (tail) out.push(tail);
	return out;
}

/** The script's spoken lines and own-line pauses, in order. Inline pauses stay in a line's text. */
export function parseStory(script: string): StoryItem[] {
	const items: StoryItem[] = [];
	for (const raw of script.split(LINE_BREAK)) {
		const line = raw.trim();
		if (!line) continue;
		let speaker = "Narrator";
		let style: string | null = null;
		let text = line;
		const match = SPEAKER.exec(line);
		if (match && !/^https?$/i.test(match[1].trim())) {
			speaker = match[1].trim();
			style = (match[2] ?? "").trim() || null;
			text = match[3].trim();
		}
		const parts = splitPauses(text);
		if (parts.every((p) => typeof p === "number")) items.push(...parts.map((seconds): StoryItem => ({ type: "pause", seconds: seconds as number })));
		else items.push({ type: "line", speaker, text, style });
	}
	return items;
}

/** The speakers of a script in order of first appearance. */
export function detectSpeakers(script: string): string[] {
	const speakers: string[] = [];
	for (const item of parseStory(script)) if (item.type === "line" && !speakers.includes(item.speaker)) speakers.push(item.speaker);
	return speakers;
}

/** A line's words without its `[pause]` tokens (what the subtitles show). */
export const spokenText = (text: string) => splitPauses(text).filter((p): p is string => typeof p === "string").join(" ");

/** The example story (the engine's own). */
export const EXAMPLE_STORY = [
	"Narrator: កាលពីព្រេងនាយ នៅក្នុងភូមិមួយ មានក្មេងប្រុសម្នាក់ឈ្មោះ សុខា។",
	"[pause 1s]",
	"Sokha (excited): លោកតា! តើលោកតាកំពុងធ្វើអ្វី?",
	"Grandpa: តាកំពុងដាំដើមឈើ [pause 0.5s] សម្រាប់ចៅៗជំនាន់ក្រោយ។",
].join("\n");
