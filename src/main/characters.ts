import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Settings } from "@shared/types";
import { geminiWithFallback as gemini } from "./gemini";

// Finds who says each subtitle line (from the dialogue, read in order) and suggests a voice for each character.
// It reads the words only, not the sound, so it's a guess the creator can fix line by line.

export interface CharacterLine {
	id: string;
	/** The original line (e.g. Chinese), or the Khmer when there's no original. */
	text: string;
	start: number;
}

export interface VoiceChoice {
	id: string;
	label: string;
	description: string;
}

export interface FoundCharacter {
	name: string;
	description: string;
	voice: string;
}

export interface CharactersResult {
	characters: FoundCharacter[];
	/** Line id → character name. */
	speakers: Record<string, string>;
}

const BATCH = 250;

const SYSTEM = `You read the subtitles of a video in order and work out who is speaking each line, so each character can get their own voice in a dubbed version.

Rules:
- Name each character the way the video does (a name, or a role like "Mother", "Boss", "Host"). Write names in English letters. Keep the same name for the same person all the way through.
- A voice talking to the viewer and not in the scene is "Narrator". In a one-person video (vlog, explainer) every line is that one person.
- Use the dialogue to tell speakers apart: questions and answers, names and titles people call each other, how they speak. When you can't tell, give the line to whoever was most likely speaking around it; don't make up extra characters.
- Describe each character (not the voice) in a few words: gender, age (child, young adult, adult, old) and role, e.g. "old man, the grandfather".
- Choose a voice for each character from the voice list by its id: match gender and age first, then the mood. Never give a child's voice to an adult or an adult's voice to a child: an adult with no exact match gets the closest adult voice of the same gender. Different characters should get different voices when the list allows.
- Return every numbered line with its speaker.`;

const ResultSchema = z.object({
	characters: z.array(z.object({ name: z.string(), description: z.string(), voice: z.string() })),
	lines: z.array(z.object({ n: z.number().int(), speaker: z.string() })),
});

const GEMINI_SCHEMA = {
	type: "OBJECT",
	properties: {
		characters: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "STRING" }, voice: { type: "STRING" } }, required: ["name", "description", "voice"] } },
		lines: { type: "ARRAY", items: { type: "OBJECT", properties: { n: { type: "INTEGER" }, speaker: { type: "STRING" } }, required: ["n", "speaker"] } },
	},
	required: ["characters", "lines"],
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export async function findCharacters(
	lines: CharacterLine[],
	voices: VoiceChoice[],
	notes: string,
	settings: Settings,
	onProgress: (progress: number, message: string) => void,
	signal?: AbortSignal,
): Promise<CharactersResult> {
	// Claude when it's the chosen translator (and has a key), otherwise Gemini; Google Translate can't do this.
	const useClaude = settings.translateProvider === "claude" ? Boolean(settings.anthropicKey) : !settings.geminiKey && Boolean(settings.anthropicKey);
	if (!useClaude && !settings.geminiKey) throw new Error("Finding characters needs your free Gemini key (Settings → Translation) or a Claude key.");
	const name = useClaude ? "Claude" : "Gemini";
	const anthropic = useClaude ? new Anthropic({ apiKey: settings.anthropicKey, maxRetries: 4 }) : null;

	const characters = new Map<string, FoundCharacter>();
	const speakers: Record<string, string> = {};
	const batches = Math.ceil(lines.length / BATCH);
	const voiceList = voices.map((v) => `- ${v.id}: ${v.label}, ${v.description}`).join("\n");

	for (let b = 0; b < batches; b++) {
		onProgress(b / batches, `Finding characters with ${name}${batches > 1 ? ` · part ${b + 1}/${batches}` : ""}`);
		const items = lines.slice(b * BATCH, (b + 1) * BATCH);
		const known = [...characters.values()];
		const prompt = [
			notes.trim() ? `Notes about this video:\n${notes.trim()}\n` : "",
			`Voices to choose from:\n${voiceList}\n`,
			known.length ? `Characters found earlier in the video (reuse these names and voices):\n${known.map((c) => `- ${c.name}: ${c.description} (voice ${c.voice})`).join("\n")}\n` : "",
			"Subtitles:",
			...items.map((l, k) => `${k + 1}. [${clock(l.start)}] ${l.text}`),
		]
			.filter(Boolean)
			.join("\n");

		let answer: z.infer<typeof ResultSchema>;
		if (anthropic) {
			const response = await anthropic.beta.messages.parse(
				{
					model: settings.translateModel,
					max_tokens: 16000,
					betas: ["server-side-fallback-2026-07-01"],
					fallbacks: "default",
					output_config: { effort: "low", format: betaZodOutputFormat(ResultSchema) },
					system: SYSTEM,
					messages: [{ role: "user", content: prompt }],
				},
				{ signal },
			);
			if (response.stop_reason === "refusal") throw new Error("Claude declined to read these subtitles.");
			if (!response.parsed_output) throw new Error("Claude's answer was cut off. Try again.");
			answer = response.parsed_output;
		} else {
			answer = await gemini<z.infer<typeof ResultSchema>>(settings, { system: SYSTEM, prompt, schema: GEMINI_SCHEMA, signal, onRetry: (reason) => onProgress(b / batches, reason) });
		}

		const ids = new Set(voices.map((v) => v.id));
		for (const c of answer.characters ?? []) {
			const nameKey = c.name.trim();
			if (!nameKey || characters.has(nameKey)) continue;
			characters.set(nameKey, { name: nameKey, description: c.description.trim(), voice: ids.has(c.voice) ? c.voice : voices[characters.size % voices.length].id });
		}
		for (const l of answer.lines ?? []) {
			const item = items[l.n - 1];
			const who = l.speaker?.trim();
			if (!item || !who) continue;
			if (!characters.has(who)) characters.set(who, { name: who, description: "", voice: voices[characters.size % voices.length].id });
			speakers[item.id] = who;
		}
	}

	// Lines it skipped go to whoever spoke just before.
	let last: string | undefined;
	for (const l of lines) {
		if (speakers[l.id]) last = speakers[l.id];
		else if (last) speakers[l.id] = last;
	}
	// Keep characters in the order they first speak, and drop any with no lines.
	const order = [...new Set(lines.map((l) => speakers[l.id]).filter(Boolean))];
	return { characters: order.map((n) => characters.get(n)!).filter(Boolean), speakers };
}
