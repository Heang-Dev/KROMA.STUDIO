# Kroma Studio

A desktop video editor for turning Chinese (and other) videos into Khmer-subtitled posts for YouTube, Facebook and TikTok.

The heavy work runs in the cloud, so long movies are fast on any Mac:

| Step | How |
| --- | --- |
| Download | `yt-dlp` from YouTube, Bilibili, Douyin, Youku, iQiyi and 1,000+ sites, with the site's own subtitles when it has them |
| Speech to text | Cloud Whisper (Groq by default, or OpenAI): audio is cut into 10-minute parts sent in parallel |
| Translate to Khmer | Claude, in batches of 60 lines with notes (names, tone) for consistency |
| Edit | CapCut-style editor: preview, timeline (split, trim, ripple), subtitle list, styles, 16:9 / 9:16 / 1:1 |
| Export | ffmpeg with the Mac's hardware encoder. Subtitles are drawn by Chromium (correct Khmer shaping) and laid over the video, so the export matches the preview |
| Voice-over | Microsoft's neural Khmer voices (Sreymom, Piseth) through the free Edge read-aloud service; each line is sped up (max 1.6x) to fit before the next, mixed over the original sound turned down |
| Post | Claude writes the YouTube / Facebook / TikTok title, description and hashtags in Khmer |

Also: downloads can use your browser's logins (Settings → Downloads) for 1080p Bilibili and members-only videos; the open project autosaves and reopens at launch; drag clips on the timeline to reorder them (their subtitles move with them).

## Run

```bash
brew install ffmpeg yt-dlp
bun install
bun run dev          # editor with hot reload
bun run dist         # build dist/mac-arm64/Kroma Studio.app, then copy it to /Applications
```

Open Settings (gear icon) and add an Anthropic API key (translation, posts) and a Groq API key (speech to text).

## Checks

```bash
bun run typecheck
bun run test
bun run build && node scripts/smoke.mjs <video.mp4> <out-dir> [--download]   # launches the app, voices, screenshots, exports
KROMA_APP="dist/mac-arm64/Kroma Studio.app/Contents/MacOS/Kroma Studio" node scripts/smoke.mjs ...      # same, against the packaged app
```

## Layout

- `src/main/`: Electron main process: `download.ts` (yt-dlp), `transcribe.ts` (cloud Whisper), `ai.ts` (Claude), `voice.ts` (Khmer voice-over), `export.ts` (ffmpeg), `settings.ts` (keys encrypted with the keychain), `index.ts` (window, `kroma://` media protocol with Range support, IPC)
- `src/preload/`: the `window.kroma` API
- `src/renderer/src/`: React editor. `lib/timeline.ts` (clip and ripple maths), `lib/subtitleRender.ts` (one renderer for preview and export), `lib/actions.ts`, `state/store.ts` (zustand, undo/redo)
- `src/shared/`: types and SRT parsing
