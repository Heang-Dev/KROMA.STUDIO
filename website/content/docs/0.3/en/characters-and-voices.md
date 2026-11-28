---
title: Characters & voices
group: Voices
section: 3
order: 1
---
A voice-over reads your translated subtitles aloud, each line at its own time in the video. In a drama, every character can speak with a different voice: the mother gets a warm voice, the villain a dark one, the narrator a deep one.

Everything on this page happens in the **Voice** panel (left menu). The panel has three parts, top to bottom: **Characters**, the voice-over itself (called **Default voice** once you have characters), and **Mix**.

You need translated subtitles first. If there are none, the panel says **Make the subtitles first.**

## Characters

A character is a person who speaks in the video. Each character has a name, a colour and a voice. Lines that belong to a character are spoken in that character's voice. Lines with no character are spoken by the **Default voice**.

Characters are optional. A vlog or an explainer with one speaker works fine with only the default voice.

### Find characters automatically

Press **Find automatically**. Kroma reads the dialogue (about 20 seconds) and:

- names each character the way the video does, like a name or a role ("Mother", "Boss", "Narrator"),
- writes a short description, like "old man, the grandfather",
- decides who says each line,
- picks a voice for each character, matching gender and age first, then mood.

Some things to know:

- It reads the **words only**, not the sound. It works from the original lines (for example the Chinese), or from the translation when there's no original. So it's a good guess, not a sure answer. Check it and fix any line that's wrong.
- It needs an AI key: your free Gemini key, or a Claude key (see [Add your keys](configuration)). Without one you'll see: "Finding characters needs your free Gemini key (Settings → Translation) or a Claude key."
- It picks from the same kind of voice you already use. If your default voice is a designed voice (and the video is in Khmer), it picks designed voices. Otherwise it picks instant voices. It never picks a cloned voice.
- If it can't tell who says a line, it gives the line to whoever spoke just before.
- Long videos are read in parts of 250 lines. Names found in earlier parts are reused, so the same person keeps the same name.

When it's done, a message says how many characters it found. The button now says **Find again**. If you press it again, characters with the same name keep the voice you already chose for them.

### Add a character by hand

Press **Add a character**. A new character called "Character 1" (then "Character 2", and so on) appears, using your default voice.

- **Rename** it: click the name, type, and press Enter.
- If you rename a character to a name that already exists, the two are merged into one.
- A character with no lines shows a yellow note: "No lines yet". Give it lines from the subtitles (see below).

### Remove a character

Press the bin icon next to the character. Their lines go back to the default voice.

### Choose a voice for each character

Under each character there's a voice menu and a ▶ button. The menu opens with a search box: type "king", "girl" or "narrator" to find a voice. The current voice has a ✓, and each voice has a line about how it sounds. The voices are in groups, in this order:

| Group | What's in it |
|---|---|
| **Your voices** | Voices you cloned. Shown only when you have some. See [Voice cloning](voice-cloning). |
| Preset groups (Narration, Palace & royalty, Heroes & fighters…) | The 36 designed Khmer voices. They need the [voice engine](voice-engine). |
| **Instant · Khmer** (or your language) | Microsoft's free voices. They need no setup. |

Press ▶ to hear a sample. Press it again (■) to stop. To hear every voice side by side, open the [Voice library](voice-library).

Each character row also shows how many lines that character has.

### Change who says a line

Once you have characters, every line in the **Subtitles** list shows a small coloured name. Click it to open a menu:

- pick a character,
- pick **Default voice**, or
- pick **New character…** to make a new character and give it this line at once.

If some lines have no character, the panel says, for example, "12 lines have no character: the default voice speaks them."

## The default voice

This part of the panel is called **Khmer voice-over** (or your language's name) until you add characters. Then it's called **Default voice**.

Choose the **Voice type**:

| Type | What it is | Good for |
|---|---|---|
| **Instant** | Microsoft's free voices, ready in seconds | Drafts, checking timing, and every language other than Khmer |
| **Designed** | The 36 Khmer preset voices from the voice engine | Natural, expressive Khmer |
| **Cloned** | Your own voices, made from a short recording | Your own voice, or one you have permission to use |

Designed and cloned voices are slower than instant ones, so make the final voice-over once your subtitles are final.

If your video's language isn't Khmer, the panel warns that designed and cloned voices are made for Khmer and may read your language with a Khmer accent. Use **Instant** for those languages.

### Speed

With **Instant** voices you get a **Speed** slider, from -30% to +50% in steps of 5. The default is +10%. It changes how fast the instant voices read. Designed and cloned voices don't use this slider.

## Make the voice-over

Press **Make voice-over**. Kroma speaks every translated line. When you have characters, it works through one voice at a time, so the progress shows, for example, "Voice-over 2/3: Mother".

Under the button, **Lines voiced** shows how many lines have a voice, for example "48 / 52".

When it's done, the **Use the voice-over** switch turns on and you hear the voice-over in the preview.

### Only changed lines are redone

Kroma remembers each recording. So:

- editing a subtitle re-voices only that line,
- changing a character's voice re-voices only that character's lines,
- changing the speed re-voices only lines read by instant voices.

When some lines are new, the button says **Voice the 4 new lines** (or however many). Press it to fill only those.

If a few lines fail (for example the internet drops), you'll see "Voiced 40 lines; 3 not done. Press again to finish them." Press the button again.

### How the timing fits

A translated line is often longer than the original. Kroma never cuts a line short. Instead:

1. Each line starts when its subtitle starts.
2. If a line is too long for its gap, it's sped up, up to 1.6× its normal speed.
3. If it's still too long, it runs into the next line's time, and the next line starts a little later. The delay is caught up in the next pause.
4. If a line would end more than 1.2 seconds after the next subtitle starts, it's sped up harder, up to 2×, to stay with the picture.

The preview and the exported video use exactly the same timing.

## Mix

The **Mix** section decides what you hear under the voice-over.

| Setting | What it does |
|---|---|
| **Use the voice-over** | Turns the voice-over on or off, in the preview and in the export. |
| **Remove the original voices** | Takes out the original speech and keeps the music and sound effects. On by default. |
| **Quality** | **Fast** (the default) removes speech well. **Best** is the cleanest, but slower than the video's length without a strong graphics card. |
| **Music & effects** | The volume of what's left after the voices are removed. Default 100%. |
| **Original sound** | Shown when voice removal is off: the volume of the original sound under the voice-over. Default 15%. |

Press **Hear the first line** to play the first voiced line.

### Removing the original voices

When you make a voice-over, Kroma removes the original voices **automatically** right after, so you don't hear the original speech under the new voice. Music and sound effects stay.

- It runs on your computer, not online. It takes about 40 seconds per 5 minutes of video on a recent Mac or PC (with **Fast**).
- The first time, it downloads the tool and the voice-removal model. This takes longer, once.
- It needs a free tool called **uv**. See [Installation](installation). Without it you'll see "Removing voices needs uv" and how to install it (on a Mac, `brew install uv`).
- It runs once per video. After that the result is saved, so it's instant.
- Changing **Quality** runs it again with the new quality.
- If you made a voice-over before this was automatic, it runs when you [export](export).

If it fails, you'll see "The original voices are still in". The original sound then plays quietly under the voice-over. Try again by turning **Remove the original voices** off and on in **Mix**.

To keep the original sound (for example, a narrator over a music video), turn **Remove the original voices** off and set the **Original sound** volume.

## Next

- Hear all the voices: [Voice library](voice-library)
- Set up designed and cloned voices: [The voice engine](voice-engine)
- Make a voice from your own recording: [Voice cloning](voice-cloning)
