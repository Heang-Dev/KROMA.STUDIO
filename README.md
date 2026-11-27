# Kroma Studio

**Turn any video into a Khmer video.** A free, open-source desktop app for macOS, Windows and Linux: download from YouTube, Bilibili, Douyin and 1,000+ sites, get the subtitles, translate them to Khmer, give every character their own voice, and post to YouTube, Facebook and TikTok.

**Website:** https://heang-dev.github.io/kroma/ · **Download:** [latest release](https://github.com/Heang-Dev/kroma/releases/latest) (macOS Apple silicon, Windows 10/11, Linux AppImage / .deb)

The heavy AI work runs in the cloud with your own keys (many free), so long videos are fast on any computer.

| Step | How |
| --- | --- |
| Download | `yt-dlp` from YouTube, Bilibili, Douyin, Youku, iQiyi and 1,000+ sites, with the site's own subtitles when it has them |
| Speech to text | Groq Whisper large-v3 (a whole movie in seconds), OpenAI, or Gemini |
| Translate | Gemini (free tier, default), Google Translate (free, no key) or Claude, into Khmer, Thai, Vietnamese, Lao, English, Indonesian or Malay; lines written to fit their time on screen |
| Characters & voices | Finds who says each line; 36 Khmer preset voices (Khmer Voice Studio engine), voice cloning from a recording, free instant voices; the original voices removed with audio-separator |
| Edit | Preview, timeline (split, trim, reorder), subtitle list, styles, blur boxes / logos / text, 16:9 · 9:16 · 1:1 |
| Export | FFmpeg, Small / Standard / High; subtitles drawn by Chromium (correct Khmer shaping) so the export matches the preview |
| Post | AI-written titles, text and hashtags; one-click posting to YouTube, Facebook and TikTok through Upload-Post |

## Run from source

```bash
# macOS: brew install ffmpeg yt-dlp   ·   Windows / Linux: node scripts/fetch-tools.mjs (bundles FFmpeg and yt-dlp)
bun install
bun run dev          # the editor with hot reload
bun run dist         # macOS app in dist/   ·   bun run dist:win / dist:linux on those systems
```

Open Settings (⌘, or Ctrl+,) and add a free Gemini key from Google AI Studio (translation and posts; or choose Google Translate, which needs no key) and a free Groq key (speech to text).

## Checks

```bash
bun run typecheck
bun run test
bun run build && node scripts/smoke.mjs <video.mp4> <out-dir> [--download]   # launches the app, screenshots, exports
```

Windows and Linux builds are made and smoke-tested on GitHub Actions (`.github/workflows/build.yml`). The website is in `website/` (Next.js, on the app's own design tokens).

## Use it responsibly

Only download, translate and repost videos you have the right to use, and only clone voices that are your own or that you have the speaker's permission for.

## License

[MIT](LICENSE) © 2026 Heang-Dev

## Design

Follows Orca's look (github.com/stablyai/orca, MIT): shadcn/ui new-york on Radix, Lucide icons, Orca's neutral tokens
(`src/renderer/src/styles.css`), 0.625rem radius and a monospace app font (Geist Mono; Kantumruy Pro for Khmer).
`components/ui/` is stock shadcn (`bunx --bun shadcn@latest add <name>`); Orca-style building blocks (Section, Card, Row,
SwitchRow, NavRow, Segmented, ChoiceTiles, AppSelect, SliderField, Group) live in `components/common.tsx`.

Settings is a full page (`components/settings/`), laid out like Orca's: nav with search on the left, breadcrumb and a
column of cards on the right, saving as you change things. Add a page by adding an entry to `SETTINGS_SECTIONS` in
`components/settings/sections.tsx`.

## Layout

- `src/main/`: Electron main process: `download.ts` (yt-dlp), `transcribe.ts` (cloud Whisper), `ai.ts` + `gemini.ts` + `google-translate.ts` (translation and posts), `voice.ts` (Khmer voice-over), `export.ts` (ffmpeg), `settings.ts` (keys encrypted with the keychain), `index.ts` (window, `kroma://` media protocol with Range support, IPC)
- `src/preload/`: the `window.kroma` API
- `src/renderer/src/`: React editor. `lib/timeline.ts` (clip and ripple maths), `lib/subtitleRender.ts` (one renderer for preview and export), `lib/actions.ts`, `state/store.ts` (zustand, undo/redo)
- `src/shared/`: types and SRT parsing
