---
title: The voice engine
group: Voices
section: 3
order: 3
---
Kroma has two kinds of voices that sound very different:

- **Instant voices** are Microsoft's free voices. They work straight away, with no key and no setup. You only need an internet connection.
- **Designed** and **cloned** voices are natural, expressive Khmer voices. They come from **Kroma's voice engine**, which is built into Kroma. You don't need any other program.

This page explains how to install and run the engine. If you only use instant voices, you can skip it.

## Instant voices: nothing to set up

Instant voices are the same read-aloud voices Microsoft Edge uses. Kroma asks Microsoft's free service to speak each line and saves the result.

- There are two voices (female and male) for each of Kroma's 7 languages. See the [Voice library](voice-library#instant-voices).
- Kroma speaks up to 6 lines at once, so a whole video takes seconds.
- The free service sometimes drops a line halfway. Kroma reconnects and tries again, up to 4 more times, waiting a little longer each time.
- If no line works at all, you'll see "The voice service didn't answer". Check your internet and try again.

## What the engine does

The engine gives Kroma:

- the **36 designed voices** (storyteller, news anchor, king, children…),
- **cloned voices**, made from a short recording. See [Voice cloning](voice-cloning), and
- **[Story studio](story)**, which reads a whole script with a voice for each character.

When you make a voice-over with an engine voice, Kroma sends all the lines for that voice as one job, so the voice stays the same from line to line. It then cuts the result into one clip per subtitle line, using the engine's own timings. Each clip is saved, so later only new or edited lines go to the engine.

The engine doesn't keep your voices. They're kept on your computer, and Kroma sends the recording along with each job.

The engine is quicker with a graphics card (GPU). You choose where it runs in **Settings → Voice Engine**: on this computer, or on a free Google Colab GPU.

## Install the engine

Open **Settings** (⌘,) → **Voice Engine**. The status at the top shows one of: "Not installed", "Installing…", "Starting…", "On" or "Off". Next to it is the button for that state.

If it says "Not installed", press **Install voice engine**. This is a one-time step. Kroma sets up Python and the engine's packages in its own folder. It takes a few minutes and about 2 GB. If your computer has no Python installer, Kroma downloads a small one (uv) by itself.

| Status | Button | What it does |
|---|---|---|
| Not installed | **Install voice engine** | Installs the engine, once. |
| Off | **Start engine** | Starts the engine. |
| On | **Stop** | Stops it. An engine Kroma started stops when Kroma quits. |
| Any | **Check** | Looks again. |
| Newer engine | **Update** | Shown with "This version of Kroma has a newer engine", after a Kroma update. |

If the engine fails to start, **Show the log** appears so you can see why.

## Where it runs

A switch under **Where it runs** chooses **This computer** or **Google Colab (free GPU)**.

### This computer

- Turn on **Start the engine with Kroma** to start it each time Kroma opens.
- On a Mac it uses the Apple GPU. That's fine for short lines but slower for long stories. Colab is several times faster.
- The first start downloads the voice model (about 5 GB). After that it starts quickly.
- Under **Installed engine**, **Remove** frees about 2 GB. You can install it again any time.

The engine address is `http://127.0.0.1:7861`, which is already the default. You don't need a token.

### Google Colab (free GPU)

Google Colab lets you run programs on Google's computers in your browser, including a free GPU. There are three steps:

1. Press **Open in Colab**. It opens Kroma's notebook (`engine/colab/Kroma_Voice_Engine.ipynb` in the public Heang-Dev/KROMA.STUDIO repository on GitHub). You don't need a GitHub account or token.
2. In Colab choose **Runtime → Change runtime type → T4 GPU**, then **Runtime → Run all**. The first run takes about 5 minutes. The last cell prints an **Address** (it looks like `https://….trycloudflare.com`) and a **Token** (a password for the engine).
3. In Kroma, paste the address into **Engine address** and the token into **Token**.

Keep the Colab tab open while you use Kroma.

## Settings

| Setting | What to put | Default |
|---|---|---|
| **Where it runs** | **This computer** or **Google Colab (free GPU)**. | This computer |
| **Start the engine with Kroma** | Turns the engine on each time Kroma opens. | Off |
| **Engine address** | Colab only. The `https://….trycloudflare.com` address it prints. On this computer it's `http://127.0.0.1:7861`. | `http://127.0.0.1:7861` |
| **Token** | Colab only. The token it prints. | Empty |

### Check the status

Kroma checks the engine each time you change a setting. Press **Check** to check again. The status bar at the bottom of every page also shows "● Voice engine on", "off" or "not installed". Click it to start the engine (when it's installed and off), or to open **Settings → Voice Engine**. The Story studio's top bar shows the same status with a **Start** button.

When it works, you see "On" and something like:

> Online · GPU · 36 designed voices · 1 job(s) running

- **GPU** means it's running on a graphics card (fast), for example on Colab.
- **this computer (slower)** means it's running on your Mac (slower than a GPU).
- The number of designed voices is the engine's own list.
- "job(s) running" appears when the engine is busy with work.

When it doesn't work, you see the reason. The usual ones:

| Message | What to do |
|---|---|
| "Can't reach the voice engine at <address>. Start it in Settings → Voice Engine (or keep its Colab notebook running)." | The engine isn't running, or the address is wrong. Start it, then check the address. |
| "The voice engine refused the token. Copy the token from the engine (Colab prints it) into Settings → Voice Engine." | Paste the token again, exactly as Colab printed it. |
| "Voice engine error …" | The engine had a problem with the job. The message says what. |

## When the engine isn't available

Kroma keeps working. Only the engine voices wait:

- In the **Voice** panel, when you choose **Designed** or **Cloned**, a box says one of:
  - "These voices need the voice engine. Install it once in Settings (about 2 GB)." Press **Install the engine**.
  - "The voice engine is off." Press **Start engine**.
  - "Kroma can't reach your Colab voice engine. …" Press **Set up the engine**.
- When the engine is on, the panel says "The voice engine (this computer, slower / GPU): natural, expressive voices…".
- **Make voice-over** is greyed out while the chosen voice is an engine voice.
- The designed voices are still listed (Kroma has its own copy of the list), so you can choose voices for characters ahead of time.
- Voices that already have a saved sample can still be played with ▶.
- **Make a sample** buttons say **Start the engine to make a sample**, and **Clone voice** is greyed out.
- Instant voices keep working as usual.

While an engine job runs, the progress shows the engine's own messages, for example "Voice engine: …", with a time estimate when the engine gives one.

## Tips

- Engine voices are slower than instant ones. Check your timing with an instant voice first, then switch to a designed or cloned voice once the subtitles are final. Only changed lines are redone.
- Designed and cloned voices are made for Khmer. For other languages, use the instant voices.
