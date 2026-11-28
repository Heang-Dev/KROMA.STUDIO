---
title: ដោះស្រាយបញ្ហា
group: ឯកសារយោង
section: 5
order: 5
---
រកសារដែលអ្នកឃើញ ឬបញ្ហាដែលអ្នកជួប ហើយធ្វើតាមជំហាន។ សារក្នុងសញ្ញាសម្រង់ គឺដូចដែល Kroma បង្ហាញបេះបិទ (ជាភាសាអង់គ្លេស)។

ពេលការងារមួយបរាជ័យ Kroma បង្ហាញសារពណ៌ក្រហមនៅខាងក្រោមវីនដូ ដែលមានចំណងជើងដូចជា **Download failed** ឬ **Export failed** និងមូលហេតុនៅខាងក្រោម។ វាក៏ត្រូវបានរក្សាទុកក្នុង[កណ្តឹង](notifications)នៅរបារចំណងជើង ដើម្បីឱ្យអ្នកអានពេលក្រោយ ហើយជាញឹកញាប់មានប៊ូតុង **Retry**។ ផ្នែកខាងក្រោមត្រូវបានរៀបតាមការងារនោះ។

## ការដំឡើង និងការបើក

### macOS៖ «Kroma Studio is damaged» ឬបើកមិនឡើង

Kroma មិនទាន់មានហត្ថលេខាវិញ្ញាបនបត្ររបស់ Apple នៅឡើយទេ ដូច្នេះ macOS រារាំងវានៅលើកដំបូង។ ផ្លាស់វាទៅក្នុង **Applications** រួចដំណើរការពាក្យបញ្ជានេះម្តងក្នុង Terminal៖

```bash
xattr -cr "/Applications/Kroma Studio.app"
```

រួចបើកវាម្តងទៀត។ មើល [ការដំឡើង](installation)។

### Windows៖ «Windows protected your PC»

កម្មវិធីដំឡើងមិនទាន់មានហត្ថលេខាកូដនៅឡើយទេ។ ចុច **More info** រួចចុច **Run anyway**។

### Linux៖ AppImage មិនធ្វើអ្វីសោះ

ធ្វើឱ្យវាអាចដំណើរការបានជាមុនសិន៖

```bash
chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage
```

ឬដំឡើងកញ្ចប់ `.deb` ជំនួសវិញ។

### ខ្ញុំបើក Kroma ប៉ុន្តែគ្មានវីនដូថ្មីលេចឡើង

