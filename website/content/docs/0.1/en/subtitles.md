---
title: Subtitles
group: Making videos
section: 2
order: 3
---
Before Kroma can translate, it needs the original lines: what's said, and when. This page covers getting those lines, fixing them in the **Subtitles** list, and timing them on the timeline.

## Where the lines come from

Kroma has two ways to get the original lines.

| Way | When it's used | Good to know |
|---|---|---|
| **The site's subtitles** | The video was downloaded with the site's own Chinese subtitles | Instant, and usually exact. No key needed. |
| **Speech to text (cloud)** | Every other time | Listens to the video. Needs a key, see [Add your keys](configuration). |

When you press **Make Khmer subtitles** in **Translate**, Kroma picks for you: the site's Chinese subtitles if the video has them, speech-to-text if not. Then it translates.

To run just one part, use the **Step by step** section of **Translate**:

- **Use the site's subtitles**: shows only when the video has the site's Chinese subtitles.
- **Speech to text (cloud)**: listens to the video, even when site subtitles exist.

Either one **replaces** the lines of that video. When it's done you'll see a message like **312 subtitle lines ready.** If nothing was heard, it says **No speech was found.**

## Speech to text

### Spoken language

In **Translate**, set **Spoken language** before you start: **Chinese (Mandarin)** (the default), **Cantonese**, **English**, **Korean**, **Japanese**, **Thai**, **Vietnamese**, or **Detect automatically**. Choosing the right one gives better results than letting it guess.

### Services

Choose the service in **Settings → Speech to Text**:

| Service | Cost | Speed |
|---|---|---|
| **Gemini** (default) | Uses your Gemini key from **Settings → Translation**, nothing else to set up | Very accurate, with punctuation. About a minute for every 2 minutes of speech. |
| **Groq** | Free key | The fastest: Whisper large-v3, a whole movie in about a minute. |
| **OpenAI** | Paid | Whisper. |

There's also a custom option under **Advanced** for any OpenAI-compatible service (an **Endpoint** and a **Model**).

### How it works

Kroma cuts the sound into pieces (2 minutes each for Gemini, 10 minutes for Whisper) and sends several at once. You'll see `Transcribing with Gemini · 3/12 parts`. How many go at once is **Parallel requests** in **Settings → Translation** (2, 4, 6 or 8; 4 by default). Lower it if a service says you're sending too much.

Kroma also tidies the result:

- Long lines are split at their punctuation, so each line is one readable sentence (no more than about 7 seconds).
- Lines that speech-to-text often invents over music or silence in Chinese videos (like "thanks for watching") are dropped.
- A line repeated by mistake is removed.

If Gemini's main model is busy or its free daily limit is used up, Kroma uses the lighter **Flash-Lite** model for those parts. You'll see **lines ready, lower accuracy**. For full accuracy on long videos, add a free Groq key.

## The Subtitles list

The **Subtitles** panel on the right lists every line. Its header shows the count, like **312 lines · 298 in Khmer**.

Each line shows:

- **The time**, like `00:12.40 → 00:15.00`. Click it to jump the video to that line.
- **The original line**, in grey. You can select and copy it.
- **The translation**, below it. Click and type to change it. An empty one says **Not translated yet**.
- **Who says it**, a coloured dot with a name, once the video has characters (see below).
- **Delete line**: the bin icon that appears when you point at the line.

While the video plays, the current line is highlighted and the list scrolls to keep it in view. Clicking a line on the timeline scrolls to it here too.

### Buttons at the top

| Button | What it does |
|---|---|
| **Import an .srt file** | Loads lines from an `.srt` or `.vtt` file. This **replaces all** the lines. If the file is in Khmer, the lines go in as translations; otherwise as original lines. |
| **Find and replace** | Changes a word in every translated line at once. See [Translation](translation#find-and-replace). |
| **Add a line at the playhead** | Adds an empty 2-second line where the playhead is. Type the text into it. |

### Find in subtitles

The **Find in subtitles** box above the list hides every line that doesn't contain your words. It searches both the original and the translation. Clear the box to see everything again.

### Speaker colours

After you find the characters in **Voice** (see [Characters & voices](characters-and-voices)), each line shows who says it, with that character's colour. Click the name to choose another character, **Default voice**, or **New character…**.

### Undo

Made a mistake? Press **Undo** at the top (`⌘Z`), and **Redo** (`⇧⌘Z`) to bring it back.

## The timeline

The timeline at the bottom has two tracks:

- **Subtitles**: one block per line. A coloured block is translated; a grey block isn't yet.
- **Video**: your clips, with small pictures and the sound's waveform.

### Moving around

- Click the time ruler at the top to move the playhead there, or drag the playhead's handle.
- Press **Space** to play or pause.
- Press `←` or `→` to step one frame, or hold **Shift** for 5 seconds.

### Zoom

Use **Zoom out**, the zoom slider and **Zoom in** at the top right of the timeline. **Fit the whole video** shows everything at once. You can also pinch on a trackpad, or hold `⌘` and scroll, to zoom around the pointer.

### Timing a line

Click a subtitle block to select it. The bar above says *Subtitle selected · drag to move, edges to retime*.

- Drag the middle of a block to move the line earlier or later.
- Drag its left or right edge to change when it starts or ends. A line is never shorter than 0.2 seconds.

### Cutting the video

Click a clip to select it (*Video clip selected · drag to reorder, edges to trim*).

- **Split at the playhead** (the scissors, or press `S`) cuts the clip in two where the playhead is.
- **Delete the selection** (the bin, or `Delete`) removes the selected clip, subtitle line or object.
- Drag a clip to change its place. A line shows where it will land.
- Drag a clip's edges to trim its start or end.

The subtitles follow the video. When you cut out a part, the lines in that part go and the lines after it move up to stay in sync.

Drag the top edge of the timeline to make it taller or shorter.

## More than one clip

Speech-to-text and the site's subtitles work on the video of the **first clip** on the timeline. To get lines for another video:

1. Drag its clip to the start of the timeline.
2. In **Translate → Step by step**, press **Speech to text (cloud)**. Only that video's lines are replaced.
3. Press **Translate missing**, so the lines you already fixed keep your changes.

**Make Khmer subtitles** and **Translate all** translate every line again, which replaces any hand fixes.

## Saving subtitle files

To save the lines as `.srt` files (for YouTube's subtitle upload, or to keep a copy), open **Post** and use **Subtitle files**: **Khmer .srt** or **Original .srt**. They go into your export folder. See [Posting](posting).
