---
title: Story studio
group: Voices
section: 3
order: 5
---
**Story** turns a written script into an audio story with a different voice for every character: a grandfather telling a folk tale, a narrator and two children, a short radio drama. Open it with **Story** in the left menu.

Story uses Kroma's [voice engine](voice-engine), so start the engine first. The engine's status shows at the top of the page and in the status bar, with **Start** when it's off.

## The page

- **On the left**, your stories, newest first, and **New story**.
- **At the top**, **1 · Write** and **2 · Listen**, the engine's status, and **Generate story**.
- **Write** has the story's title, the script, and the **Cast** beside it.
- **Listen** plays the finished story, with every line listed under the player.

## Writing a script

Write one line per speaker, with the speaker's name, a colon, then what they say:

```
Narrator: កាលពីព្រេងនាយ មានក្មេងប្រុសម្នាក់ឈ្មោះសុខា។
[pause 1s]
Sokha (excited): លោកតា! មើលនេះ!
លោកតា៖ យឺតៗ ចៅ។
```

| You write | What it does |
|---|---|
| `Sokha: …` or `សុខា៖ …` | A line for Sokha. The colon can be `:`, `：` or the Khmer `៖`. |
| A line with no name | It's the **Narrator**'s. |
| `Sokha (whisper): …` | One line in its own style (whisper, excited, sad…). |
| `[pause 2s]` on its own line | Silence between lines. `[pause 500ms]` works too; a bare `[pause]` is 1 second. Pauses are kept between 0.1 and 10 seconds. |
| `[pause 1s]` inside a line | A pause between that line's words. |

A name can be up to 30 characters, without `:` or brackets. The **Insert** bar above the script adds a **Pause**, or a speaker's name at the start of a new line.

**How it will be read**, under the cast, shows the lines the way the engine will read them, as you type.

## The cast

Every character in the script shows in **Cast** as soon as you start their line. For each one:

- **Voice**: the engine's default voice, one of **Your voices** (cloned), or a preset voice, grouped like the [voice library](voice-library). Kroma picks a fitting one from the name: a "Narrator" gets *Narrator (deep male)*, "grandpa" or "លោកតា" gets *Storyteller (warm grandfather)*, "girl" or "ស្រី" gets *Young girl*, and so on. Change it any time. Instant voices aren't offered here: stories are read by the engine.
- **Style** (optional): how this character speaks in every line, like "calm". A style written in a line, like `Sokha (whisper):`, is used for that one line.

To add a character, type a name under the cast and press **Add**. A new line starts for them in the script, with the cursor ready.

Up to **6** characters get their own voice. More than that read with the Narrator's voice, and Kroma warns you.

## Generating the story

Give the story a title (or leave **Untitled story**) and press **Generate story**. A progress bar shows while the engine works; it can take a while for a long story, especially on a computer without a fast graphics card. When it's done you get a notification, **Story ready: …**, and the story opens in **Listen**.

## Listening and fixing a line

**Listen** shows the title, how many lines it has, its length and when it was made, then the player. Every line is listed under it, with who says it.

Not happy with one line? Press **↻** next to it. Kroma speaks just that line again and keeps the rest the same. The result is saved as a new story, so the earlier version is still in your list.

The buttons above the player:

| Button | What it does |
|---|---|
| **Edit the script** | Back to **Write** with this story's script and cast. |
| **Save audio as…** | Saves the audio wherever you like. Its `.srt` subtitles are saved next to it, with the same name. |
| **Show in folder** | Opens the story's folder. |
| **Delete** | Deletes the story (after asking). |

## Where stories are kept

Each story has its own folder in `stories` in the Kroma Studio library folder, with `story.mp3` (or `story.wav`), `story.srt` and `story.json`. See [Projects and files](projects-and-files#where-files-live).

Only clone a voice with the speaker's permission. See [Voice cloning](voice-cloning).
