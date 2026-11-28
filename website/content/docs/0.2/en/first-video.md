---
title: Your first video
group: Making videos
section: 2
order: 1
---
This page walks you through one whole video, from a link to a finished file with Khmer subtitles. It takes a few minutes for a short clip. You'll need a translation key first (or choose Google Translate, which needs none): see [Add your keys](configuration).

## The window at a glance

| Part | Where | What it's for |
|---|---|---|
| Menu | Far left | **Media**, **Translate**, **Voice**, **Style**, **Objects**, **Post**; then the pages **Voices**, **Story**, **Downloads** and **Batch**; **Settings** at the bottom |
| Tools panel | Next to the menu | The tools of the menu item you picked |
| Preview | Middle | Plays the video with the subtitles, exactly as it will export |
| Subtitles list | Right | Every line, ready to read and fix |
| Timeline | Bottom | The video and subtitle tracks |
| Status bar | Very bottom | Your progress, and what to do next |

More detail on each part is in [The editor](the-editor).

## The status bar

The thin bar along the bottom of the window shows the whole job in seven steps:

**Video → Subtitles → Khmer → Characters → Voices → Style → Export**

- A step that's finished gets a green tick. The others show their number.
- **Characters**, **Voices** and **Style** say *optional*. A video with only subtitles is a finished video too.
- Click a step to open its panel. **Video** opens **Media**, **Subtitles** and **Khmer** open **Translate**, **Characters** and **Voices** open **Voice**, **Style** opens **Style**, and **Export** opens the export sizes.
- On the right, the **Next: …** button always points at the first step still to do, for example **Next: Add a video** or **Next: Translate to Khmer**. Press it to jump straight there.
- When nothing is left to do, it says **All done**.

If you translate into another language, the **Khmer** step shows that language's name instead (for example **Thai**).

## 1. Add a video

Press **Next: Add a video**, or click **Media** in the menu.

1. Copy the video's link from YouTube, Bilibili, Douyin, TikTok, Facebook or another site. A whole share message works too, for example `【Video title】 https://b23.tv/…`.
2. Paste it into the box that says **Paste a link or a share message**. If the message has a title in it, Kroma shows it under the box (**Title: …**).
3. Press **Get**.

A progress bar shows the download (`Downloading 45% · 3.2MiB/s · 00:12 left`). You can press the **×** to cancel. When it's done you'll see **Downloaded.**, or **Downloaded, with the site's subtitles (…)** when the site had its own subtitles.

Have the file already? Press **Import** in the **Media** section instead and pick it from your computer.

The first video you add goes straight onto the timeline and gives the project its name. If it's a tall (vertical) video, the project switches to the **9:16** format by itself. Read [Downloading videos](downloading) for sites, quality, logins and where files are saved.

## 2. Get the subtitles and translate them

Press **Next: Get the subtitles**. This opens **Translate**.

1. Check **Spoken language**. It starts on **Chinese (Mandarin)**. Pick **Detect automatically** if you're not sure.
2. Check **Translate to**. It starts on **Khmer**.
3. Optional but worth it: in **Notes for the translator**, write the names and who's who, like `李明 is the hero, write it លី មីង`.
4. Press **Make Khmer subtitles**.

Kroma does two things in a row:

- **Gets the original lines.** If the video came with the site's own Chinese subtitles, Kroma uses those and says *"This video has the site's own Chinese subtitles, so speech-to-text is skipped."* Otherwise it listens to the video with speech-to-text in the cloud. You'll see a message like **312 subtitle lines ready.**
- **Translates them**, then tells you **Translated 312 lines to Khmer.**

Long movies take a minute or two. Both steps show a progress bar with a **×** to cancel. The **Subtitles** and **Khmer** steps turn green when they're done.

More about this: [Subtitles](subtitles) and [Translation](translation).

## 3. Check the lines

Every line now shows in the **Subtitles** list on the right, with the original in grey and the translation below it.

- Click a line's time (like `00:12.40 → 00:15.00`) to jump the video there.
- Click into the translation and type to fix it. Your change shows in the preview straight away.
- Press **Space** to play and pause. The playing line is highlighted and the list follows it.
- A name spelled wrong everywhere? Use **Find and replace** (the button at the top of the list) to fix it in every line at once.

## 4. Characters and voices (optional)

To give the video a voice-over, open **Voice**. Kroma can find the characters and give each one a different voice. When you start a voice-over, the status bar's **Next** button shows **Finish the voice-over** until every line has its voice. See [Characters & voices](characters-and-voices).

Skip this step if you only want subtitles.

## 5. Style the subtitles (optional)

Open **Style** to choose a format (**16:9**, **9:16** or **1:1**), a look from the 33 presets (like **Classic**, **Yellow**, **Moul gold** or **Dark box**), an **Animation**, the size and the position. If the video already has Chinese subtitles burned into the picture, open **Objects** and press **Hide original subtitles**: Kroma finds them and blurs them. See [Style & objects](style-and-objects).

## 6. Export

Press **Next: Export the video**, the **Export** step, or the **Export 16:9** button at the top right (it shows your format). Choose a size:

- **Small**: for TikTok and Facebook.
- **Standard**: quick, good for YouTube.
- **High**: best quality, slower.

Each one shows how big the file will be. The progress shows at the top right, with a **Cancel export** button. When it's finished, Kroma says **Export finished** and opens the folder with your video selected. See [Export](export).

## Your work is saved for you

Kroma saves the open project a moment after every change, and reopens it the next time you start the app (**Reopened your last project.**). To keep a project as a file you can open later, press **Save project** (`⌘S`). See [Projects & files](projects-and-files).

## Next: a whole series

Done one episode? For the rest of a series, paste the series' link in **Downloads** (each episode becomes its own project), then let **Batch** take them through the same steps while you do something else. Start with [Downloading videos](downloading#the-download-center) and [Batch](batch).
