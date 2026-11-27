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

Settings fills the window. The pages are listed on the left in groups. **Back to app**, the **×** at the top right, or Esc takes you back to the editor.

**Changes save as you make them.** There's no Save button, except for API keys.

To find an option fast, type in **Search settings** (⌘F / Ctrl+F). It matches page names and common words, like "cookies", "zoom" or "Groq". Press Enter to open the first match.

The first time you open Kroma, if you have no keys yet, Settings opens on **Translation** for you.

## How key fields work

Every API key field works the same way:

- Paste the key and press **Save**. The field then shows a **Saved** badge. Kroma never shows the key again.
- **Replace** lets you paste a new key. **Cancel** keeps the old one.
- **Remove** deletes the saved key.
- **Get a key** opens the page where that service gives you a key.

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
| **Library folder** | `Kroma Studio` | Voice clips, cloned voices, timeline pictures and saved projects. This one can't be changed. |

Each folder has **Open**. The export and download folders also have **Change…**, and **Reset** to go back to the default. The `Kroma Studio` folder is in Movies on a Mac and in Videos on Windows and Linux ([full paths](projects-and-files#where-files-live)).

## Appearance

Group: **Interface**

| Option | Default | What it does |
|---|---|---|
| **Interface size** | 90% | Makes everything bigger or smaller, like zooming a web page: 70%, 80%, 90%, 100%, 110%, 125% or 140%. Also ⌘+ / ⌘− and ⌘0 for 100% (Ctrl on Windows and Linux). |
| **Theme** | Dark | **Dark**, **Light**, or **System**, which follows your computer's setting. |

## Shortcuts

Group: **Interface**

A list of the editor's keyboard shortcuts. Nothing to change here. The full list, with Windows and Linux keys, is on [Keyboard shortcuts](keyboard-shortcuts).

## About

Group: **Kroma**

### About

Shows **Kroma Studio** and the version you're running, for example **Kroma Studio 0.1.3**.

### Updates

| Option | Default | What it does |
|---|---|---|
| **Check for updates** → **Check now** | — | Looks for a new version right away. The line under it says what's happening, for example "You have the latest version (0.1.3)." |
| **Update automatically** | On | Downloads new versions in the background. Off: Kroma only tells you a new version is out. |
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
