---
title: Settings
group: Reference
section: 5
order: 3
---
A reference for every option in Settings: what it does and what it's set to when you first install Kroma.

## Opening Settings

- Press ⌘, (Mac) or Ctrl+, (Windows / Linux), or
- click **Settings** (the gear) at the bottom of the left menu.

Settings fills the window. The pages are listed on the left in groups, with the version you're running at the bottom. **Back to app**, the **×** at the top right, or Esc takes you back to the editor.

**Changes save as you make them.** There's no Save button, except for API keys.

To find an option fast, type in **Search settings** (⌘F / Ctrl+F). It matches page names and common words, like "cookies", "zoom" or "Groq". Press Enter to open the first match.

The very first time you open Kroma, Settings opens on **Translation** for you, so you can add a key. After that, Kroma opens where you work, also after a restart or an update.

## How key fields work

Every API key field works the same way:

- Paste the key and press **Save**. The field then shows a **Saved** badge. Kroma never shows the key again.
- **Replace** lets you paste a new key. **Cancel** keeps the old one.
- **Remove** deletes the saved key.
- **Get a key** opens the page where that service gives you a key.
- *A key is saved, but this version of Kroma can't read it from the keychain.* means the key is still stored, but this copy of Kroma isn't allowed to read it (this can happen on a Mac after an update). Paste it again, or reopen Kroma and choose **Always Allow** when the Mac asks. The stored key is never replaced with an empty one.

Keys are encrypted with your system's keychain and only sent to their own service. See [Projects and files](projects-and-files#your-keys-on-disk).

## Translation

Group: **AI services**

### Translator

Who turns the subtitles into your language. Gemini and Claude also write the social posts.

| Choice | Shown as | What it means |
|---|---|---|
| **Gemini** (default) | Free tier · good Khmer | Needs a free Google AI Studio key. |
| **Google Translate** | Free · no key · basic | Works straight away. Literal, ignores your notes and the earlier lines, so names and politeness may be off. Can't write social posts. |
| **Claude** | Paid · best Khmer | Needs an Anthropic API key. The most natural wording, best with names and tone. |

### Gemini

Shown when the translator is Gemini.

