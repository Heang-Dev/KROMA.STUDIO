---
title: Installation
group: Getting started
section: 1
order: 1
---
Kroma Studio is a desktop app for **macOS (Apple silicon)**, **Windows 10/11** and **Linux (x64)**. Download it from the [download page](/#download) or from [GitHub Releases](https://github.com/Heang-Dev/kroma/releases/latest).

## System requirements

| | Minimum |
|---|---|
| macOS | 13 or later, Apple silicon (M1 and later) |
| Windows | 10 or 11, 64-bit |
| Linux | x64; AppImage (any distro) or .deb (Ubuntu, Debian) |
| Disk | About 600 MB for the app, plus room for your videos |
| Internet | Needed for downloading videos and the AI services |

You don't need a powerful computer: speech-to-text, translation and the instant voices run in the cloud.

## macOS

1. Open the `.dmg` and drag **Kroma Studio** into **Applications**.
2. The app isn't signed with an Apple certificate yet. If macOS says it's damaged or won't open it, run this once in Terminal:

```bash
xattr -cr "/Applications/Kroma Studio.app"
```

3. Install the video tools with [Homebrew](https://brew.sh):

```bash
brew install ffmpeg yt-dlp
```

## Windows

Run `Kroma-Studio-Setup-<version>.exe`. The installer isn't code-signed yet: on **“Windows protected your PC”**, click **More info**, then **Run anyway**. FFmpeg and yt-dlp come with the app.

## Linux

Make the AppImage executable and run it, or install the `.deb`:

```bash
chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage
```

FFmpeg and yt-dlp come with the app.

## Optional: removing original voices

Removing the original speech from a video (keeping the music and effects) uses [uv](https://docs.astral.sh/uv/). Settings → About shows whether it's installed and the command for your system.

## Next

[Add your keys](configuration), then [make your first video](first-video).
