// The languages Kroma translates into. Khmer is the home language (designed and cloned KVS voices speak it);
// the others get Microsoft's free instant voices for the voice-over.

export interface TargetLanguage {
	code: string;
	/** English name, used in the UI and the translator's instructions. */
	name: string;
	/** Its own name, shown next to the English one. */
	native: string;
	/** Who watches: steers word choice in the translation. */
	audience: string;
	/** About how many syllables (or words) a person says per second, so a line fits its time on screen. */
	pace: string;
	/** Microsoft neural voices (free, instant). */
	voices: { id: string; label: string }[];
	/** A short line for voice samples. */
	sample: string;
	/** Extra rules for the translator, for this language only. */
	notes?: string;
}

export const TARGET_LANGUAGES: TargetLanguage[] = [
	{
		code: "km",
		name: "Khmer",
		native: "ខ្មែរ",
		audience: "Cambodian viewers",
		pace: "roughly 5 Khmer syllables per second",
		voices: [
			{ id: "km-KH-SreymomNeural", label: "Sreymom (female)" },
			{ id: "km-KH-PisethNeural", label: "Piseth (male)" },
		],
		sample: "សួស្តី ខ្ញុំរីករាយណាស់ដែលបានជួបអ្នកនៅថ្ងៃនេះ។ សូមស្ដាប់សំឡេងរបស់ខ្ញុំ ហើយជ្រើសរើសវាសម្រាប់វីដេអូរបស់អ្នក។",
		notes: [
			"Use pronouns and politeness that fit who is speaking to whom (e.g. បង/អូន, លោក, ព្រះករុណា for royalty in historical dramas).",
			"Write foreign names in Khmer script by sound. Write numbers with Khmer or Arabic digits as reads naturally.",
			"Write well-known foreign words the way Cambodians commonly write them, e.g. hamburger ហាំប៊ឺហ្គឺ, burger ប៊ឺហ្គឺ, pizza ភីហ្សា, salad សាឡាត់, coffee កាហ្វេ, chocolate សូកូឡា, cola កូឡា, French fries ដំឡូងបារាំងបំពង, calorie កាឡូរី, vitamin វីតាមីន, protein ប្រូតេអ៊ីន. Never invent a new spelling.",
			"Write only in Khmer script (brand names may stay in English letters): never Thai, Lao, Chinese or other scripts.",
		].join(" "),
	},
	{
		code: "th",
		name: "Thai",
		native: "ไทย",
		audience: "Thai viewers",
		pace: "roughly 6 Thai syllables per second",
		voices: [
			{ id: "th-TH-PremwadeeNeural", label: "Premwadee (female)" },
			{ id: "th-TH-NiwatNeural", label: "Niwat (male)" },
		],
		sample: "สวัสดีครับ ยินดีที่ได้รู้จัก ลองฟังเสียงของฉันแล้วเลือกใช้ในวิดีโอของคุณได้เลย",
		notes: "Use polite particles (ครับ/ค่ะ) and pronouns that fit who is speaking to whom.",
	},
	{
		code: "vi",
		name: "Vietnamese",
		native: "Tiếng Việt",
		audience: "Vietnamese viewers",
		pace: "roughly 5 Vietnamese syllables per second",
		voices: [
			{ id: "vi-VN-HoaiMyNeural", label: "Hoài My (female)" },
			{ id: "vi-VN-NamMinhNeural", label: "Nam Minh (male)" },
		],
		sample: "Xin chào, rất vui được gặp bạn hôm nay. Hãy nghe giọng của tôi và chọn nó cho video của bạn.",
		notes: "Choose pronouns (anh/em/chị/ông/bà/ta/ngươi) that fit the speakers' ages and relationship.",
	},
	{
		code: "lo",
		name: "Lao",
		native: "ລາວ",
		audience: "Lao viewers",
		pace: "roughly 5 Lao syllables per second",
		voices: [
			{ id: "lo-LA-KeomanyNeural", label: "Keomany (female)" },
			{ id: "lo-LA-ChanthavongNeural", label: "Chanthavong (male)" },
		],
		sample: "ສະບາຍດີ ຍິນດີທີ່ໄດ້ພົບທ່ານມື້ນີ້ ລອງຟັງສຽງຂອງຂ້ອຍ ແລ້ວເລືອກໃຊ້ໃນວິດີໂອຂອງທ່ານ",
	},
	{
		code: "en",
		name: "English",
		native: "English",
		audience: "international viewers",
		pace: "roughly 3 English words per second",
		voices: [
			{ id: "en-US-AvaNeural", label: "Ava (female)" },
			{ id: "en-US-AndrewNeural", label: "Andrew (male)" },
		],
		sample: "Hello, it's lovely to meet you today. Listen to my voice, and choose it for your video.",
	},
	{
		code: "id",
		name: "Indonesian",
		native: "Bahasa Indonesia",
		audience: "Indonesian viewers",
		pace: "roughly 6 Indonesian syllables per second",
		voices: [
			{ id: "id-ID-GadisNeural", label: "Gadis (female)" },
			{ id: "id-ID-ArdiNeural", label: "Ardi (male)" },
		],
		sample: "Halo, senang bertemu denganmu hari ini. Dengarkan suaraku dan pilih untuk videomu.",
	},
	{
		code: "ms",
		name: "Malay",
		native: "Bahasa Melayu",
		audience: "Malaysian viewers",
		pace: "roughly 6 Malay syllables per second",
		voices: [
			{ id: "ms-MY-YasminNeural", label: "Yasmin (female)" },
			{ id: "ms-MY-OsmanNeural", label: "Osman (male)" },
		],
		sample: "Helo, gembira bertemu dengan anda hari ini. Dengar suara saya dan pilih untuk video anda.",
	},
];

export const DEFAULT_LANGUAGE = "km";

// The script each language is written in, besides Latin letters (always allowed: names, brands, numbers).
const OWN_SCRIPT: Record<string, RegExp> = {
	km: /\p{Script=Khmer}/u,
	th: /\p{Script=Thai}/u,
	lo: /\p{Script=Lao}/u,
};
const LATIN = /\p{Script=Latin}/u;

/**
 * True when a translated line has letters of any other script (a Thai or Hebrew letter inside Khmer, Chinese left
 * untranslated), so it should be translated again. Marks, digits and punctuation never count.
 */
export function hasWrongScript(text: string, code: string): boolean {
	const own = OWN_SCRIPT[code];
	for (const ch of text.match(/\p{L}/gu) ?? []) if (!LATIN.test(ch) && !own?.test(ch)) return true;
	return false;
}

export function languageOf(code?: string): TargetLanguage {
	return TARGET_LANGUAGES.find((l) => l.code === code) ?? TARGET_LANGUAGES[0];
}

/** The language an instant (Microsoft) voice speaks, from its id ("th-TH-…" → Thai). */
export function languageOfVoice(voice: string): TargetLanguage | undefined {
	return TARGET_LANGUAGES.find((l) => l.voices.some((v) => v.id === voice));
}
