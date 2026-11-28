---
title: The editor
group: Getting started
section: 1
order: 4
---
This page is a tour of Kroma's main window: what each part is called, what it does, and where to find things. Once you know the parts, the rest of the docs will make more sense.

## The window at a glance

From top to bottom and left to right:

| Part | Where | What it's for |
|---|---|---|
| **Title bar** | Top | Project name, undo and redo, new, open and save, the notification bell, **Export** |
| **Left rail** | Far left | Switches the tools panel: Media, Translate, Voice, Style, Objects, Post; then the pages Voices, Story, Downloads and Batch; Settings at the bottom |
| **Tools panel** | Next to the rail | The tools for the item you picked in the rail |
| **Preview** | Centre | Plays the video with your subtitles, voice-over and objects |
| **Subtitles list** | Right | Every subtitle line, ready to read and edit |
| **Timeline** | Below | Your video clips and subtitle blocks over time |
| **Status bar** | Very bottom | The steps of the job, what's done, and **Next**; Batch, the voice engine and updates on the right |

When you first open Kroma with no video, the preview says **សូមស្វាគមន៍** (welcome) and tells you to paste a video link or import a file on the left, then press **Make Khmer subtitles**.

## The title bar

From left to right:

- **Kroma**, then the **project name**. Click the name to rename the project. A small grey dot after it means there are changes not saved to a file yet.
- **Undo** and **Redo** (`⌘Z` and `⇧⌘Z` on a Mac, `Ctrl+Z` and `Ctrl+Shift+Z` on Windows and Linux). They're greyed out when there's nothing to undo or redo.
- On the right: **New project** (`⌘N`), **Open project** (`⌘O`) and **Save project** (`⌘S`). Press `⇧⌘S` to save a copy under a new name.
- The **Notifications** bell, with a number for new ones. It keeps everything that finished or failed. See [Notifications](notifications).
- The **Export** button. Its label shows the current format, for example **Export 16:9**. Click it to choose a size: **Small**, **Standard** or **High**, each with an estimated file size. It's greyed out until there's a video on the timeline.

While a video exports, a progress bar appears next to the buttons and **Export** becomes **Cancel export**. See [Export](export).

On a Mac, the window buttons (close, minimise, full screen) are at the top left. On Windows and Linux they're at the top right, and they follow the light or dark theme.

## The left rail

The narrow column of icons on the far left. Click one to open its tools in the panel next to it:

