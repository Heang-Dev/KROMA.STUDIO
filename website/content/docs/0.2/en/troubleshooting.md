---
title: Troubleshooting
group: Reference
section: 5
order: 5
---
Find the message you see, or the problem you have, and follow the steps. Messages in quotes are exactly what Kroma shows.

When a task fails, Kroma shows a red note at the bottom of the window with a title like **Download failed** or **Export failed**, and the reason underneath. It's also kept in the [bell](notifications) in the title bar, so you can read it later, and often has a **Retry** button. The sections below are sorted by that task.

## Installing and opening

### macOS: "Kroma Studio is damaged" or it won't open

Kroma isn't signed with an Apple certificate yet, so macOS blocks it the first time. Move it into **Applications**, then run this once in Terminal:

```bash
xattr -cr "/Applications/Kroma Studio.app"
```

Then open it again. See [Installation](installation#macos).

### Windows: "Windows protected your PC"

The installer isn't code-signed yet. Click **More info**, then **Run anyway**.

### Linux: the AppImage does nothing

Make it executable first:

```bash
chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage
```

Or install the `.deb` instead.

### I open Kroma but no new window appears

Kroma only runs once. Opening it again brings the open window to the front. To work on a second project, use **File → New Window** (⇧⌘N / Ctrl+Shift+N). See [Projects and files](projects-and-files#only-one-kroma-at-a-time).

On a Mac, Kroma keeps running after you close its last window. Click the Dock icon to get a window back.

## Missing FFmpeg or yt-dlp

A red bar at the top of the editor says **Missing ffmpeg, ffprobe, yt-dlp. Install with:** and shows the command for your system. **Settings → About → Tools** shows the same thing, tool by tool.

| System | What to do |
|---|---|
| macOS | Install [Homebrew](https://brew.sh), then run `brew install ffmpeg yt-dlp`. |
| Windows | They come with Kroma. If they're missing, reinstall Kroma, or run `winget install Gyan.FFmpeg` and `winget install yt-dlp.yt-dlp`. |
| Linux | They come with Kroma. If they're missing, run `sudo apt install ffmpeg yt-dlp`. |

Restart Kroma after installing. Kroma looks in the usual install places (Homebrew, WinGet, Scoop, Chocolatey, `/usr/local/bin` and others), so you don't need to change any system settings.

You may also see "ffmpeg is not installed. Install it with: …" (or the same for yt-dlp) when a task needs the tool.

## Downloading from a link

| Message | What to do |
|---|---|
| "Paste a link that starts with https:// (a share message with a link in it works too)." | Copy the full link. A share message from Douyin or Bilibili works too, as long as it contains the link. |
| "This link isn't a video page Kroma can download from. Open the video itself and copy its link, or check the site is supported." | You copied a link to a channel, a search or a home page. Open the video and copy its own link. |
| "This video needs you to be signed in. Choose your browser in Settings → Downloads, sign in to the site there, then try again." | Pick your browser in [Settings → Downloads](settings#downloads), sign in to the site in that browser, and try again. |
| "This video is protected (encrypted), so it can't be downloaded." | The video uses DRM. Kroma can't download it. |
| "The video isn't available any more (removed, or the link is wrong)." | Check the link in your browser. |
| "This video isn't available from your country." | The site blocks it where you are. |
| "The connection failed. Check your internet and try again." | Check your internet and try again. |
| "The download finished but no video file was found." | Try again. If it keeps happening, report it (see below). |

More tips:

- **Only 720p or lower from Bilibili?** Bilibili gives 1080p only when you're signed in. Choose your browser in **Settings → Downloads**.
- **Safari logins don't work?** Safari also needs Full Disk Access: macOS **System Settings → Privacy & Security → Full Disk Access**, turn on Kroma Studio.
- **A site that used to work stopped working?** Sites change often. On Windows and Linux, update Kroma: its yt-dlp is updated with it. On a Mac, run `brew upgrade yt-dlp`.
- If the site's subtitles fail to download, Kroma shows "Retrying without the site's subtitles…" and downloads the video anyway. You can make subtitles with speech to text instead.

### The Download Center

| What you see | What to do |
|---|---|
| "No links found. Paste links that start with https://, one per line." | Paste the full links (or share messages that contain them), one per line. |
| The queue pauses: "The site wants a break (too many downloads in a row)…" | Bilibili or YouTube is slowing you down. Wait (Bilibili: a few minutes; YouTube: up to an hour) and press **Resume**, or turn on browser logins in **Settings → Downloads**. |
| **Already downloaded** | Kroma downloaded that video before, so it doesn't download it twice. To get it again, remove it from the list first (**Remove from the list (the files stay)**), then add it again. |
| "No video files in that folder" | **Import a folder…** only looks directly in that folder (not in folders inside it), for mp4, mov, mkv, webm, m4v, avi and flv files. |
| "No video in this file (sound only)." or "Kroma can't read this file (damaged, or not a video)." | That file can't become a project. Untick it. |
| **Free only** next to a site | Free episodes download; VIP episodes are protected (DRM) and can't be downloaded by any app like this one. |

## AI keys and limits

### Missing keys

| Message | What to do |
|---|---|
| "Add your free Gemini key in Settings → Translation, or choose Google Translate there." | Add a Gemini key, or switch the translator to Google Translate. See [Add your keys](configuration). |
| "Add your Anthropic API key in Settings to translate with Claude." | Add a Claude key, or pick another translator. |
| "Add your free Gemini key in Settings → Translation (speech to text uses it too), or choose Groq in Settings → Speech to Text." | Speech to text uses Gemini by default. Add the key, or choose Groq. |
| "Add your speech-to-text API key in Settings → Speech to Text (Groq is free to start)." | Add your Groq or OpenAI key. |
| "Writing posts needs an AI: add a free Gemini key (or a Claude key) in Settings → Translation." | Google Translate can't write posts. Add a Gemini or Claude key. |
| "Finding characters needs your free Gemini key (Settings → Translation) or a Claude key." | Same as above. |

### A key can't be read

*A key is saved, but this version of Kroma can't read it from the keychain.* The key is still stored, but this copy of Kroma isn't allowed to read it (this can happen on a Mac after an update). Paste it again, or reopen Kroma and choose **Always Allow** when your Mac asks. If a key is missing altogether after an update from before 0.1.11, paste it again in **Settings → Translation**, **Speech to Text** or **Posting**.

### A key is refused

| Message | What to do |
|---|---|
| "The Gemini API key was refused. Check it in Settings → Translation." | Copy the key again from Google AI Studio and use **Replace**. |
| "The Anthropic API key was refused. Check it in Settings." | Copy the key again from the Claude console. |
| "The speech-to-text API key was refused. Check it in Settings." | Copy your Groq or OpenAI key again. |
| "This Gemini key can't use that model. Pick another model in Settings → Translation." | Choose a Flash model. |
| "That Gemini model isn't available. Pick another one in Settings → Translation." | Choose another model from the list. |

### Gemini is busy or out of free requests

| Message | What it means |
|---|---|
| "Gemini is busy, retrying in … s…" | Normal on the free tier. Kroma waits and tries again by itself. |
| "Gemini's free daily limit is reached, using the lighter Flash-Lite model…" | Kroma switched to a lighter model to keep going. |
| "Gemini was busy, so … lines used Google Translate." | The job finished, but some lines used Google Translate. Later, press **Translate all** for Gemini's better wording. |
| "Gemini's free limit is used up for now. Wait a minute, lower 'Parallel requests', or switch to Google Translate." | Wait, or set **Parallel requests** to 2 in [Settings → Translation](settings#speed). |
| "Gemini's free daily limit is used up (it resets tomorrow). Switch to Google Translate, or add a Groq key for speech to text." | Use Google Translate or Claude today, and Groq for speech to text. |
| "Gemini is very busy right now. Try again in a few minutes." | Google's servers are overloaded. Wait a little. |
| "Gemini didn't answer in time (it's very busy right now)." | Same. Try again later. |

Other services:

- "Claude is rate limiting this key. Lower 'parallel requests' in Settings or try again shortly."
- "Google Translate is busy (too many requests). Try again in a few minutes, or use Gemini."

### Some lines weren't translated

"Translated … of … lines" with "… need another try." Press **Translate missing** on the notice, or **Only missing** in **Translate → Step by step**. It only sends the lines that are still empty.

### "No speech was found."

Speech to text heard nothing it could write down. Check the video has speech, and that **Spoken language** in the **Translate** panel is right.

## Voices

### "Can't reach the voice engine at …"

Designed and cloned voices need the voice engine to be running. Open [Settings → Voice Engine](settings#voice-engine) and press **Start engine** (or **Install voice engine** first if it says "Not installed"), then press **Check**. If you use Colab, keep its notebook running and check the address. A Colab address changes every time you start the notebook, so paste the new one. Or use the instant voices, which don't need the engine. See [The voice engine](voice-engine).

### "The voice engine refused the token."

Copy the token the Colab notebook prints into **Settings → Voice Engine → Token**.

### Instant voices fail

"The voice service didn't answer. Check your internet and try again." or "The voice service timed out". The instant voices come from an online service. Check your internet and press **Make voice-over** again. Lines already done are kept.

### "Voiced … lines; … not done. Press again to finish them."

Press the voice-over button in the **Voice** panel again (it then reads **Voice the … new lines**). It only makes the lines that are missing.

### I still hear the original voices

- Check that **Voice → Mix → Remove the original voices** is on.
- Removing voices needs [uv](installation). Without it you see "Removing voices needs uv. Install it with: …". **Settings → About → Tools** shows the command for your system.
- The first time, Kroma downloads the voice-removal tool and model. That can take a while: wait for it to finish.
- If removing fails, Kroma says "The original voices are still in". Try again from **Voice → Mix**, then export again.

### The microphone doesn't work (Mac)

"Kroma isn't allowed to use the microphone. Turn it on in System Settings → Privacy & Security → Microphone, then try again." Press **Open Microphone settings**, turn on Kroma Studio, and try again.

## Exporting

### An export fails

When an export fails, Kroma saves the full details in a file called `last-export-error.log` in its settings folder:

| System | File |
|---|---|
| macOS | `~/Library/Application Support/Kroma Studio/last-export-error.log` |
| Windows | `%APPDATA%\Kroma Studio\last-export-error.log` |
| Linux | `~/.config/Kroma Studio/last-export-error.log` |

Each failed export replaces it. Attach it when you [report the problem](#reporting-a-problem).

Things to check first:

- **"The timeline is empty."** Add a video to the timeline.
- **A video, image or voice file was moved or deleted.** The project only points to its files. Put them back where they were. See [Projects and files](projects-and-files#the-project-file).
- **The disk is full.** Free some space, or [clear Kroma's cache](projects-and-files#clearing-space).
- **"Some lines have no voice yet; they'll be silent."** This isn't an error. Press **Make voice-over** before exporting to fill them.

### Export is slow

**High** takes about three times as long as **Standard**. On a Mac, **Standard** is the fastest because it uses the Mac's video chip. See [Export](export).

## Batch and series tools

| What you see | What to do |
|---|---|
| **Failed at …** on a video | Click **See why** for the reason. Fix it, then press **Retry from here**, or **Fix by hand** to open the project on that step. Every step done so far is kept. See [Batch](batch#step-details). |
| "The project file was moved or deleted." | Batch opens each project from its file. Put it back, or remove the video from the list and add the project again. |
| "That saved style was deleted. Choose another subtitle style in the steps." | The style chosen in **Subtitle style** was deleted from **My styles**. Pick another one. |
| **Stopped at …** | You pressed **Stop**, or Kroma closed during the batch. Press **Resume**. |
| New, Open and Save are greyed out | A batch is using the editor. Wait for it, or press **Stop** in the bar at the top. |
| "No burned-in subtitles found" | Kroma didn't find subtitles burned into the video. If there are some, move the box it placed over them by hand. In Batch this isn't a failure. |
| "Finding names needs Gemini or Claude: add a key in Settings → Translation." | The series glossary finds names with Gemini or Claude. With Google Translate, add names by hand. |
| "Save the project first: the glossary is shared by the projects in its folder." | Save the project (⌘S) in its series folder. |
| The cover shows no episode number | The project's name has no number Kroma recognises. Type it in **Post → Cover → Episode**, or name the project like `05 - Title`. |

## Notifications

**No system notifications, or no sound?** Press **Send test** in **Settings → Notifications**. If nothing shows outside Kroma, open **Not seeing them?** and allow Kroma Studio in your system's notification settings, with sound. Also check that Focus or Do Not Disturb is off. See [Notifications](notifications#not-seeing-them).

## Posting

| Message | What to do |
|---|---|
| "Connect your accounts first" / "Add your Upload-Post API key in Settings → Posting first." | Add your key in [Settings → Posting](settings#posting). |
| "Upload-Post refused the API key. Copy it again from app.upload-post.com → API Keys into Settings → Posting." | Copy the key again. |
| "This month's Upload-Post uploads are used up (the free plan has 10). Upgrade the plan or wait for next month." | Upgrade your Upload-Post plan, or wait. |
| "Choose your Facebook Page" | Pick the Page in **Settings → Posting → Facebook Page**. |
| "Can't reach Upload-Post. Check your internet connection." | Check your internet. |
| "Upload-Post didn't answer in time. Check your internet and try again." | Try again. Kroma never posts the same video twice for one try. |
| "Still processing on the platform. Check it there in a few minutes." | The upload worked; the platform is still working on it. Check YouTube, Facebook or TikTok later. |
| "Stopped following the post. It may still finish on the platforms." | You cancelled while Kroma was waiting. The post may still appear. |

An account that says "sign-in expired: press Connect" in **Settings → Posting** needs you to press **Connect** and sign in again. TikTok needs Upload-Post's Basic plan. See [Posting](posting).

## Updates

| Message | What to do |
|---|---|
| "Couldn't reach GitHub to check for updates." | Check your internet, then **Settings → About → Check now**. |
| "No releases found yet." | Nothing to install. Try again later. |
| "Kroma can't replace itself in …. Drag the new Kroma Studio from the window that opened into Applications." | Mac: Kroma isn't in your Applications folder (for example you opened it from the disk image). Drag the new app into **Applications** and open it from there. |
| "The downloaded update is missing. Check for updates again." | Press **Check now** in **Settings → About**. |
| "The update couldn't be installed": "macOS didn't let Kroma replace itself…" | Mac: allow Kroma Studio in **System Settings → Privacy & Security → App Management** and update again, or drag the new Kroma Studio from the Finder window into **Applications**. See [Updates](updates#on-a-mac). |
| "The download was damaged. It will download again on the next check." | Nothing to do: Kroma downloads it again. |

**No update shows up?** Kroma checks about 8 seconds after it starts and then every 4 hours. Press **Check now** to check right away. If **Update automatically** is off, Kroma only tells you a new version exists, even when you press **Check now**: press **Download** on the card at the bottom right. Version 0.1.0 can't update itself; install a newer version by hand once. See [Updates](updates) and [Upgrade guide](upgrade).

**Linux `.deb`:** the update opens in your system's installer and asks for your password. Kroma can't finish it for you.

## Reporting a problem

If none of this helps, [open an issue on GitHub](https://github.com/Heang-Dev/KROMA.STUDIO/issues). Include:

1. Your Kroma version: **Settings → About** shows it, for example **Kroma Studio 0.2.0**.
2. Your system: macOS, Windows or Linux, and its version.
3. What you did, what you expected, and the exact message Kroma showed.
4. For an export problem, attach `last-export-error.log` (see [An export fails](#an-export-fails)).
5. For a download problem, the link you used, if it's public.

Kroma doesn't keep other log files, so the message on screen is the most useful thing to copy.

**Never** paste your API keys into an issue, and don't attach `settings.json`.
