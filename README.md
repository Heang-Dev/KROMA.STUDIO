# Kroma Studio

A desktop video editor for turning Chinese (and other) videos into Khmer-subtitled posts for YouTube, Facebook and TikTok.

The heavy work runs in the cloud, so long movies are fast on any Mac:

| Step | How |
| --- | --- |
| Download | `yt-dlp` from YouTube, Bilibili, Douyin, Youku, iQiyi and 1,000+ sites, with the site's own subtitles when it has them |
| Speech to text | Groq Whisper large-v3 (whole movie in seconds), OpenAI, or Gemini with your Gemini key (2-minute parts, exact mode) |
| Translate to Khmer | Your choice in Settings: **Gemini** (free tier, default), **Google Translate** (free, no key, basic) or **Claude** (paid, best). Gemini and Claude work in batches of 60 lines with your notes (names, tone) |
| Edit | CapCut-style editor: preview, timeline (split, trim, ripple), subtitle list, styles, 16:9 / 9:16 / 1:1 |
| Export | ffmpeg with the Mac's hardware encoder. Subtitles are drawn by Chromium (correct Khmer shaping) and laid over the video, so the export matches the preview |
| Voice-over | **Instant**: Microsoft's neural Khmer voices (Sreymom, Piseth) through the free Edge read-aloud service. **Designed / Cloned**: your Khmer Voice Studio engine (VoxCPM2) on a free Colab GPU or this Mac, all lines in one story job then cut per line; each line is sped up (max 1.6x) to fit before the next, mixed over the original sound turned down |
| Post | Gemini or Claude writes the YouTube / Facebook / TikTok title, description and hashtags in Khmer |

Also: downloads can use your browser's logins (Settings → Downloads) for 1080p Bilibili and members-only videos; the open project autosaves and reopens at launch; drag clips on the timeline to reorder them (their subtitles move with them).

## Run

```bash
brew install ffmpeg yt-dlp
bun install
bun run dev          # editor with hot reload
bun run dist         # build dist/mac-arm64/Kroma Studio.app, then copy it to /Applications
```

Open Settings (⌘,) and add a free Gemini key from Google AI Studio (translation, posts; or pick Google Translate, which needs no key) and a free Groq key (speech to text).

## Checks

```bash
bun run typecheck
bun run test
bun run build && node scripts/smoke.mjs <video.mp4> <out-dir> [--download]   # launches the app, voices, screenshots, exports
KROMA_APP="dist/mac-arm64/Kroma Studio.app/Contents/MacOS/Kroma Studio" node scripts/smoke.mjs ...      # same, against the packaged app
```

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
