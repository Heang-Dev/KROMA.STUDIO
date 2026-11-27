---
title: Installation
group: Getting started
section: 1
order: 1
---
Kroma Studio is a desktop app for **macOS (Apple silicon)**, **Windows (64-bit)** and **Linux (x64)**. Every version is published on [GitHub Releases](https://github.com/Heang-Dev/kroma/releases/latest). Open the latest release, scroll to **Assets**, and download the file for your computer.

## Which file do I download?

| Your computer | File | Example name |
|---|---|---|
| Mac with an M1, M2, M3 or newer chip | `.dmg` | `Kroma Studio-0.1.3-arm64.dmg` |
| Windows 10 or 11 (64-bit) | `.exe` installer | `Kroma-Studio-Setup-0.1.3.exe` |
| Linux, any distribution | `.AppImage` | `Kroma-Studio-0.1.3-x86_64.AppImage` |
| Ubuntu, Debian and similar | `.deb` | `Kroma-Studio-0.1.3-amd64.deb` |

On Linux, pick the AppImage if you're not sure. It can update itself; the `.deb` needs your password for each update (see [Updates](updates)).

## System requirements

| | What you need |
|---|---|
| Mac | Apple silicon (M1 or later). Intel Macs aren't supported yet. |
| Windows | Windows 10 or 11, 64-bit |
| Linux | A 64-bit (x64) PC |
| Screen | The window is at least 1100 × 700 pixels, so a laptop screen or bigger |
| Disk | About 300 MB for the app on a Mac, a bit more on Windows and Linux (the video tools are inside the app). Plus room for your videos. |
| Internet | Needed to download videos and for the AI services |

You don't need a powerful computer. Speech-to-text, translation and the instant voices all run in the cloud. Only two optional extras do heavy work on your computer: removing the original voices, and running the [voice engine](voice-engine) without a GPU.

## macOS

### Install

1. Open the `.dmg` file you downloaded.
2. Drag **Kroma Studio** onto the **Applications** folder in the window that opens.
3. Eject the disk image (the drive icon called Kroma Studio in Finder's sidebar).
4. Open **Kroma Studio** from Applications or Launchpad.

Always run Kroma from **Applications**, not from inside the `.dmg`. Kroma can only update itself when it can replace the app where it's installed.

### "Kroma Studio is damaged and can't be opened"

Kroma isn't signed with an Apple certificate yet, so macOS may say the app is damaged, or that it can't check it for malicious software. The app is fine. Open **Terminal** (in Applications → Utilities), paste this line, and press Return:

```bash
xattr -cr "/Applications/Kroma Studio.app"
```

This removes the "downloaded from the internet" mark that macOS adds. Then open Kroma again. You only need to do this once: updates installed by Kroma itself clear the mark for you.

### Install FFmpeg and yt-dlp

On a Mac, Kroma uses the video tools from [Homebrew](https://brew.sh). Homebrew's FFmpeg can use the Mac's video chip, which makes exporting much faster. If you don't have Homebrew yet, install it from [brew.sh](https://brew.sh), then run:

```bash
brew install ffmpeg yt-dlp
```

You don't need to tell Kroma where they are. It looks in Homebrew's folders (`/opt/homebrew/bin` and `/usr/local/bin`) on its own.

## Windows

1. Run `Kroma-Studio-Setup-<version>.exe`.
2. The installer isn't code-signed yet, so Windows may show **"Windows protected your PC"**. Click **More info**, then **Run anyway**.
3. Follow the steps. You can change the install folder if you like. Kroma installs for your Windows account only, so it doesn't need administrator rights.
4. Open **Kroma Studio** from the Start menu or the desktop shortcut.

FFmpeg and yt-dlp come inside the app. There's nothing else to install.

## Linux

### AppImage

Make the file executable, then run it:

```bash
chmod +x Kroma-Studio-*.AppImage
./Kroma-Studio-*.AppImage
```

You can also right-click the file in your file manager, open **Properties**, and turn on "Allow executing file as program".

If the AppImage doesn't start on a newer Ubuntu, install the FUSE library that AppImages need:

```bash
sudo apt install libfuse2t64
```

(On Ubuntu 22.04 and older the package is called `libfuse2`.)

### .deb

Double-click the file to open it in your software installer, or run:

```bash
sudo apt install ./Kroma-Studio-*.deb
```

Both Linux versions include FFmpeg and yt-dlp.

## What comes with Kroma

| Tool | What it does | Mac | Windows and Linux |
|---|---|---|---|
| FFmpeg | Reads videos, cuts the sound for speech-to-text, exports the finished video | Install with Homebrew | Included |
| yt-dlp | Downloads videos from links | Install with Homebrew | Included |
| uv | Only for removing the original voices from a video | Optional | Optional |

To check what Kroma found, open **Settings → About**. The **Tools** card shows **Installed** or **Missing** for each one, and the install command for anything missing. If FFmpeg or yt-dlp is missing, a red bar at the top of the editor says so too, with the command to run.

On Windows and Linux, Kroma uses its own copies first. On a Mac, it uses Homebrew's first.

## Optional: removing the original voices

Kroma can remove the original speech from a video and keep the music and sound effects, so your voice-over doesn't talk over the original. This uses [uv](https://docs.astral.sh/uv/). The first time you use it, it downloads the tool and the voice-removal model, so it takes longer.

| System | Command |
|---|---|
| Mac | `brew install uv` |
| Windows | `winget install astral-sh.uv` |
| Linux | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

Settings → About shows whether uv is installed.

## Where Kroma keeps your files

| What | Mac | Windows and Linux |
|---|---|---|
| Library (projects, downloads, exports, voices) | `Movies/Kroma Studio` | `Videos/Kroma Studio` |
| Settings and keys | `~/Library/Application Support/Kroma Studio` | `%APPDATA%\Kroma Studio` on Windows, `~/.config/Kroma Studio` on Linux |

See [Projects and files](projects-and-files) for more.

## Uninstalling

- **Mac:** quit Kroma, then drag **Kroma Studio** from Applications to the Trash.
- **Windows:** open **Settings → Apps → Installed apps**, find **Kroma Studio**, and choose **Uninstall**.
- **Linux AppImage:** delete the `.AppImage` file.
- **Linux .deb:** run `sudo apt remove kroma-studio`.

Uninstalling leaves your videos and projects alone. To remove everything, also delete the Library folder and the settings folder from the table above. Deleting the settings folder also deletes your saved API keys.

## Next

[Add your keys](configuration), take [a tour of the editor](the-editor), then [make your first video](first-video).
