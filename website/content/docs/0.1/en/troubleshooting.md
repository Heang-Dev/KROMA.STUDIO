---
title: Troubleshooting
group: Help
section: 5
order: 1
---
## “Missing ffmpeg / yt-dlp”

On a Mac: `brew install ffmpeg yt-dlp`. Windows and Linux builds include them. **Settings → About** shows what's found.

## A download fails

Some sites need you to be signed in: choose your browser in **Settings → Downloads**. Videos with DRM can't be downloaded. If a site changed, update Kroma (yt-dlp is updated with it).

## “The voice engine isn't reachable”

Start the [voice engine](voice-engine) and check its address in **Settings → Voice Engine**, or use the instant voices.

## I still hear the original voices

Check **Voice → Mix → Remove the original voices** is on, and that [uv](installation) is installed. Export again.

## Gemini is busy

Free keys have a daily limit; Kroma falls back to Google Translate and tells you. See [Translation](translation).

## An export failed

The full log is saved as `last-export-error.log` in Kroma's settings folder. [Open an issue](https://github.com/Heang-Dev/KROMA.STUDIO/issues) and attach it.

## Something else

[Open an issue on GitHub](https://github.com/Heang-Dev/KROMA.STUDIO/issues) with your Kroma version (Settings → About) and what happened.
