// The guide's content in both languages. Text uses a small markdown subset: **bold**, `code`, [link](url).
import type { Lang } from "./index";

export type DocBlock = { p: string } | { steps: (string | { text: string; code: string })[] } | { code: string };
export interface DocSection {
	id: string;
	title: string;
	blocks: DocBlock[];
}
export interface DocsContent {
	kicker: string;
	title: string;
	intro: string;
	toc: string;
	sections: DocSection[];
}

const ISSUES = "https://github.com/Heang-Dev/KROMA.STUDIO/issues";

const en: DocsContent = {
	kicker: "Getting started",
	title: "Kroma Studio guide",
	intro: `From installing the app to posting your first Khmer video. Something missing or wrong? [Open an issue on GitHub](${ISSUES}).`,
	toc: "Docs",
	sections: [
		{
			id: "install",
			title: "Install",
			blocks: [
				{ p: "Download the app for your system from the [download section](/#download). Windows and Linux builds include FFmpeg and yt-dlp. The installers aren't code-signed yet, so your system may warn you the first time:" },
				{
					steps: [
						{ text: "**macOS**: move Kroma Studio to Applications. If it says the app is damaged or won't open, run this once in Terminal (on a Mac, also install the tools: `brew install ffmpeg yt-dlp`):", code: 'xattr -cr "/Applications/Kroma Studio.app"' },
						"**Windows**: on “Windows protected your PC”, click **More info**, then **Run anyway**.",
						{ text: "**Linux**: make the AppImage executable, or install the .deb:", code: "chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage" },
					],
				},
				{ p: "After that Kroma updates itself: a new version downloads in the background, and **Restart to update** appears in the title bar." },
			],
		},
		{
			id: "keys",
			title: "Add your keys",
			blocks: [
				{ p: "Kroma uses AI services with your own keys, so you pay nothing to Kroma and only what a service charges, which for most is nothing to start. Keys are encrypted with your system's keychain. The first time, Kroma opens Settings → Translation." },
				{
					steps: [
						"**Translation and posts**: a free [Gemini key](https://aistudio.google.com/apikey) from Google AI Studio. Or choose Google Translate, which needs no key, or Claude for the best wording (paid).",
						"**Speech to text**: a free [Groq key](https://console.groq.com/keys) (Whisper large-v3: a whole movie in seconds), in Settings → Speech to Text.",
					],
				},
			],
		},
		{
			id: "first-video",
			title: "Your first Khmer video",
			blocks: [
				{ p: "The step bar at the top of the editor shows what's done and what's next." },
				{
					steps: [
						"**Video**: in Media, paste a link (YouTube, Bilibili, Douyin and 1,000+ sites, even a whole share message) and press Get. Or import a file.",
						"**Subtitles & Khmer**: in Translate, check the spoken language and press **Make Khmer subtitles**. Kroma uses the site's own subtitles when it has them, otherwise speech-to-text, then translates.",
						"**Fix anything** by typing in the Subtitles list. **Find & replace** fixes a word in every line and can remember it for future translations. Notes for the translator (names, who's who, tone) improve the next translation.",
						"**Export**: press Export at the top right and pick a size.",
					],
				},
			],
		},
		{
			id: "characters",
			title: "Characters & voices",
			blocks: [
				{ p: "In Voice, the Characters section gives every person in the video their own voice." },
				{
					steps: [
						"**Find automatically** reads the dialogue (about 20 seconds) and suggests a voice for each character, or **Add a character** yourself.",
						"Pick a voice for each character. ▶ plays a sample. Voices come grouped: Narration, Palace & royalty, Heroes & fighters, Modern drama, Family & elders, Children & teens, Villains & mood.",
						"To change who says a line, click the coloured name on that line in the Subtitles list.",
						"Press **Make voice-over**. The original voices are removed automatically (music and effects stay); switch that off in Voice → Mix. Removing voices needs [uv](https://docs.astral.sh/uv/); Settings → About shows the install command for your system.",
						"**Clone a voice** in Voices → Clone voice: read the text on screen for about 15 seconds, listen back, and clone. Only clone your own voice, or with the speaker's permission.",
					],
				},
			],
		},
		{
			id: "voice-engine",
			title: "The Khmer voice engine",
			blocks: [
				{ p: "The 36 designed voices and cloned voices come from the Khmer Voice Studio engine (VoxCPM2). It needs a GPU to be quick: run it on a free Google Colab GPU and paste the address and token it prints into Settings → Voice Engine, or run it on your own computer. The free instant voices (Microsoft) need no engine and work in every language." },
			],
		},
		{
			id: "style",
			title: "Style & objects",
			blocks: [
				{ p: "In Style, set the subtitle font size, colours, background and position, and show the original line above the Khmer one if you like. In Objects, **Cover original subtitles** blurs the burned-in Chinese subtitles in one click; add blur boxes, your logo or text anywhere, for the whole video or part of it." },
			],
		},
		{
			id: "export",
			title: "Export",
			blocks: [
				{ p: "Export at the top right (or the Export step) offers three sizes, each with an estimated file size:" },
				{ steps: ["**Small**: about 75 MB per 5 minutes at 1080p, for TikTok and Facebook (they shrink videos anyway).", "**Standard**: quick to export, good for YouTube.", "**High**: the best quality, about 3× slower."] },
			],
		},
		{
			id: "posting",
			title: "Posting",
			blocks: [
				{ p: "Kroma posts through Upload-Post, which YouTube, Facebook and TikTok have already approved, so your posts go out publicly." },
				{
					steps: [
						"Make a free account at [upload-post.com](https://app.upload-post.com/), create an API key, and paste it into Settings → Posting.",
						"Press Connect and sign in to YouTube, Facebook and TikTok in your browser. Pick your Facebook Page (Facebook only allows posting to Pages).",
						"In Post, press **Write the posts** (edit anything), tick the platforms and press **Post**. Kroma exports (or reuses your last export), uploads once, and keeps a history with links.",
					],
				},
				{ p: "YouTube and Facebook work on Upload-Post's free plan (10 posts a month); TikTok needs their Basic plan." },
			],
		},
		{
			id: "languages",
			title: "Other languages",
			blocks: [{ p: "In Translate, choose **Translate to**: Khmer, Thai, Vietnamese, Lao, English, Indonesian or Malay. The posts and the instant voices follow the language. The designed voices are made for Khmer." }],
		},
		{
			id: "troubleshooting",
			title: "Troubleshooting",
			blocks: [
				{
					steps: [
						"**“Missing ffmpeg / yt-dlp”**: on a Mac run `brew install ffmpeg yt-dlp`; Windows and Linux builds include them. Settings → About shows what's found.",
						"**A download fails**: some sites need you to be signed in. In Settings → Downloads choose the browser you're signed in with. Videos with DRM can't be downloaded.",
						"**“The KVS voice engine isn't reachable”**: start the engine (Colab or your computer) and check its address in Settings → Voice Engine, or use the instant voices.",
						"**Gemini is busy**: free keys have a daily limit. Kroma falls back to Google Translate for the lines it couldn't do and tells you; translate again later for Gemini's wording.",
						`**An export failed**: the full log is saved as \`last-export-error.log\` in Kroma's settings folder. Attach it to a [GitHub issue](${ISSUES}).`,
					],
				},
			],
		},
	],
};

