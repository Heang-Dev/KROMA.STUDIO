// Episode covers (thumbnails): a frame of the video with the episode's number and the series title on it. Here: reading
// the episode number from a project, and the label's wording. Drawing is the renderer's coverRender.

export type CoverTemplate = "badge" | "bigNumber" | "banner" | "minimal";
export type CoverLabel = "ep" | "khmer" | "part" | "custom";

export const COVER_TEMPLATES: { value: CoverTemplate; label: string; description: string }[] = [
	{ value: "badge", label: "Badge", description: "A bright episode badge in the corner, the title along the bottom" },
	{ value: "bigNumber", label: "Big number", description: "A huge episode number on the side" },
	{ value: "banner", label: "Banner", description: "A coloured band across the bottom with the title and episode" },
	{ value: "minimal", label: "Minimal", description: "Just the episode, small and clean" },
];

export const COVER_LABELS: { value: CoverLabel; label: string }[] = [
	{ value: "khmer", label: "ភាគ ៥" },
	{ value: "ep", label: "EP 5" },
	{ value: "part", label: "Part 5" },
	{ value: "custom", label: "My own word" },
];

/** A project's cover settings (kept with the project, and the Batch default). */
export interface CoverSettings {
	template: CoverTemplate;
	label: CoverLabel;
	/** The word before the number when label is "custom" (e.g. "Episode", "វគ្គ"). */
	customWord?: string;
	/** The title on the cover; empty = the series (folder) name. */
	title?: string;
	/** The badge / banner colour. */
	color: string;
	/** Which moment of the video, in seconds; missing = a sharp frame Kroma picks. */
	time?: number;
	/** The episode number; missing = read from the project's name. */
	episode?: number;
}

export const DEFAULT_COVER: CoverSettings = { template: "badge", label: "khmer", color: "#e11d48" };

const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";
export const toKhmerDigits = (n: number) => String(n).replace(/\d/g, (d) => KHMER_DIGITS[Number(d)]);
const fromKhmerDigits = (s: string) => s.replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));

/**
 * The episode number in a project's file or video name: "05 - Title" (how the Download Center names episodes),
 * "EP5", "Ep. 12", "第3集", "ភាគ ៥", "Part 2", "#7". Null when there's none.
 */
export function episodeNumber(...names: (string | null | undefined)[]): number | null {
	for (const raw of names) {
		if (!raw) continue;
		const name = fromKhmerDigits(raw.split(/[\\/]/).pop() ?? raw);
		const patterns = [/^\s*(\d{1,4})\s*[-–.]\s/, /\bep(?:isode)?\.?\s*(\d{1,4})\b/i, /第\s*(\d{1,4})\s*[集话話期]/, /ភាគ\s*(\d{1,4})/, /\bpart\s*(\d{1,4})\b/i, /#\s*(\d{1,4})\b/];
		for (const p of patterns) {
			const m = name.match(p);
			if (m) return Number.parseInt(m[1], 10);
		}
	}
	return null;
}

/** The label on the cover: "ភាគ ៥", "EP 5", "Part 5" or "<word> 5". */
export function episodeLabel(n: number, label: CoverLabel, customWord = ""): string {
	if (label === "khmer") return `ភាគ ${toKhmerDigits(n)}`;
	if (label === "part") return `Part ${n}`;
	if (label === "custom") return `${customWord.trim() || "EP"} ${/[ក-៿]/.test(customWord) ? toKhmerDigits(n) : n}`;
	return `EP ${n}`;
}

/** The title a cover shows when none is typed: the series folder ("My Drama"), else the project's name without its number. */
export function defaultCoverTitle(projectPath: string | null, projectName: string): string {
	const parts = projectPath?.split(/[\\/]/) ?? [];
	const folder = parts.length > 1 ? parts[parts.length - 2] : "";
	const generic = !folder || /^(projects|downloads|kroma studio)$/i.test(folder);
	return (generic ? projectName.replace(/^\s*\d{1,4}\s*[-–.]\s*/, "") : folder).trim();
}

/** Cover sizes: what YouTube asks for (16:9), and a phone-shaped one for TikTok and Reels (9:16). */
export const COVER_SIZE = { "16:9": { width: 1280, height: 720 }, "9:16": { width: 1080, height: 1920 } } as const;
