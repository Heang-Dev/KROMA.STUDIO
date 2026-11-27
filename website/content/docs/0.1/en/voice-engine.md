---
title: The voice engine
group: Voices
section: 3
order: 3
---
Kroma has two kinds of voices that sound very different:

- **Instant voices** are Microsoft's free voices. They work straight away, with no key and no setup. You only need an internet connection.
- **Designed** and **cloned** voices are natural, expressive Khmer voices. They come from a separate program called the **Khmer Voice Studio engine** (KVS for short). It runs an AI voice model called VoxCPM2.

This page explains how to run the engine and connect Kroma to it. If you only use instant voices, you can skip it.

## Instant voices: nothing to set up

Instant voices are the same read-aloud voices Microsoft Edge uses. Kroma asks Microsoft's free service to speak each line and saves the result.

- There are two voices (female and male) for each of Kroma's 7 languages. See the [Voice library](voice-library#instant-voices).
- Kroma speaks up to 6 lines at once, so a whole video takes seconds.
- The free service sometimes drops a line halfway. Kroma reconnects and tries again, up to 4 more times, waiting a little longer each time.
- If no line works at all, you'll see "The voice service didn't answer". Check your internet and try again.

## What the engine does

The engine gives Kroma:

- the **36 designed voices** (storyteller, news anchor, king, children…), and
- **cloned voices**, made from a short recording. See [Voice cloning](voice-cloning).

When you make a voice-over with an engine voice, Kroma sends all the lines for that voice as one job, so the voice stays the same from line to line. It then cuts the result into one clip per subtitle line, using the engine's own timings. Each clip is saved, so later only new or edited lines go to the engine.

The engine doesn't keep your voices. They're kept on your computer, and Kroma sends the recording along with each job.

The engine needs a graphics card (GPU) to be quick. You have two choices.

## Option 1: a free Google Colab GPU (fast)

Google Colab lets you run programs on Google's computers in your browser, including a free GPU.

1. Open `KHMER.VOICE.STUDIO/engine/colab/KhmerVoiceStudio_Colab.ipynb` in Google Colab.
2. Choose a **T4 GPU**.
3. Run the cells.
4. The notebook prints an **address** (it looks like `https://….trycloudflare.com`) and a **token** (a password for the engine).
5. In Kroma, open **Settings → Voice Engine**. Paste the address into **Engine address** and the token into **Token**.

## Option 2: your own computer (slower)

In the KHMER.VOICE.STUDIO folder, run:

```bash
make engine
```

The first time, this downloads the voice model (about 5 GB). After that it starts quickly.

On your own computer the engine is at `http://127.0.0.1:7861`. That's already Kroma's default **Engine address**, so you don't need to change anything. You don't need a token either.

On a Mac, the engine runs on the Mac itself. It works, just more slowly than on a Colab GPU. Kroma shows this as "this computer, slower".

## Connecting Kroma

Open **Settings** (⌘,) → **Voice Engine**.

| Setting | What to put | Default |
|---|---|---|
| **Engine address** | The engine's address. Your own computer: `http://127.0.0.1:7861`. Colab: the `https://….trycloudflare.com` address it prints. | `http://127.0.0.1:7861` |
| **Token** | The token Colab prints. Only needed for Colab. | Empty |

### Check the status

The **Status** row checks the engine each time you change the address or token. Press **Check** to check again.

When it works, you see a green tick and something like:

> Online · GPU · 36 designed voices · 1 job(s) running

- **GPU** means it's running on a graphics card (fast), for example on Colab.
- **this computer (slower)** means it's running on your Mac (slower than a GPU).
- The number of designed voices is the engine's own list.
- "job(s) running" appears when the engine is busy with work.

When it doesn't work, you see a red cross and the reason. The usual ones:

| Message | What to do |
|---|---|
| "Can't reach the voice engine at … Start it (KVS: make engine, or the Colab notebook) and check Settings → Voice Engine." | The engine isn't running, or the address is wrong. Start it, then check the address. |
| "The voice engine refused the token. Copy the token from the engine (Colab prints it) into Settings → Voice Engine." | Paste the token again, exactly as Colab printed it. |
| "Voice engine error …" | The engine had a problem with the job. The message says what. |

## When the engine isn't connected

Kroma keeps working. Only the engine voices wait:

- In the **Voice** panel, when you choose **Designed** or **Cloned**, a red box says "The KVS voice engine isn't reachable." with the reason. Press **Set up the engine** to open **Settings → Voice Engine**, or **Try again** once it's running.
- **Make voice-over** is greyed out while the chosen voice is an engine voice.
- The designed voices are still listed (Kroma has its own copy of the list), so you can choose voices for characters ahead of time.
- Voices that already have a saved sample can still be played with ▶.
- **Make a sample** buttons say **Start the engine to make a sample**, and **Clone voice** is greyed out.
- Instant voices keep working as usual.

While an engine job runs, the progress shows the engine's own messages, for example "Voice engine: …", with a time estimate when the engine gives one.

## Tips

- Engine voices are slower than instant ones. Check your timing with an instant voice first, then switch to a designed or cloned voice once the subtitles are final. Only changed lines are redone.
- Designed and cloned voices are made for Khmer. For other languages, use the instant voices.
