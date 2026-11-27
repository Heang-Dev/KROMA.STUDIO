---
title: Voice cloning
group: Voices
section: 3
order: 4
---
Cloning makes a new voice from a short recording of one person. Once it's made, you can use it as the project's voice or give it to any character.

Cloning needs the [voice engine](voice-engine) to be running. Cloned voices are made for Khmer.

## Consent comes first

Only clone **your own voice**, or the voice of someone who has given you permission.

Before Kroma clones anything, you must tick this box:

> This is my voice, or I have the speaker's permission to clone it. I won't use it to pretend to be someone or to mislead people.

The **Clone voice** button stays greyed out until it's ticked.

Never use a cloned voice to pretend to be someone else, including singers, actors and other public figures. Don't clone a voice from a video just because you downloaded it.

## Where to start

You can open the clone window from two places:

- **Voices** (left menu) → **Clone voice** at the top right. See [Voice library](voice-library).
- **Voice** panel → **Voice type: Cloned** → **Clone a voice** at the bottom of the list. If you have no cloned voices yet, choosing **Cloned** opens the window straight away.

Both open the same window, called **Clone a voice**. It has:

1. a **Name** box (for example "My voice"),
2. a choice between **Record now** and **Use a file**,
3. the consent box,
4. **Cancel** and **Clone voice** buttons.

If you leave the name empty, the voice is called "My voice".

## Record in the app

**Record now** is the easiest way, and usually the best.

1. Read the Khmer text in the grey box. It says "Read this aloud, clearly and at an easy pace". If you'd like a different text, press **Another text** (there are three to choose from).
2. Press the big red microphone button and start reading.
3. Bars move as you speak, so you can see the microphone hears you. The counter shows the seconds, for example "8 / 20 s".
4. When you finish the text, press the stop button (the red square).
5. Listen back with the player. Press **Record again** if it isn't clear.
6. Type a name, tick the consent box and press **Clone voice**.

### How long

- At least **5 seconds**. If you stop sooner, you'll see "That was only 3.2 s. Read the whole text: at least 5 seconds."
- At most **20 seconds**. Recording stops by itself at 20 seconds.
- Each text takes about 15 seconds to read at an easy pace.

While you record, the hint says **keep reading** for the first 5 seconds, then **press stop when you finish the text**.

### Why reading a text helps

Because you read a text Kroma already knows, the engine doesn't need to work out what you said. It skips that step and stores the text exactly as you read it, so there's no risk of it mishearing the words.

### Tips for a good recording

- Record in a quiet room, with no music, TV or fan noise.
- Avoid rooms with an echo.
- Speak in your normal voice, at an easy pace. The voice will sound the way you read.
- When you listen back, check it's clear, with no music or echo. The app reminds you of this too.
- The line under the bars shows which microphone is being used ("Microphone: …"). If it's the wrong one, change it in your computer's sound settings.

### Microphone permission (Mac)

The first time, macOS asks if Kroma may use the microphone. Click **Allow**.

If you said no before, you'll see "Kroma isn't allowed to use the microphone." Press **Open Microphone settings**, turn Kroma on under **Privacy & Security → Microphone**, then try again.

## Use a file

Choose **Use a file** if you already have a recording.

1. Press **Choose an audio or video file…**.
2. Pick a file. Kroma accepts WAV, MP3, M4A, AAC, OGG, FLAC, MP4, MOV and WebM.
3. Type a name, tick the consent box and press **Clone voice**.

For a good clone, the file should have:

- **5 to 20 seconds** of speech,
- **one person** only,
- speaking **clearly in Khmer**,
- **no music** and as little background noise as possible.

The engine cleans the recording: it trims it, evens out the volume and keeps at most 20 seconds. With a file, the engine also writes down what is said, because Kroma doesn't know the words.

## What happens when you press Clone voice

The button changes to **Cloning…** and the progress shows the engine's messages. When it's done:

- a message says, for example, "Voice "My voice" is ready.",
- the new voice appears under **Your voices** on the Voices page,
- if you started from the **Voice** panel, the new voice becomes the project's voice.

The cloned voice is kept on your computer, in the `Kroma Studio/voices` folder inside your Movies folder. The engine doesn't keep a copy.

## Using a cloned voice

- **For the whole project:** in the **Voice** panel, choose **Voice type: Cloned** and click the voice. It shows "· in use". Or, on the Voices page, use the card's **⋯** menu → **Use in this project**.
- **For one character:** pick it from the character's voice menu, under **Your voices**. See [Characters & voices](characters-and-voices).

In the **Voice** panel each cloned voice shows its sample length and the words it says. Press ▶ to hear it.

**Find automatically** never picks a cloned voice for a character. You always choose it yourself.

## Deleting a cloned voice

Press the bin icon next to the voice in the **Voice** panel, or use **⋯ → Delete** on the Voices page. Kroma asks you to confirm. When you delete it from the **Voice** panel while the project uses it, the project switches back to the first instant voice.

## Importing cloned voices from Khmer Voice Studio

If you made cloned voices in the Khmer Voice Studio dashboard on this computer, you can bring them over with **Voices → Import from KVS**. Preset voices come over by themselves. Each cloned voice needs you to tick it, and to confirm it's your own voice or that you have that person's permission. See [Voice library](voice-library#importing-from-khmer-voice-studio).