const km: DocsContent = {
	kicker: "ចាប់ផ្តើម",
	title: "ការណែនាំ Kroma Studio",
	intro: `ចាប់ពីការដំឡើងកម្មវិធី រហូតដល់ការបង្ហោះវីដេអូខ្មែរដំបូងរបស់អ្នក។ មានអ្វីខ្វះ ឬខុស? [បើក issue នៅលើ GitHub](${ISSUES})។`,
	toc: "ឯកសារណែនាំ",
	sections: [
		{
			id: "install",
			title: "ដំឡើង",
			blocks: [
				{ p: "ទាញយកកម្មវិធីសម្រាប់ប្រព័ន្ធរបស់អ្នក ពី[ផ្នែកទាញយក](/#download)។ កំណែ Windows និង Linux មាន FFmpeg និង yt-dlp ស្រាប់។ កម្មវិធីដំឡើងមិនទាន់មានហត្ថលេខាកូដនៅឡើយទេ ដូច្នេះប្រព័ន្ធរបស់អ្នកអាចព្រមានពេលបើកលើកដំបូង៖" },
				{
					steps: [
						{ text: "**macOS**៖ ដាក់ Kroma Studio ទៅក្នុង Applications។ បើវាបង្ហាញថាកម្មវិធីខូច ឬបើកមិនកើត សូមដំណើរការពាក្យបញ្ជានេះម្តងក្នុង Terminal (លើ Mac សូមដំឡើងឧបករណ៍ផងដែរ៖ `brew install ffmpeg yt-dlp`)៖", code: 'xattr -cr "/Applications/Kroma Studio.app"' },
						"**Windows**៖ ពេលឃើញ «Windows protected your PC» ចុច **More info** រួចចុច **Run anyway**។",
						{ text: "**Linux**៖ ធ្វើឱ្យ AppImage អាចដំណើរការបាន ឬដំឡើងកញ្ចប់ .deb៖", code: "chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage" },
					],
				},
				{ p: "ក្រោយមក Kroma ធ្វើបច្ចុប្បន្នភាពដោយខ្លួនឯង៖ កំណែថ្មីទាញយកនៅពីក្រោយ ហើយប៊ូតុង **Restart to update** លេចឡើងនៅរបារខាងលើ។" },
			],
		},
		{
			id: "keys",
			title: "បន្ថែម key របស់អ្នក",
			blocks: [
				{ p: "Kroma ប្រើសេវា AI ជាមួយ key ផ្ទាល់ខ្លួនរបស់អ្នក ដូច្នេះអ្នកមិនបង់អ្វីឱ្យ Kroma ទេ គឺបង់តែអ្វីដែលសេវានោះគិតប៉ុណ្ណោះ ដែលភាគច្រើនឥតគិតថ្លៃនៅពេលចាប់ផ្តើម។ key ត្រូវបានអ៊ិនគ្រីបដោយ keychain នៃប្រព័ន្ធរបស់អ្នក។ ពេលបើកលើកដំបូង Kroma បើក Settings → Translation ឱ្យ។" },
				{
					steps: [
						"**ការបកប្រែ និងការសរសេរការបង្ហោះ**៖ [key Gemini](https://aistudio.google.com/apikey) ឥតគិតថ្លៃពី Google AI Studio។ ឬជ្រើស Google Translate ដែលមិនត្រូវការ key ឬ Claude សម្រាប់ពាក្យពេចន៍ល្អបំផុត (បង់ប្រាក់)។",
						"**បំប្លែងសំឡេងទៅជាអក្សរ**៖ [key Groq](https://console.groq.com/keys) ឥតគិតថ្លៃ (Whisper large-v3៖ ភាពយន្តមួយរឿងក្នុងប៉ុន្មានវិនាទី) នៅក្នុង Settings → Speech to Text។",
					],
				},
			],
		},
		{
			id: "first-video",
			title: "វីដេអូខ្មែរដំបូងរបស់អ្នក",
			blocks: [
				{ p: "របារជំហាននៅខាងលើកម្មវិធីកែ បង្ហាញអ្វីដែលធ្វើរួច និងអ្វីដែលត្រូវធ្វើបន្ទាប់។" },
				{
					steps: [
						"**វីដេអូ**៖ នៅក្នុង Media បិទភ្ជាប់តំណ (YouTube, Bilibili, Douyin និងគេហទំព័រជាង ១០០០ សូម្បីតែសារចែករំលែកទាំងមូល) រួចចុច Get។ ឬនាំចូលឯកសារ។",
						"**អក្សររត់ និងភាសាខ្មែរ**៖ នៅក្នុង Translate ពិនិត្យភាសានិយាយ រួចចុច **Make Khmer subtitles**។ Kroma ប្រើអក្សររត់ផ្ទាល់របស់គេហទំព័របើមាន បើមិនដូច្នោះទេ បំប្លែងសំឡេងទៅជាអក្សរ រួចបកប្រែ។",
						"**កែអ្វីក៏បាន** ដោយវាយក្នុងបញ្ជីអក្សររត់។ **Find & replace** កែពាក្យមួយក្នុងគ្រប់ឃ្លា ហើយអាចចងចាំវាសម្រាប់ការបកប្រែលើកក្រោយ។ កំណត់ចំណាំសម្រាប់អ្នកបកប្រែ (ឈ្មោះ តួអង្គ សំនៀង) ធ្វើឱ្យការបកប្រែបន្ទាប់ល្អជាងមុន។",
						"**នាំចេញ**៖ ចុច Export នៅខាងស្តាំខាងលើ រួចជ្រើសទំហំ។",
					],
				},
			],
		},
		{
			id: "characters",
			title: "តួអង្គ និងសំឡេង",
			blocks: [
				{ p: "នៅក្នុង Voice ផ្នែក Characters ដាក់សំឡេងផ្ទាល់ខ្លួនឱ្យមនុស្សម្នាក់ៗក្នុងវីដេអូ។" },
				{
					steps: [
						"**Find automatically** អានការសន្ទនា (ប្រហែល ២០ វិនាទី) ហើយណែនាំសំឡេងសម្រាប់តួអង្គនីមួយៗ ឬចុច **Add a character** ដើម្បីបន្ថែមដោយខ្លួនឯង។",
						"ជ្រើសសំឡេងសម្រាប់តួអង្គនីមួយៗ។ ▶ ចាក់សំឡេងគំរូ។ សំឡេងត្រូវបានបែងចែកជាក្រុម៖ និទានរឿង រាជវាំង វីរបុរស រឿងសម័យថ្មី គ្រួសារ កុមារ និងតួអាក្រក់។",
						"ដើម្បីប្តូរអ្នកនិយាយឃ្លាមួយ ចុចឈ្មោះពណ៌នៅលើឃ្លានោះក្នុងបញ្ជីអក្សររត់។",
						"ចុច **Make voice-over**។ សំឡេងនិយាយដើមត្រូវបានដកចេញដោយស្វ័យប្រវត្តិ (តន្ត្រី និងសំឡេងបរិយាកាសនៅដដែល)។ អាចបិទវានៅក្នុង Voice → Mix។ ការដកសំឡេងត្រូវការ [uv](https://docs.astral.sh/uv/)។ Settings → About បង្ហាញពាក្យបញ្ជាដំឡើងសម្រាប់ប្រព័ន្ធរបស់អ្នក។",
						"**ចម្លងសំឡេង** នៅក្នុង Voices → Clone voice៖ អានអត្ថបទនៅលើអេក្រង់ប្រហែល ១៥ វិនាទី ស្តាប់ឡើងវិញ រួចចម្លង។ ចម្លងតែសំឡេងរបស់អ្នកផ្ទាល់ ឬមានការអនុញ្ញាតពីម្ចាស់សំឡេងប៉ុណ្ណោះ។",
					],
				},
			],
		},
		{
			id: "voice-engine",
			title: "ម៉ាស៊ីនសំឡេងខ្មែរ",
			blocks: [
				{ p: "សំឡេងរចនាទាំង ៣៦ និងសំឡេងចម្លង មកពីម៉ាស៊ីន Khmer Voice Studio (VoxCPM2)។ វាត្រូវការ GPU ដើម្បីឱ្យលឿន៖ ដំណើរការវានៅលើ GPU ឥតគិតថ្លៃរបស់ Google Colab ហើយបិទភ្ជាប់អាសយដ្ឋាន និង token ដែលវាបង្ហាញ ទៅក្នុង Settings → Voice Engine ឬដំណើរការវាលើកុំព្យូទ័ររបស់អ្នក។ សំឡេងរហ័សឥតគិតថ្លៃ (Microsoft) មិនត្រូវការម៉ាស៊ីនទេ ហើយប្រើបានគ្រប់ភាសា។" },
			],
		},
		{
			id: "style",
			title: "រចនាប័ទ្ម និងវត្ថុ",
			blocks: [
				{ p: "នៅក្នុង Style កំណត់ទំហំអក្សររត់ ពណ៌ ផ្ទៃខាងក្រោយ និងទីតាំង ហើយបង្ហាញឃ្លាដើមពីលើឃ្លាខ្មែរ បើអ្នកចង់។ នៅក្នុង Objects ប៊ូតុង **Cover original subtitles** ធ្វើឱ្យព្រិលអក្សររត់ចិនដែលដិតក្នុងវីដេអូដោយចុចតែម្តង។ បន្ថែមប្រអប់ព្រិល ឡូហ្គោ ឬអក្សរនៅកន្លែងណាក៏បាន សម្រាប់វីដេអូទាំងមូល ឬមួយផ្នែក។" },
			],
		},
		{
			id: "export",
			title: "នាំចេញ",
			blocks: [
				{ p: "ប៊ូតុង Export នៅខាងស្តាំខាងលើ (ឬជំហាន Export) មានទំហំបីប្រភេទ ព្រមទាំងប៉ាន់ស្មានទំហំឯកសារ៖" },
				{ steps: ["**Small**៖ ប្រហែល 75 MB ក្នុង ៥ នាទី នៅ 1080p សម្រាប់ TikTok និង Facebook (ពួកវាបង្រួមវីដេអូយ៉ាងណាក៏ដោយ)។", "**Standard**៖ នាំចេញលឿន ល្អសម្រាប់ YouTube។", "**High**៖ គុណភាពល្អបំផុត យឺតជាងប្រហែល ៣ ដង។"] },
			],
		},
		{
			id: "posting",
			title: "ការបង្ហោះ",
			blocks: [
				{ p: "Kroma បង្ហោះតាមរយៈ Upload-Post ដែល YouTube, Facebook និង TikTok បានអនុម័តរួចហើយ ដូច្នេះការបង្ហោះរបស់អ្នកចេញជាសាធារណៈ។" },
				{
					steps: [
						"បង្កើតគណនីឥតគិតថ្លៃនៅ [upload-post.com](https://app.upload-post.com/) បង្កើត API key ហើយបិទភ្ជាប់ទៅក្នុង Settings → Posting។",
						"ចុច Connect ហើយចូលគណនី YouTube, Facebook និង TikTok ក្នុងកម្មវិធីរុករករបស់អ្នក។ ជ្រើស Facebook Page របស់អ្នក (Facebook អនុញ្ញាតឱ្យបង្ហោះតែទៅ Page ប៉ុណ្ណោះ)។",
						"នៅក្នុង Post ចុច **Write the posts** (កែអ្វីក៏បាន) ជ្រើសវេទិកា រួចចុច **Post**។ Kroma នាំចេញ (ឬប្រើវីដេអូដែលនាំចេញចុងក្រោយ) ផ្ទុកឡើងម្តង ហើយរក្សាប្រវត្តិព្រមទាំងតំណ។",
					],
				},
				{ p: "YouTube និង Facebook ប្រើបានជាមួយគម្រោងឥតគិតថ្លៃរបស់ Upload-Post (១០ ការបង្ហោះក្នុងមួយខែ) ចំណែក TikTok ត្រូវការគម្រោង Basic របស់ពួកគេ។" },
			],
		},
		{
			id: "languages",
			title: "ភាសាផ្សេងទៀត",
			blocks: [{ p: "នៅក្នុង Translate ជ្រើស **Translate to**៖ ខ្មែរ ថៃ វៀតណាម ឡាវ អង់គ្លេស ឥណ្ឌូនេស៊ី ឬម៉ាឡេ។ ការបង្ហោះ និងសំឡេងរហ័សធ្វើតាមភាសានោះ។ សំឡេងរចនាត្រូវបានបង្កើតសម្រាប់ភាសាខ្មែរ។" }],
		},
		{
			id: "troubleshooting",
			title: "ដោះស្រាយបញ្ហា",
			blocks: [
				{
					steps: [
						"**«Missing ffmpeg / yt-dlp»**៖ លើ Mac ដំណើរការ `brew install ffmpeg yt-dlp`។ កំណែ Windows និង Linux មានស្រាប់។ Settings → About បង្ហាញអ្វីដែលរកឃើញ។",
						"**ទាញយកមិនបាន**៖ គេហទំព័រខ្លះតម្រូវឱ្យអ្នកចូលគណនី។ នៅក្នុង Settings → Downloads ជ្រើសកម្មវិធីរុករកដែលអ្នកបានចូលគណនី។ វីដេអូដែលមាន DRM មិនអាចទាញយកបានទេ។",
						"**«The KVS voice engine isn't reachable»**៖ ចាប់ផ្តើមម៉ាស៊ីន (Colab ឬកុំព្យូទ័ររបស់អ្នក) ហើយពិនិត្យអាសយដ្ឋានរបស់វានៅក្នុង Settings → Voice Engine ឬប្រើសំឡេងរហ័ស។",
						"**Gemini រវល់**៖ key ឥតគិតថ្លៃមានកំណត់ប្រចាំថ្ងៃ។ Kroma ប្រើ Google Translate សម្រាប់ឃ្លាដែលវាមិនអាចធ្វើបាន ហើយប្រាប់អ្នក។ បកប្រែម្តងទៀតពេលក្រោយ ដើម្បីបានពាក្យពេចន៍របស់ Gemini។",
						`**នាំចេញមិនបាន**៖ កំណត់ហេតុពេញលេញត្រូវបានរក្សាទុកជា \`last-export-error.log\` ក្នុងថតការកំណត់របស់ Kroma។ ភ្ជាប់វាទៅ [GitHub issue](${ISSUES})។`,
					],
				},
			],
		},
	],
};

export const docs: Record<Lang, DocsContent> = { en, km };