| Item | What's in it | Docs |
|---|---|---|
| **Media** | **Download from a link** (paste a link, click **Get**), and your **Media** list with **Import** for files on your computer | [Downloading](downloading) |
| **Translate** | **Auto Khmer subtitles**: choose the **Spoken language** and **Translate to**, then **Make Khmer subtitles**. Also **Notes for the translator**, the **Series glossary** and **Step by step** | [Subtitles](subtitles), [Translation](translation) |
| **Voice** | Characters, the voice-over voice and speed, and the **Mix** of voice-over and original sound | [Characters and voices](characters-and-voices) |
| **Style** | **Format** (16:9, 9:16, 1:1), what to do **When it doesn't fit**, and the **Subtitle style** | [Style and objects](style-and-objects) |
| **Objects** | **Hide original subtitles**, **Blur area**, **Image** and **Text** on top of the video | [Style and objects](style-and-objects) |
| **Post** | **1 · Posts** (AI-written titles and text), **2 · Post to**, **Cover** and **Subtitle files** | [Posting](posting) |
| **Voices** | Your whole voice library. It opens as its own page in place of the editor | [Voice library](voice-library) |
| **Story** | Story studio: a script read with a different voice for every character | [Story studio](story) |
| **Downloads** | The Download Center: whole series, playlists and channels, one project per video | [Downloading](downloading#the-download-center) |
| **Batch** | Every step on many videos, one after another, then **Ready to post**. A dot shows while it runs (blue) or when a video failed (red) | [Batch](batch) |
| **Settings** | The gear at the bottom (`⌘ ,`). Opens Settings as a full page | [Settings](settings) |

The Translate panel's title and button follow the language you translate to. If you pick Thai, they say **Auto Thai subtitles** and **Make Thai subtitles**.

### Full pages

**Voices**, **Story**, **Downloads** and **Batch** each replace the tools panel, preview, subtitles and timeline with their own page. Click any editor item in the rail (for example **Media**) to go back. Downloads and a batch keep going while you're on another page.

While **Batch** is processing, it uses the editor itself: a bar across the top says **Batch running**, and **New**, **Open** and **Save** wait until it's done. Your own project comes back afterwards. See [Batch](batch#processing).

**Settings** fills the whole window. On the left there's **Back to app**, a **Search settings** box (`⌘F`), and the list of pages. Press `Esc` or click the **×** at the top right to go back to the editor.

## The tools panel

The panel next to the rail shows the tools for the rail item you picked. It scrolls if the tools don't fit. Long jobs, like downloading or translating, show their progress right in the panel, so you can see what's happening without leaving your place.

## The preview

The preview plays your video exactly as it will export: the format you chose, your subtitles in their style, the voice-over, and any objects.

- Click the video, or press `Space`, to play and pause.
- Below the video: the current time, **Back 5 seconds** (`⇧←`), **Play** / **Pause**, **Forward 5 seconds** (`⇧→`), and the total length.
- Objects (text, images, blur boxes) can be dragged on the preview to move them, and resized from their corner.

## The Subtitles list

The panel on the right lists every subtitle line. The header shows how many lines there are and how many are translated, for example "120 lines · 118 in Khmer".

Each line shows:

- Its **time** (start → end). Click the time to jump the video there.
- The **original line** in grey, when there is one.
- The **translated line** underneath. Click it and type to fix it. Lines not translated yet say "Not translated yet".
- Once you've set up characters, a chip showing **who says the line**. Click it to pick another character, **Default voice**, or **New character…**.
- A bin icon on hover to **Delete line**.

The buttons at the top right: **Import an .srt file**, **Find and replace**, and **Add a line at the playhead** (a new 2-second line at the current time). Under them, **Find in subtitles** filters the list to lines that contain your words, in either language.

While the video plays, the list scrolls to keep the current line in view. See [Subtitles](subtitles).

## The timeline

The timeline along the bottom has two tracks: **Subtitles** on top and **Video** below, with a time ruler above them.

- Click or drag on the ruler or a track to move the playhead (the line that marks the current time).
- **Video clips**: drag a clip to reorder it, or drag its edges to trim it.
- **Subtitle blocks**: drag to move a line, or drag its edges to change when it starts and ends.
- The toolbar: **Split at the playhead** (`S`), **Delete the selection** (`Delete` or `Backspace`), then on the right **Zoom out**, a zoom slider, **Zoom in**, and **Fit the whole video**.
- Hold `⌘` (or `Ctrl`) and scroll, or pinch on a trackpad, to zoom around the pointer.
- Press `←` or `→` to step one frame, `Esc` to clear the selection.

When something is selected, the toolbar tells you what you can do with it, for example "Subtitle selected · drag to move, edges to retime".

## The status bar

The thin bar along the very bottom of every page shows the whole job, start to finish:

**Video → Subtitles → Khmer → Characters → Voices → Style → Export**

- Each step has a number, or a green tick when it's done.
- Click a step to open its panel (from another page, it takes you back to the editor). **Export** opens the export sizes.
- **Characters**, **Style**, and **Voices** (while the voice-over is off) are marked **optional**. Subtitles alone make a finished video.
- The **Khmer** step shows the language you translate to, so it reads **Thai** if you translate to Thai.
- On the right, **Next** always points at the first step still to do, for example **Next: Get the subtitles** or **Next: Export the video**. When everything is done it says **All done**.

On the right end:

- **Batch · 3/5**, while a batch runs. Click it to open Batch.
- The **voice engine**: **Voice engine on**, **Voice engine off · Start**, **Voice engine not installed**, **installing…** or **starting…**. Click it to start the engine, or to open its settings. See [The voice engine](voice-engine).
- **Check for updates**, or an update's progress, or **Restart to update** after you hide an update card. See [Updates](updates).

## Resizing panels

Three parts can be resized by dragging their edge: the **tools panel** (its right edge), the **Subtitles list** (its left edge), and the **timeline** (its top edge).

| Panel | Smallest | Default | Largest |
|---|---|---|---|
| Tools panel | 300 px | About a quarter of the window (360–440 px) | 600 px |
| Subtitles list | 300 px | About a quarter of the window (360–440 px) | 680 px |
| Timeline | 140 px | 210 px | 520 px |

Double-click an edge to put that panel back to its default size. You can also click an edge and use the arrow keys. Kroma remembers your sizes on this computer.

## Light, dark and interface size

- **Theme**: in **Settings → Appearance**, choose **Dark** (the default), **Light**, or **System** (follows your computer's setting).
- **Interface size**: makes everything bigger or smaller, like zooming a web page. Choose from 70% to 140% in **Settings → Appearance** (90% by default), or press `⌘+` / `⌘−`, and `⌘0` for 100%. On Windows and Linux use `Ctrl` instead of `⌘`. The same items are in the **View** menu.

## More than one window

You can work on two projects side by side. Open a **New Window** with:

- **File → New Window**, or `⇧⌘N` (`Ctrl+Shift+N` on Windows and Linux).
- Right-click Kroma in the Dock (Mac) or the taskbar (Windows) and choose **New Window**.

Each window has its own project and its own autosave. The first window's project reopens next time you start Kroma. If you close an extra window whose project isn't saved to a file, Kroma asks **Close this window?** first: choose **Cancel** and press `⌘S` to keep your work.

Opening Kroma again while it's running doesn't start a second copy. It brings the open window to the front.

## Autosave

Kroma saves your open project automatically a moment after every change, and reopens it when you start Kroma again ("Reopened your last project."). To keep a project for later, or move it to another computer, save it as a `.kroma` file with **Save project**. See [Projects and files](projects-and-files).

All shortcuts are listed in [Keyboard shortcuts](keyboard-shortcuts).