Kroma ដំណើរការតែម្តងប៉ុណ្ណោះ។ ការបើកវាម្តងទៀត នាំវីនដូដែលកំពុងបើកមកខាងមុខ។ ដើម្បីធ្វើការលើគម្រោងទីពីរ សូមប្រើ **File → New Window** (⇧⌘N / Ctrl+Shift+N)។ មើល [គម្រោង និងឯកសារ](projects-and-files#kroma-តែមួយក្នុងពេលតែមួយ)។

លើ Mac Kroma នៅតែដំណើរការ បន្ទាប់ពីអ្នកបិទវីនដូចុងក្រោយរបស់វា។ ចុចរូបតំណាងក្នុង Dock ដើម្បីបើកវីនដូមកវិញ។

## បាត់ FFmpeg ឬ yt-dlp

របារពណ៌ក្រហមនៅខាងលើកម្មវិធីកែសម្រួលសរសេរថា **Missing ffmpeg, ffprobe, yt-dlp. Install with:** ហើយបង្ហាញពាក្យបញ្ជាសម្រាប់ប្រព័ន្ធរបស់អ្នក។ **Settings → About → Tools** បង្ហាញដូចគ្នា ម្តងមួយឧបករណ៍ៗ។

| ប្រព័ន្ធ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| macOS | ដំឡើង [Homebrew](https://brew.sh) រួចដំណើរការ `brew install ffmpeg yt-dlp`។ |
| Windows | វាមកជាមួយ Kroma ស្រាប់។ បើវាបាត់ សូមដំឡើង Kroma ឡើងវិញ ឬដំណើរការ `winget install Gyan.FFmpeg` និង `winget install yt-dlp.yt-dlp`។ |
| Linux | វាមកជាមួយ Kroma ស្រាប់។ បើវាបាត់ សូមដំណើរការ `sudo apt install ffmpeg yt-dlp`។ |

បើក Kroma ឡើងវិញ បន្ទាប់ពីដំឡើង។ Kroma ស្វែងរកនៅកន្លែងដំឡើងធម្មតា (Homebrew, WinGet, Scoop, Chocolatey, `/usr/local/bin` និងកន្លែងផ្សេងទៀត) ដូច្នេះអ្នកមិនចាំបាច់ប្តូរការកំណត់ប្រព័ន្ធណាមួយទេ។

អ្នកក៏អាចឃើញ "ffmpeg is not installed. Install it with: …" (ឬដូចគ្នាសម្រាប់ yt-dlp) ពេលការងារមួយត្រូវការឧបករណ៍នោះ។

## ការទាញយកពីតំណ

| សារ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| "Paste a link that starts with https:// (a share message with a link in it works too)." | ចម្លងតំណពេញ។ សារចែករំលែកពី Douyin ឬ Bilibili ក៏ប្រើបានដែរ ឱ្យតែវាមានតំណនៅក្នុង។ |
| "This link isn't a video page Kroma can download from. Open the video itself and copy its link, or check the site is supported." | អ្នកបានចម្លងតំណទៅឆានែល ការស្វែងរក ឬទំព័រដើម។ បើកវីដេអូ ហើយចម្លងតំណរបស់វាផ្ទាល់។ |
| "This video needs you to be signed in. Choose your browser in Settings → Downloads, sign in to the site there, then try again." | ជ្រើសកម្មវិធីរុករករបស់អ្នកក្នុង [Settings → Downloads](settings#downloads) ចូលគណនីគេហទំព័រនោះក្នុងកម្មវិធីរុករកនោះ ហើយសាកម្តងទៀត។ |
| "This video is protected (encrypted), so it can't be downloaded." | វីដេអូនេះប្រើ DRM។ Kroma មិនអាចទាញយកវាបានទេ។ |
| "The video isn't available any more (removed, or the link is wrong)." | ពិនិត្យតំណនោះក្នុងកម្មវិធីរុករករបស់អ្នក។ |
| "This video isn't available from your country." | គេហទំព័ររារាំងវានៅកន្លែងដែលអ្នកនៅ។ |
| "The connection failed. Check your internet and try again." | ពិនិត្យអ៊ីនធឺណិតរបស់អ្នក ហើយសាកម្តងទៀត។ |
| "The download finished but no video file was found." | សាកម្តងទៀត។ បើវានៅតែកើតឡើង សូមរាយការណ៍ (មើលខាងក្រោម)។ |

គន្លឹះបន្ថែម៖

- **ទទួលបានត្រឹម 720p ឬទាបជាងពី Bilibili?** Bilibili ផ្តល់ 1080p តែពេលអ្នកចូលគណនីប៉ុណ្ណោះ។ ជ្រើសកម្មវិធីរុករករបស់អ្នកក្នុង **Settings → Downloads**។
- **ការចូលគណនីពី Safari មិនដំណើរការ?** Safari ត្រូវការ Full Disk Access ផងដែរ៖ macOS **System Settings → Privacy & Security → Full Disk Access** បើក Kroma Studio។
- **គេហទំព័រដែលធ្លាប់ដំណើរការ ឈប់ដំណើរការ?** គេហទំព័រផ្លាស់ប្តូរញឹកញាប់។ លើ Windows និង Linux សូមធ្វើបច្ចុប្បន្នភាព Kroma៖ yt-dlp របស់វាត្រូវបានធ្វើបច្ចុប្បន្នភាពជាមួយ។ លើ Mac ដំណើរការ `brew upgrade yt-dlp`។
- បើទាញយកអក្សររត់របស់គេហទំព័រមិនបាន Kroma បង្ហាញ "Retrying without the site's subtitles…" ហើយទាញយកវីដេអូដដែល។ អ្នកអាចបង្កើតអក្សររត់ដោយការបំប្លែងសំឡេងទៅជាអក្សរជំនួសវិញ។

### Download Center

| អ្វីដែលអ្នកឃើញ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| "No links found. Paste links that start with https://, one per line." | បិទភ្ជាប់តំណពេញ (ឬសារចែករំលែកដែលមានតំណ) មួយបន្ទាត់មួយតំណ។ |
| ជួររង់ចាំផ្អាក៖ "The site wants a break (too many downloads in a row)…" | Bilibili ឬ YouTube កំពុងបន្ថយល្បឿនអ្នក។ រង់ចាំ (Bilibili៖ ពីរបីនាទី YouTube៖ រហូតដល់មួយម៉ោង) ហើយចុច **Resume** ឬបើកការចូលគណនីពីកម្មវិធីរុករកក្នុង **Settings → Downloads**។ |
| **Already downloaded** | Kroma បានទាញយកវីដេអូនោះពីមុនរួចហើយ ដូច្នេះវាមិនទាញយកពីរដងទេ។ ដើម្បីយកវាម្តងទៀត ដកវាចេញពីបញ្ជីសិន (**Remove from the list (the files stay)**) រួចបន្ថែមវាម្តងទៀត។ |
| "No video files in that folder" | **Import a folder…** មើលតែក្នុងថតនោះផ្ទាល់ (មិនមែនថតខាងក្នុងវាទេ) រកឯកសារ mp4, mov, mkv, webm, m4v, avi និង flv។ |
| "No video in this file (sound only)." ឬ "Kroma can't read this file (damaged, or not a video)." | ឯកសារនោះមិនអាចក្លាយជាគម្រោងបានទេ។ ដោះធីកវាចេញ។ |
| **Free only** ក្បែរគេហទំព័រ | ភាគឥតគិតថ្លៃទាញយកបាន ភាគ VIP ត្រូវបានការពារ (DRM) ហើយមិនអាចទាញយកដោយកម្មវិធីប្រភេទនេះណាមួយបានទេ។ |

## key AI និងកម្រិតប្រើប្រាស់

### បាត់ key

| សារ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| "Add your free Gemini key in Settings → Translation, or choose Google Translate there." | បន្ថែម key Gemini ឬប្តូរអ្នកបកប្រែទៅ Google Translate។ មើល [បន្ថែម key របស់អ្នក](configuration)។ |
| "Add your Anthropic API key in Settings to translate with Claude." | បន្ថែម key Claude ឬជ្រើសអ្នកបកប្រែផ្សេង។ |
| "Add your free Gemini key in Settings → Translation (speech to text uses it too), or choose Groq in Settings → Speech to Text." | ការបំប្លែងសំឡេងទៅជាអក្សរប្រើ Gemini ជាលំនាំដើម។ បន្ថែម key ឬជ្រើស Groq។ |
| "Add your speech-to-text API key in Settings → Speech to Text (Groq is free to start)." | បន្ថែម key Groq ឬ OpenAI របស់អ្នក។ |
| "Writing posts needs an AI: add a free Gemini key (or a Claude key) in Settings → Translation." | Google Translate មិនអាចសរសេរការបង្ហោះបានទេ។ បន្ថែម key Gemini ឬ Claude។ |
| "Finding characters needs your free Gemini key (Settings → Translation) or a Claude key." | ដូចខាងលើ។ |

### អាន key មិនបាន

*A key is saved, but this version of Kroma can't read it from the keychain.* key នៅតែរក្សាទុក តែ Kroma ច្បាប់នេះមិនត្រូវបានអនុញ្ញាតឱ្យអានវា (អាចកើតឡើងលើ Mac ក្រោយការធ្វើបច្ចុប្បន្នភាព)។ បិទភ្ជាប់វាម្តងទៀត ឬបើក Kroma ម្តងទៀត ហើយជ្រើស **Always Allow** ពេល Mac សួរ។ បើ key បាត់ទាំងស្រុងក្រោយការធ្វើបច្ចុប្បន្នភាពពីកំណែមុន 0.1.11 សូមបិទភ្ជាប់វាម្តងទៀតក្នុង **Settings → Translation**, **Speech to Text** ឬ **Posting**។

### key ត្រូវបានបដិសេធ

| សារ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| "The Gemini API key was refused. Check it in Settings → Translation." | ចម្លង key ម្តងទៀតពី Google AI Studio ហើយប្រើ **Replace**។ |
| "The Anthropic API key was refused. Check it in Settings." | ចម្លង key ម្តងទៀតពី Claude console។ |
| "The speech-to-text API key was refused. Check it in Settings." | ចម្លង key Groq ឬ OpenAI របស់អ្នកម្តងទៀត។ |
| "This Gemini key can't use that model. Pick another model in Settings → Translation." | ជ្រើសម៉ូដែល Flash។ |
| "That Gemini model isn't available. Pick another one in Settings → Translation." | ជ្រើសម៉ូដែលផ្សេងពីបញ្ជី។ |

### Gemini រវល់ ឬអស់សំណើឥតគិតថ្លៃ

| សារ | អត្ថន័យ |
|---|---|
| "Gemini is busy, retrying in … s…" | ធម្មតាសម្រាប់កម្រិតឥតគិតថ្លៃ។ Kroma រង់ចាំ ហើយសាកម្តងទៀតដោយខ្លួនឯង។ |
| "Gemini's free daily limit is reached, using the lighter Flash-Lite model…" | Kroma បានប្តូរទៅម៉ូដែលស្រាលជាង ដើម្បីបន្តការងារ។ |
| "Gemini was busy, so … lines used Google Translate." | ការងាររួចរាល់ ប៉ុន្តែបន្ទាត់ខ្លះប្រើ Google Translate។ ពេលក្រោយ ចុច **Translate all** ដើម្បីបានពាក្យពេចន៍ល្អជាងរបស់ Gemini។ |
| "Gemini's free limit is used up for now. Wait a minute, lower 'Parallel requests', or switch to Google Translate." | រង់ចាំ ឬកំណត់ **Parallel requests** ទៅ 2 ក្នុង [Settings → Translation](settings#speed)។ |
| "Gemini's free daily limit is used up (it resets tomorrow). Switch to Google Translate, or add a Groq key for speech to text." | ថ្ងៃនេះប្រើ Google Translate ឬ Claude ហើយប្រើ Groq សម្រាប់ការបំប្លែងសំឡេងទៅជាអក្សរ។ |
| "Gemini is very busy right now. Try again in a few minutes." | ម៉ាស៊ីនមេរបស់ Google ផ្ទុកលើសចំណុះ។ រង់ចាំបន្តិច។ |
| "Gemini didn't answer in time (it's very busy right now)." | ដូចគ្នា។ សាកម្តងទៀតពេលក្រោយ។ |

សេវាផ្សេងទៀត៖

- "Claude is rate limiting this key. Lower 'parallel requests' in Settings or try again shortly."
- "Google Translate is busy (too many requests). Try again in a few minutes, or use Gemini."

### បន្ទាត់ខ្លះមិនទាន់បានបកប្រែ

"Translated … of … lines" ជាមួយ "… need another try."។ ចុច **Translate missing** នៅលើសារ ឬ **Only missing** ក្នុង **Translate → Step by step**។ វាផ្ញើតែបន្ទាត់ដែលនៅទទេប៉ុណ្ណោះ។

### "No speech was found."

ការបំប្លែងសំឡេងទៅជាអក្សរ មិនឮអ្វីដែលវាអាចសរសេរបានទេ។ ពិនិត្យថាវីដេអូមានការនិយាយ ហើយ **Spoken language** ក្នុងផ្ទាំង **Translate** ត្រឹមត្រូវ។

## សំឡេង

### "Can't reach the voice engine at …"

សំឡេងរចនា និងសំឡេងចម្លង ត្រូវការម៉ាស៊ីនសំឡេងឱ្យកំពុងដំណើរការ។ បើក [Settings → Voice Engine](settings#voice-engine) ហើយចុច **Start engine** (ឬ **Install voice engine** ជាមុនបើវាថា "Not installed") រួចចុច **Check**។ បើអ្នកប្រើ Colab សូមទុក notebook ឱ្យដំណើរការ ហើយពិនិត្យអាសយដ្ឋាន។ អាសយដ្ឋាន Colab ប្តូររាល់ពេលអ្នកចាប់ផ្តើម notebook ដូច្នេះសូមបិទភ្ជាប់អាសយដ្ឋានថ្មី។ ឬប្រើសំឡេងរហ័ស ដែលមិនត្រូវការម៉ាស៊ីននេះ។ មើល [ម៉ាស៊ីនសំឡេង](voice-engine)។

### "The voice engine refused the token."

ចម្លង token ដែល notebook Colab បោះពុម្ព ទៅក្នុង **Settings → Voice Engine → Token**។

### សំឡេងរហ័សមិនដំណើរការ

"The voice service didn't answer. Check your internet and try again." ឬ "The voice service timed out"។ សំឡេងរហ័សមកពីសេវាអនឡាញ។ ពិនិត្យអ៊ីនធឺណិតរបស់អ្នក ហើយចុច **Make voice-over** ម្តងទៀត។ បន្ទាត់ដែលធ្វើរួចហើយ នៅដដែល។

### "Voiced … lines; … not done. Press again to finish them."

ចុចប៊ូតុងសំឡេងបញ្ចូលក្នុងផ្ទាំង **Voice** ម្តងទៀត (ពេលនោះវាសរសេរថា **Voice the … new lines**)។ វាធ្វើតែបន្ទាត់ដែលនៅខ្វះប៉ុណ្ណោះ។

### ខ្ញុំនៅតែឮសំឡេងនិយាយដើម

- ពិនិត្យថា **Voice → Mix → Remove the original voices** បានបើក។
- ការដកសំឡេងត្រូវការ [uv](installation)។ បើគ្មានវា អ្នកឃើញ "Removing voices needs uv. Install it with: …"។ **Settings → About → Tools** បង្ហាញពាក្យបញ្ជាសម្រាប់ប្រព័ន្ធរបស់អ្នក។
- លើកដំបូង Kroma ទាញយកឧបករណ៍ និងម៉ូដែលដកសំឡេង។ វាអាចចំណាយពេលយូរបន្តិច៖ សូមរង់ចាំឱ្យវារួច។
- បើការដកសំឡេងបរាជ័យ Kroma សរសេរថា "The original voices are still in"។ សាកម្តងទៀតពី **Voice → Mix** រួចនាំចេញម្តងទៀត។

### មីក្រូហ្វូនមិនដំណើរការ (Mac)

"Kroma isn't allowed to use the microphone. Turn it on in System Settings → Privacy & Security → Microphone, then try again."។ ចុច **Open Microphone settings** បើក Kroma Studio ហើយសាកម្តងទៀត។

## ការនាំចេញ

### ការនាំចេញបរាជ័យ

ពេលការនាំចេញបរាជ័យ Kroma រក្សាទុកព័ត៌មានលម្អិតពេញលេញក្នុងឯកសារឈ្មោះ `last-export-error.log` នៅក្នុងថតការកំណត់របស់វា៖

| ប្រព័ន្ធ | ឯកសារ |
|---|---|
| macOS | `~/Library/Application Support/Kroma Studio/last-export-error.log` |
| Windows | `%APPDATA%\Kroma Studio\last-export-error.log` |
| Linux | `~/.config/Kroma Studio/last-export-error.log` |

ការនាំចេញដែលបរាជ័យនីមួយៗ ជំនួសឯកសារនេះ។ ភ្ជាប់វាពេលអ្នក[រាយការណ៍បញ្ហា](#ការរាយការណ៍បញ្ហា)។

អ្វីដែលត្រូវពិនិត្យមុន៖

- **"The timeline is empty."** បន្ថែមវីដេអូទៅលើ timeline។
- **វីដេអូ រូបភាព ឬឯកសារសំឡេងត្រូវបានផ្លាស់ទី ឬលុប។** គម្រោងគ្រាន់តែចង្អុលទៅឯកសាររបស់វា។ ដាក់វានៅកន្លែងដើមវិញ។ មើល [គម្រោង និងឯកសារ](projects-and-files#ឯកសារគម្រោង)។
- **ថាសពេញ។** បង្កើនទំហំទំនេរ ឬ[សម្អាត cache របស់ Kroma](projects-and-files#បង្កើនទំហំទំនេរ)។
- **"Some lines have no voice yet; they'll be silent."** នេះមិនមែនជាកំហុសទេ។ ចុច **Make voice-over** មុនពេលនាំចេញ ដើម្បីបំពេញវា។

### ការនាំចេញយឺត

**High** ចំណាយពេលប្រហែលបីដងនៃ **Standard**។ លើ Mac **Standard** លឿនបំផុត ព្រោះវាប្រើបន្ទះឈីបវីដេអូរបស់ Mac។ មើល [នាំចេញ](export)។

## Batch និងឧបករណ៍រឿងភាគ

| អ្វីដែលអ្នកឃើញ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| **Failed at …** លើវីដេអូមួយ | ចុច **See why** ដើម្បីមើលមូលហេតុ។ ដោះស្រាយវា រួចចុច **Retry from here** ឬ **Fix by hand** ដើម្បីបើកគម្រោងនៅជំហាននោះ។ ជំហានដែលធ្វើរួចទាំងអស់ត្រូវបានរក្សាទុក។ មើល [Batch](batch#ព័ត៌មានលម្អិតនៃជំហាន)។ |
| "The project file was moved or deleted." | Batch បើកគម្រោងនីមួយៗពីឯកសាររបស់វា។ ដាក់វាត្រឡប់មកវិញ ឬដកវីដេអូចេញពីបញ្ជី ហើយបន្ថែមគម្រោងម្តងទៀត។ |
| "That saved style was deleted. Choose another subtitle style in the steps." | រចនាប័ទ្មដែលបានជ្រើសក្នុង **Subtitle style** ត្រូវបានលុបចេញពី **My styles**។ ជ្រើសមួយផ្សេង។ |
| **Stopped at …** | អ្នកបានចុច **Stop** ឬ Kroma បានបិទកំឡុងពេល batch។ ចុច **Resume**។ |
| New, Open និង Save ជាពណ៌ប្រផេះ | batch មួយកំពុងប្រើកម្មវិធីកែ។ រង់ចាំវា ឬចុច **Stop** នៅរបារខាងលើ។ |
| "No burned-in subtitles found" | Kroma រកមិនឃើញអក្សររត់ដិតជាប់ក្នុងវីដេអូទេ។ បើមាន សូមផ្លាស់ប្រអប់ដែលវាបានដាក់ទៅលើវាដោយដៃ។ ក្នុង Batch នេះមិនមែនជាកំហុសទេ។ |
| "Finding names needs Gemini or Claude: add a key in Settings → Translation." | សទ្ទានុក្រមរឿងភាគរកឈ្មោះដោយ Gemini ឬ Claude។ ជាមួយ Google Translate សូមបន្ថែមឈ្មោះដោយដៃ។ |
| "Save the project first: the glossary is shared by the projects in its folder." | រក្សាទុកគម្រោង (⌘S) ក្នុងថតរឿងរបស់វា។ |
| គម្របគ្មានលេខភាគ | ឈ្មោះគម្រោងគ្មានលេខដែល Kroma ស្គាល់។ វាយវាក្នុង **Post → Cover → Episode** ឬដាក់ឈ្មោះគម្រោងដូចជា `05 - Title`។ |

## ការជូនដំណឹង

**គ្មានការជូនដំណឹងរបស់ប្រព័ន្ធ ឬគ្មានសំឡេង?** ចុច **Send test** ក្នុង **Settings → Notifications**។ បើគ្មានអ្វីបង្ហាញនៅក្រៅ Kroma បើក **Not seeing them?** ហើយអនុញ្ញាត Kroma Studio ក្នុងការកំណត់ការជូនដំណឹងរបស់ប្រព័ន្ធ ព្រមទាំងសំឡេង។ ពិនិត្យផងដែរថា Focus ឬ Do Not Disturb បិទ។ មើល [ការជូនដំណឹង](notifications#មិនឃើញការជូនដំណឹង)។

## ការបង្ហោះ

| សារ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| "Connect your accounts first" / "Add your Upload-Post API key in Settings → Posting first." | បន្ថែម key របស់អ្នកក្នុង [Settings → Posting](settings#posting)។ |
| "Upload-Post refused the API key. Copy it again from app.upload-post.com → API Keys into Settings → Posting." | ចម្លង key ម្តងទៀត។ |
| "This month's Upload-Post uploads are used up (the free plan has 10). Upgrade the plan or wait for next month." | ដំឡើងគម្រោង Upload-Post របស់អ្នក ឬរង់ចាំ។ |
| "Choose your Facebook Page" | ជ្រើស Page ក្នុង **Settings → Posting → Facebook Page**។ |
| "Can't reach Upload-Post. Check your internet connection." | ពិនិត្យអ៊ីនធឺណិតរបស់អ្នក។ |
| "Upload-Post didn't answer in time. Check your internet and try again." | សាកម្តងទៀត។ Kroma មិនដែលបង្ហោះវីដេអូដដែលពីរដងសម្រាប់ការសាកល្បងមួយទេ។ |
| "Still processing on the platform. Check it there in a few minutes." | ការផ្ទុកឡើងបានជោគជ័យ វេទិកានៅកំពុងរៀបចំវា។ ពិនិត្យ YouTube, Facebook ឬ TikTok ពេលក្រោយ។ |
| "Stopped following the post. It may still finish on the platforms." | អ្នកបានបោះបង់ ខណៈ Kroma កំពុងរង់ចាំ។ ការបង្ហោះអាចនៅតែលេចឡើង។ |

គណនីដែលសរសេរថា "sign-in expired: press Connect" ក្នុង **Settings → Posting** ត្រូវការឱ្យអ្នកចុច **Connect** ហើយចូលគណនីម្តងទៀត។ TikTok ត្រូវការគម្រោង Basic របស់ Upload-Post។ មើល [ការបង្ហោះ](posting)។

## ការធ្វើបច្ចុប្បន្នភាព

| សារ | អ្វីដែលត្រូវធ្វើ |
|---|---|
| "Couldn't reach GitHub to check for updates." | ពិនិត្យអ៊ីនធឺណិតរបស់អ្នក រួច **Settings → About → Check now**។ |
| "No releases found yet." | គ្មានអ្វីត្រូវដំឡើងទេ។ សាកម្តងទៀតពេលក្រោយ។ |
| "Kroma can't replace itself in …. Drag the new Kroma Studio from the window that opened into Applications." | Mac៖ Kroma មិននៅក្នុងថត Applications របស់អ្នកទេ (ឧទាហរណ៍ អ្នកបានបើកវាពីឯកសារ disk image)។ អូសកម្មវិធីថ្មីទៅក្នុង **Applications** ហើយបើកវាពីទីនោះ។ |
| "The downloaded update is missing. Check for updates again." | ចុច **Check now** ក្នុង **Settings → About**។ |
| "The update couldn't be installed"៖ "macOS didn't let Kroma replace itself…" | Mac៖ អនុញ្ញាត Kroma Studio ក្នុង **System Settings → Privacy & Security → App Management** ហើយធ្វើបច្ចុប្បន្នភាពម្តងទៀត ឬអូស Kroma Studio ថ្មីពីបង្អួច Finder ទៅក្នុង **Applications**។ មើល [ការធ្វើបច្ចុប្បន្នភាព](updates#លើ-mac)។ |
| "The download was damaged. It will download again on the next check." | មិនចាំបាច់ធ្វើអ្វីទេ៖ Kroma ទាញយកវាម្តងទៀត។ |

**មិនឃើញកំណែថ្មីលេចឡើង?** Kroma ពិនិត្យប្រហែល ៨ វិនាទីបន្ទាប់ពីវាចាប់ផ្តើម ហើយបន្ទាប់មករៀងរាល់ ៤ ម៉ោងម្តង។ ចុច **Check now** ដើម្បីពិនិត្យភ្លាម។ បើ **Update automatically** បិទ Kroma គ្រាន់តែប្រាប់អ្នកថាមានកំណែថ្មី ទោះអ្នកចុច **Check now** ក៏ដោយ៖ ចុច **Download** លើប្រអប់នៅខាងស្តាំខាងក្រោម។ កំណែ 0.1.0 មិនអាចធ្វើបច្ចុប្បន្នភាពដោយខ្លួនឯងបានទេ៖ ដំឡើងកំណែថ្មីជាងនេះដោយដៃម្តង។ មើល [ការធ្វើបច្ចុប្បន្នភាព](updates) និង[ការណែនាំអំពីការដំឡើងកំណែ](upgrade)។

**Linux `.deb`៖** កំណែថ្មីបើកក្នុងកម្មវិធីដំឡើងរបស់ប្រព័ន្ធ ហើយសុំពាក្យសម្ងាត់របស់អ្នក។ Kroma មិនអាចបញ្ចប់វាជំនួសអ្នកបានទេ។

## ការរាយការណ៍បញ្ហា

បើគ្មានអ្វីខាងលើជួយបាន សូម[បើក issue នៅលើ GitHub](https://github.com/Heang-Dev/KROMA.STUDIO/issues)។ បញ្ជាក់៖

1. កំណែ Kroma របស់អ្នក៖ **Settings → About** បង្ហាញវា ឧទាហរណ៍ **Kroma Studio 0.2.0**។
2. ប្រព័ន្ធរបស់អ្នក៖ macOS, Windows ឬ Linux និងកំណែរបស់វា។
3. អ្វីដែលអ្នកបានធ្វើ អ្វីដែលអ្នករំពឹង និងសារពិតប្រាកដដែល Kroma បានបង្ហាញ។
4. សម្រាប់បញ្ហានាំចេញ ភ្ជាប់ `last-export-error.log` (មើល [ការនាំចេញបរាជ័យ](#ការនាំចេញបរាជ័យ))។
5. សម្រាប់បញ្ហាទាញយក តំណដែលអ្នកបានប្រើ បើវាជាតំណសាធារណៈ។

Kroma មិនរក្សាឯកសារកំណត់ហេតុផ្សេងទៀតទេ ដូច្នេះសារនៅលើអេក្រង់ គឺជារបស់មានប្រយោជន៍បំផុតដែលត្រូវចម្លង។

**កុំ**បិទភ្ជាប់ API key របស់អ្នកក្នុង issue ហើយកុំភ្ជាប់ឯកសារ `settings.json`។
