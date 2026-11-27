---
title: Add your keys
group: Getting started
section: 1
order: 2
---
Kroma uses online AI services to listen to videos, translate them and write your posts. You use them with **your own keys**. An API key is a long password that a service gives you, so it knows the requests come from your account. You pay Kroma nothing. You only pay what a service charges, and most of them are free to start.

## The short version

For most people, one free key is enough:

1. Get a free **Gemini** key at [Google AI Studio](https://aistudio.google.com/apikey).
2. In Kroma, open **Settings → Translation**, choose **Gemini**, paste the key and click **Save**.

That one key covers translation, speech-to-text, finding characters, and writing social posts. Everything below is optional.

## What happens the first time you open Kroma

If you haven't saved any AI key yet, Kroma opens **Settings → Translation** for you. Add a key, or choose **Google Translate** (no key needed), then click **Back to app** at the top left or press `Esc` to go to the editor.

You can come back any time with the **Settings** button at the bottom of the left rail, or `⌘ ,` on a Mac (`Ctrl+,` on Windows and Linux).

## Which service does what

| Service | Used for | Cost | Key |
|---|---|---|---|
| Gemini | Translation, speech-to-text, characters, posts | Free tier | [Google AI Studio](https://aistudio.google.com/apikey) |
| Google Translate | Translation only | Free | No key |
| Claude | Translation, characters, posts | Paid by use | [Claude Console](https://platform.claude.com/settings/keys) |
| Groq | Speech-to-text | Free to start | [Groq Console](https://console.groq.com/keys) |
| OpenAI | Speech-to-text | Paid | [OpenAI](https://platform.openai.com/api-keys) |
| Microsoft voices | Instant voice-over | Free | No key |
| Khmer Voice Studio engine | Cloned and designed voices | Free (your own engine) | Optional token |
| Upload-Post | Posting to YouTube, Facebook and TikTok | Free plan | [Upload-Post](https://app.upload-post.com/api-keys) |

## Translation

Open **Settings → Translation**. Under **Translator**, choose who turns the subtitles into Khmer (or your chosen language):

| Translator | What the app says | Notes |
|---|---|---|
| **Gemini** | Free tier · good Khmer | The default. Also writes social posts. |
| **Google Translate** | Free · no key · basic | Works straight away. Translations are literal and don't use your notes or earlier lines, so names and politeness may be off. Can't write social posts. |
| **Claude** | Paid · best Khmer | The most natural Khmer, best with names and tone. |

### Gemini

- **API key**: click **Get a key** to open Google AI Studio. No card is needed.
- **Model**: Kroma lists the models your key can use, and new versions appear by themselves. The default is `gemini-flash-latest`, which Google keeps pointed at its current Flash model. Flash models are fast and free. Pro is better but has a smaller free limit.

The free tier limits how many requests you can send per minute. When that happens, Kroma waits and tries again. If Gemini stays busy, or your free daily limit runs out, Kroma switches to the lighter Flash-Lite model. Lines Gemini still couldn't translate are done by Google Translate, and Kroma tells you how many.

Google may use free-tier requests to improve its models. Keep that in mind for private videos.

### Claude

- **API key**: starts with `sk-ant-`. Click **Get a key** to open the Claude Console. You pay Anthropic for what you use.
- **Model**: **Opus 5.5 · best Khmer** (the default), **Sonnet 5.5 · cheaper**, or **Haiku 5.5 · cheapest**.

If you choose Gemini but have only a Claude key, Kroma uses Claude for characters and posts.

### Speed

**Parallel requests** sets how many batches run at once for translation and speech-to-text: **2**, **4** (the default), **6** or **8**. Higher is faster. Lower it if a service says you're sending too much.

## Speech to Text

Speech-to-text turns the video's speech into timed lines. Kroma only needs it when the video didn't come with the site's own subtitles. Open **Settings → Speech to Text** and choose a service:

| Service | What the app says | Notes |
|---|---|---|
| **Gemini** | Your Gemini key · accurate | The default. Uses the key from Settings → Translation, so there's nothing else to set up. Very accurate, with punctuation, but takes about a minute for every 2 minutes of speech. |
| **Groq** | Free key · fastest | Runs Whisper large-v3. A whole movie in about a minute. Keys start with `gsk_`. |
| **OpenAI** | Paid · Whisper | Uses the `whisper-1` model. Keys start with `sk-`. |

For long movies, Groq is much faster than Gemini.

With Groq or OpenAI, an **Advanced** card shows the **Endpoint** and **Model**. You can point Kroma at any OpenAI-compatible transcription service there. Most people never need to change these.

## Voice Engine (optional)

The instant voices from Microsoft need no key. For cloned voices (made from a short recording) and designed voices (storyteller, news anchor and so on), Kroma talks to your own Khmer Voice Studio engine. Set its **Engine address** and, for Google Colab, its **Token** in **Settings → Voice Engine**. The **Status** row shows whether the engine is online. See [Voice engine](voice-engine).

## Posting (optional)

To post to YouTube, Facebook and TikTok in one click, add an **Upload-Post** key in **Settings → Posting**, then press **Connect** to sign in to each platform. YouTube and Facebook work on Upload-Post's free plan (10 posts a month). TikTok needs their Basic plan. See [Posting](posting).

## Downloads and folders

Not keys, but worth setting once:

- **Settings → Downloads → Use my logins from**: some sites, like Bilibili, only give 1080p, or only play some videos, when you're signed in. Choose the browser you're signed in with: Chrome, Safari, Firefox, Edge or Brave. Your system may ask to allow access. Safari also needs Full Disk Access. See [Downloading](downloading).
- **Settings → Folders**: where exports and downloads go. By default it's your Movies folder (Mac) or Videos folder (Windows, Linux), then **Kroma Studio → Exports** and **Kroma Studio → downloads**. See [Settings](settings).

## Saving, replacing and removing a key

Every key field works the same way:

1. Paste the key and click **Save**. A green **Saved** badge appears next to the label.
2. Kroma never shows a saved key again, not even to you. To change it, click **Replace**, paste the new one and click **Save** (or **Cancel**).
3. To delete it, click **Remove**.

Settings save as soon as you change them. There's no separate Save button for the page.

## How your keys are kept safe

- Keys are stored in Kroma's `settings.json` file, encrypted with your system's keychain (the macOS Keychain, Windows' data protection, or the Linux keyring). On a Linux computer with no keyring available, they're stored without encryption.
- Each key is only sent to its own service. Your Gemini key only goes to Google, your Groq key only to Groq, and so on.
- Kroma has no server of its own. Nothing goes through Kroma.

## If a key doesn't work

Common messages and what they mean:

| Message | What to do |
|---|---|
| "Add your free Gemini key in Settings → Translation, or choose Google Translate there." | No Gemini key is saved. Add one, or switch translator. |
| "Add your speech-to-text API key in Settings → Speech to Text (Groq is free to start)." | You chose Groq or OpenAI but saved no key for it. |
| "The speech-to-text API key was refused. Check it in Settings." | The key is wrong or was deleted. Copy it again from the service. |
| "Writing posts needs an AI: add a free Gemini key (or a Claude key) in Settings → Translation." | Google Translate can't write posts. Add a Gemini or Claude key. |

More help is in [Troubleshooting](troubleshooting).