| Option | Default | What it does |
|---|---|---|
| **API key** | none | Your key from [Google AI Studio](https://aistudio.google.com/apikey). It starts with `AIza`. |
| **Model** | `gemini-flash-latest` | Which Gemini model to use. The list comes from your key, so new models appear by themselves. Flash models are fast and free; Pro is better but has a smaller free limit. |

The free tier limits how many requests you can make per minute. Kroma waits when it has to. Google may use free-tier requests to improve its models.

If your chosen model is retired, Kroma switches to `gemini-flash-latest` and saves that. If Gemini is busy or your daily limit is used up, Kroma tries the lighter Flash-Lite model, and lines Gemini still can't do are translated with Google Translate (Kroma tells you how many).

### Google Translate

Shown when the translator is Google Translate. Nothing to set up: **Ready to use**.

### Claude

Shown when the translator is Claude. Paid by use (Anthropic API).

| Option | Default | What it does |
|---|---|---|
| **API key** | none | Your Anthropic key. It starts with `sk-ant-`. |
| **Model** | Opus 5.5 · best Khmer | Also **Sonnet 5.5 · cheaper** and **Haiku 5.5 · cheapest**. |

### Speed

| Option | Default | What it does |
|---|---|---|
| **Parallel requests** | 4 | How many batches run at once (2, 4, 6 or 8), for translation and speech to text. Lower it if a service says you're sending too much. Gemini translation never runs more than 2 at once. |

## Speech to Text

Group: **AI services**

Turns the video's speech into timed lines when the site has no subtitles. It runs in the cloud, several parts at once.

### Service

| Choice | Shown as | What it means |
|---|---|---|
| **Gemini** (default) | Your Gemini key · accurate | Uses the Gemini key from **Translation**. Very accurate, with punctuation. About a minute for every 2 minutes of speech. |
| **Groq** | Free key · fastest | Whisper large-v3 on Groq's servers: a whole movie in about a minute. |
| **OpenAI** | Paid · Whisper | OpenAI's Whisper. |

With Gemini, this page shows whether your Gemini key is ready. If it isn't, **Add key** takes you to **Translation**.

### Groq or OpenAI

| Option | Default | What it does |
|---|---|---|
| **API key** | none | A Groq key starts with `gsk_`; an OpenAI key starts with `sk-`. |
| **Endpoint** (under **Advanced**) | `https://api.groq.com/openai/v1` | The service's address. Picking Groq or OpenAI fills it in. You can type any OpenAI-compatible transcription address. |
| **Model** (under **Advanced**) | `whisper-large-v3` | Picking OpenAI sets `whisper-1`. |

Text fields like **Endpoint** save when you press Enter or click away.

## Voice Engine

Group: **AI services**

Installs and runs Kroma's own voice engine, which gives you cloned and designed voices. Instant voices don't need it. See [The voice engine](voice-engine).

| Option | Default | What it does |
|---|---|---|
| **Status** | — | **Not installed**, **Installing…**, **Starting…**, **On** or **Off**, with the button for that state: **Install voice engine**, **Start engine**, **Stop**, **Update** or **Check**. **Show the log** appears if starting fails. |
| **Where it runs** | This computer | **This computer** or **Google Colab (free GPU)**. |
| **Start the engine with Kroma** | Off | Turns the engine on each time Kroma opens (this computer only). |
| **Installed engine** → **Remove** | — | This computer only. Removes the engine and frees about 2 GB. You can install it again any time. |
| **Engine address** | `http://127.0.0.1:7861` | Colab only. The `https://….trycloudflare.com` address the notebook prints. On this computer the default is used. |
| **Token** | none | Colab only. Paste the token the notebook prints. |

[The voice engine](voice-engine) explains installing it and the two places it can run: this computer, or a free Colab GPU (faster).

## Posting

Group: **Social**

Kroma posts to YouTube, Facebook and TikTok through Upload-Post (upload-post.com). See [Posting](posting).

| Option | What it does |
|---|---|
| **API key** | Your Upload-Post key, from app.upload-post.com → API Keys. |
| **Account** | Your Upload-Post email and plan. **Check** tests the key again. |
| **Profile** | Only shown if you have more than one Upload-Post profile. Each profile has its own accounts. |
| **YouTube**, **Facebook**, **TikTok** | Which account is connected, **Not connected**, or "sign-in expired: press Connect". |
| **Facebook Page** | The Page videos are posted to. Facebook doesn't let apps post to personal profiles. Shows **No Pages found** if there are none. |
| **Connect accounts** → **Connect** | Opens a secure Upload-Post page in your browser. Sign in to each platform and allow access, then come back: the list updates by itself. |

TikTok needs Upload-Post's Basic plan. YouTube and Facebook work on the free plan (10 posts a month).

Before you add a key, **Getting started** shows the three steps: make a free account (**Open**), copy your API key, connect your accounts.

## Downloads

Group: **Media**

| Option | Default | What it does |
|---|---|---|
| **Use my logins from** | None · public videos only | Lets downloads use your sign-in from **Chrome**, **Safari**, **Firefox**, **Edge** or **Brave**. Sites like Bilibili only give 1080p, and some videos only play, when you're signed in. |

Sign in to the site in that browser first. Your system may ask you to allow access. Safari also needs Full Disk Access (macOS **System Settings → Privacy & Security → Full Disk Access**).

## Folders

Group: **Media**

| Option | Default | What it does |
|---|---|---|
| **Export folder** | `Kroma Studio/Exports` | Where finished videos and subtitle files go. |
| **Ask where to save each time** | Off | Off: **Export** saves straight into the export folder with a new name (it never overwrites a file, it adds "(2)", "(3)" …) and shows you the file. On: you choose the name and place every time. |
| **Download folder** | `Kroma Studio/downloads` | Where videos from links go, each in its own folder with the site's subtitles. |
| **Library folder** | `Kroma Studio` | Voice clips, cloned voices, stories, timeline pictures, the Download Center's projects and the batch list. This one can't be changed. |

Each folder has **Open**. The export and download folders also have **Change…**, and **Reset** to go back to the default. The `Kroma Studio` folder is in Movies on a Mac and in Videos on Windows and Linux ([full paths](projects-and-files#where-files-live)).

## Appearance

Group: **Interface**

| Option | Default | What it does |
|---|---|---|
| **Language** | Automatic | The language of Kroma's menus, buttons and messages: **ខ្មែរ**, **English**, or **Automatic**, which uses Khmer when your computer is set to Khmer. It switches at once, without restarting. Your subtitles and voices don't change. See [Language](#language). |
| **Interface size** | 90% | Makes everything bigger or smaller, like zooming a web page: 70%, 80%, 90%, 100%, 110%, 125% or 140%. Also ⌘+ / ⌘− and ⌘0 for 100% (Ctrl on Windows and Linux). |
| **Theme** | Dark | **Dark**, **Light**, or **System**, which follows your computer's setting. |

### Language

Kroma can be used in **ខ្មែរ** or **English**. Every panel, page, setting, button, notification, error and the Mac menu bar switch together, and your open project stays as it is. A few names stay in English in both: brand names (YouTube, Gemini…), the page names **Batch**, **Story**, **Download Center** and **Ready to post**, and the designed voice names. These docs name buttons and settings in English; with Kroma in Khmer you'll see them in Khmer in the same place.

## Notifications

Group: **Interface**

When Kroma tells you that long work finished or failed. Everything is always kept in the bell in the title bar.

| Option | Default | What it does |
|---|---|---|
| **Notify me when Kroma is in the background** | On | System notifications. Failures show one even while you're in Kroma. |
| **Play a sound** | On | When work finishes or fails, in Kroma and in system notifications. |
| **When work is done**, **When something fails** | Glass, Basso | The two sounds. On a Mac, pick from its own sounds; **Play** previews them. |
| **Only when something fails** | Off | Finished work shows in the bell only, without a system notification. |
| **Send a test notification** | — | **Send test** shows one now. |
| **Not seeing them?** | — | **Open** opens your system's notification settings. |
| **What to notify about** | All on | **Downloads**, **Subtitles & translation**, **Voices & stories**, **Export & posting**, **Updates**. Off: no system notification or notice when it worked; failures still show. |
| **Notification history** | — | How many are in the bell (the last 100 are kept). **Clear history** empties it. |

See [Notifications](notifications).

## Shortcuts

Group: **Interface**

A list of the editor's keyboard shortcuts. Nothing to change here. The full list, with Windows and Linux keys, is on [Keyboard shortcuts](keyboard-shortcuts).

## About

Group: **Kroma**

### About

Shows **Kroma Studio** and the version you're running, for example **Kroma Studio 0.2.0**, with a line about what Kroma does.

### Updates

| Option | Default | What it does |
|---|---|---|
| **Check for updates** → **Check now** | — | Looks for a new version right away. The line under it says what's happening, for example "You have the latest version (0.2.0)." |
| **Update automatically** | On | Downloads new versions in the background. Off: Kroma only tells you a new version is out, and **Check now** doesn't download either. |
| **What's new** → **Changelog** | — | Opens the list of changes in your browser. |

See [Updates](updates).

### Tools

Shows whether Kroma found the programs it needs, with **Installed** or **Missing**. When one is missing, the command to install it is shown underneath.

| Tool | Used for |
|---|---|
| **FFmpeg** | Reading, cutting and exporting video |
| **yt-dlp** | Downloading videos from links |
| **uv (for removing voices)** | Removing the original voices. Optional. |

On a Mac, FFmpeg and yt-dlp are installed with Homebrew and Kroma finds them on its own. On Windows and Linux they come with Kroma.

## Where settings are saved

All of this is saved in `settings.json` in Kroma's settings folder. See [Projects and files](projects-and-files#the-settings-folder). Settings are shared by every window and kept when Kroma updates.
