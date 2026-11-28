---
title: Batch
group: Making videos
section: 2
order: 7
---
**Batch** does the whole job for many videos at once. You choose the steps one time (subtitles, translation, voice-over, style, export, covers, post text), press **Process**, and every video goes through them, one after another, while you do something else. It stops before posting, so you can check each video first.

Open it with **Batch** in the left menu. The page has two tabs: **Process**, where videos are worked on, and **Ready to post**, where finished videos wait.

## A whole series, start to finish

Batch is made for series. A typical run:

1. In the [Download Center](downloading#the-download-center), paste the series' link, tick the episodes and press **Download**. Each episode becomes its own project, in a folder named after the series.
2. Translate the first episode by hand in the editor and fix the names. Kroma fills the [series glossary](translation#series-glossary), so every later episode spells the names the same way.
3. In **Batch**, add the other episodes, choose the steps, and press **Process**.
4. Check each video in **Ready to post**, choose where it goes, and post.

## Adding videos

Batch works on Kroma projects (`.kroma` files). Under **Videos to process**:

- **Add from downloads** lists the finished videos from the Download Center that have a project. Tick the ones you want (**All** / **None** help), then press **Add … to the list**. Videos already in the list say **In the list**.
- **Add projects…** picks any project files. The dialog opens in the `projects` folder, where the Download Center makes them.

You can also send videos from the Download Center: tick finished downloads in its queue and press **Process … selected**.

A project is never added twice. Videos run one at a time, in the order they were added.

## Choosing the steps

**Steps** are the same for every video. Turn on the ones you want:

| Step | What it does |
|---|---|
| **Subtitles** | Gets the original lines: the site's subtitles when the video has them, otherwise speech to text. Set **Spoken language** for speech to text. |
| **Translate** | Translates every line into **Translate to**, with the translator chosen in **Settings → Translation**. |
| **Find characters** | Works out who says each line, so each character can have their own voice. |
| **Voice-over** | Reads the translated lines aloud. **Voices**: **One voice** for every line, or **Each character** (needs **Find characters**). Pick the **Voice** (with **Each character**, it's the **Voice for lines with no character**). |
| **Remove original voices** | Shown with a voice-over. Keeps the music and effects under the voice-over (the fast way). |
| **Hide original subtitles** | Finds the Chinese subtitles burned into the video and blurs them, so only yours show. See [Hide original subtitles](style-and-objects#hide-original-subtitles). |
| **Subtitle style** | Applies one style to every video: any of the 33 presets, or one of **My styles**. Off keeps each project's own style. |
| **Export** | Tick **16:9** (YouTube) and/or **9:16** (TikTok, Reels), and choose the **Export size**: **Small**, **Standard** or **High**. |
| **Make covers** | A thumbnail for each episode with its number (ភាគ ៥) and the series title, next to the exports. The design is each project's **Post → Cover**. See [Episode covers](posting#episode-covers). |
| **Write post text** | Titles, text and hashtags for each platform. Needs a Gemini or Claude key. |

Under the list, Kroma sums up what will happen, for example *"5 steps: getting subtitles → translating → exporting 16:9 → exporting 9:16 → writing the posts. Then it waits in Ready to post."*

The steps always run in this order. Removing the original voices comes before the voice-over, so the voice-over doesn't do it again. A video with no burned-in subtitles isn't a failure: **Hide original subtitles** notes *No burned-in subtitles found* and the batch carries on.

Your choices are kept for next time.

## Processing

Press **Process … videos**. While it runs:

- A bar across the top of the window says **Batch running**, the video and the step it's on, with **Open Batch** and **Stop**. The status bar at the bottom shows it too.
- Batch uses the editor to do the work, so the editor can't be used until it's done. Your own project is put aside, with its undo history, and comes back afterwards.
- After every step, the project is saved. If something fails, nothing done so far is lost.
- You get a notification for each finished video, and a summary at the end, like **Batch finished: 5 processed · 1 failed**.

**Stop** cancels the step that's running and stops the batch. Press **Resume** later to carry on where it stopped. If you quit Kroma during a batch, the video that was running shows as stopped when you open Kroma again, ready to resume.

## The list

Videos are grouped by run (each press of **Process**), newest first, with **Not started** at the top. Each row shows the video, a chip for each step (done, running, failed, or skipped), and its status: **Waiting**, the step it's on, **Failed at …**, **Stopped at …**, **Ready to post** or **Posted**.

Above the list:

- Filters: **All**, **Running**, **Waiting**, **Failed**, **Ready to post** and **Posted**, and **Search videos**.
- **Retry failed** runs every failed video again from the step that failed.
- **Clear finished** removes finished and failed videos from the list. The projects and exports stay.

On each row:

- **Retry from …** (failed videos) carries on from the failed step. The steps before it stay done.
- **Open project at …** opens the project in the editor, on the step's panel, to fix something by hand.
- **⋯** has **Show … export in Finder**, **Step details** and **Remove from the list**.

The list is kept, so after a restart you see where everything stopped. It keeps the last 20 runs.

### Step details

Click a row (or **See why** next to a failure) to open its details on the right: every step from top to bottom with when it ran, how long it took and what it said (how many lines were translated, the exported file, or the error).

- A failed step has **Retry from here** and **Fix by hand**.
- A finished step has **Run again from …**, which runs that step and every step after it again. Useful after you change a setting, such as the style.
- **Exports** lists the exported files, each with **Show in Finder**.

## Ready to post

Finished videos wait in **Ready to post**. Each card shows the video, its exports, and a row for **YouTube**, **Facebook** and **TikTok**:

1. **Tick where it goes.** Connected accounts are ticked to start with.
2. **Choose the format** for each platform: **16:9** or **9:16**. YouTube starts on 16:9, Facebook and TikTok on 9:16. If a format isn't exported yet, Kroma exports it when you post.
3. Open **Post text** to read and edit the title, text and hashtags for each platform.
4. Press **Post** on the card, or tick several cards and press **Post selected** at the top.

**YouTube visibility** (**Public**, **Unlisted** or **Private**) and **TikTok** (**Post now** or **To drafts**) at the top apply to everything you post from here. Each platform gets the file in its own format. Facebook goes up as a Reel when its video is 9:16 and 90 seconds or shorter.

After posting, the card shows each platform's result, and the video moves to **Posted**. **Post again** posts it once more; **Clear posted** removes posted videos from the list.

Posting needs Upload-Post set up once: see [Posting](posting#set-up-posting-once). Only post videos you have the right to use.

## Where the files go

| What | Where |
|---|---|
| Exports | The export folder (**Settings → Folders**), in a folder named after the series: `<series>/01 - EP1 (16x9).mp4` and `01 - EP1 (9x16).mp4` |
| Covers | Next to the exports: `01 - EP1 (16x9) cover.jpg` |
| The batch list | `batch.json` in the Kroma Studio library folder |

Each project is saved after every step, so you can open any of them in the editor at any time.
