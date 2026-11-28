---
title: Projects and files
group: Reference
section: 5
order: 2
---
This page explains how Kroma keeps your work: the project file, autosave, extra windows, and where every file lives on your computer.

## The project file

A Kroma project is a single file that ends in **.kroma**. It's a small text file (in a format called JSON) that holds your edit:

- the project name, the frame shape (16:9, 9:16 or 1:1) and how the video fits the frame
- the list of videos you added, and where each one is on your computer
- the clips on the timeline (which part of which video)
- every subtitle line: its time, the original text, the translation and who says it
- the subtitle style, including its font and animation
- your notes for the translator
- the voice-over settings: voices, characters, speed, volumes, and where each spoken line is saved
- objects on the video (blur boxes, images, text)
- the translation language
- the social posts written for the video, and where you posted it
- the cover settings, and the exports made in each format (so Kroma knows when one is still current)

**What it doesn't hold:** the videos, voice recordings and images themselves. The project only remembers *where* they are. Keep those files where they are, or the project can't find them. See [Moving a project to another computer](#moving-a-project-to-another-computer).

## Saving

| Button or key | What it does |
|---|---|
| **Save project** (⌘S / Ctrl+S) | Saves to the project's file. The first time, it asks for a name and place. |
| ⇧⌘S / Ctrl+Shift+S | Saves as a new file. Always asks for a name and place. |
| **Open project** (⌘O / Ctrl+O) | Opens a `.kroma` file. |
| **New project** (⌘N / Ctrl+N) | Starts an empty project called **Untitled**. |

The **Save project**, **Open project** and **New project** buttons are at the top right of the window.

The save and open dialogs start in your [Kroma Studio library folder](#where-files-live), and the file name starts as the project name. When you add your first video, Kroma names the project after it. Click the name at the top to change it.

A small dot next to the project name means **Unsaved changes**: the project has changed since you last saved it to a file.

If you start a new project while the current one has never been saved to a file, Kroma asks first: *"Start a new project? The current one isn't saved to a file (it stays in autosave until you start another)."*

## Autosave and recovery

You don't need to save to keep your work safe. About a second and a half after every change, Kroma writes the open project to an autosave file.

When you open Kroma again, it reopens your last project and shows **Reopened your last project.** This also covers a crash, a power cut, or closing Kroma without saving. If the project was saved to a file, it reopens linked to that file. If not, it reopens with the unsaved dot, so you remember to save it.

Autosave keeps one project per window. Starting a new project replaces it. So for work you want to keep, use **Save project** too.

Undo history (100 steps) is not saved: after Kroma restarts, you can't undo changes from before.

## Several windows

You can work on two projects at once, each in its own window.

- **File → New Window** (⇧⌘N / Ctrl+Shift+N)
- Mac: right-click Kroma in the Dock → **New Window**
- Windows: right-click Kroma on the taskbar → **New Window**

Each window has its own project and its own autosave slot:

| Window | Autosave |
|---|---|
| The first window | `autosave.json`. Reopened when Kroma starts. |
| Each extra window | `autosave-2.json`, `autosave-3.json` … Deleted when you close that window. |

Because an extra window's autosave goes away, Kroma asks before you close an extra window whose project isn't saved to a file: **Close this window?** Choose **Cancel**, save the project, then close it.

## Only one Kroma at a time

Kroma runs only once. If you open it again while it's running (from the Dock, Start menu or a desktop shortcut), it brings the open window to the front instead of starting a second copy. This stops two copies writing the same autosave file. The taskbar's **New Window** opens a new window in the running Kroma.

On a Mac, closing every window leaves Kroma running. Click its Dock icon to open a window again. On Windows and Linux, closing the last window quits Kroma.

## Where files live

Kroma uses two folders.

### The settings folder

Your settings, keys and autosave.

| System | Folder |
|---|---|
| macOS | `~/Library/Application Support/Kroma Studio` |
| Windows | `%APPDATA%\Kroma Studio` |
| Linux | `~/.config/Kroma Studio` |

`~` means your home folder. On Windows, paste `%APPDATA%\Kroma Studio` into File Explorer's address bar to open it.

| File | What it is |
|---|---|
| `settings.json` | Everything in [Settings](settings). API keys are encrypted (see below). |
| `autosave.json`, `autosave-2.json` … | The autosaved project of each window |
| `last-export-error.log` | Details of the last export that failed (see [Troubleshooting](troubleshooting#an-export-fails)) |
| `updates` | A downloaded update, on macOS and Linux `.deb` |
| `my-styles.json` | Your saved subtitle looks (**Style → Save as my style**) |
| `voice-engine` | Kroma's voice engine, once you install it (about 2 GB) |

The notification history and panel sizes are kept in Kroma's own storage in this folder too.

### The Kroma Studio library folder

Your videos and everything Kroma makes from them. It's inside your Movies folder on a Mac, and your Videos folder on Windows and Linux:

| System | Folder |
|---|---|
| macOS | `~/Movies/Kroma Studio` |
| Windows | `C:\Users\<you>\Videos\Kroma Studio` |
| Linux | `~/Videos/Kroma Studio` |

**Settings → Folders → Library folder → Open** takes you straight there.

| Inside | What it is |
|---|---|
| `Exports` | Finished videos and subtitle files (unless you chose another export folder) |
| `downloads` | Videos downloaded from links. Each download from **Media** gets its own folder; the Download Center uses a folder per series. The site's subtitles sit next to the video. Also the Download Center's queue (`center.json`) and its list of videos already downloaded (`archive.txt`). |
| `projects` | Projects made by the Download Center, one folder per series: `projects/<series>/07 - <title>.kroma`. Each series folder can hold its `kroma-glossary.json`. |
| `stories` | Your stories from **Story**, one folder each |
| `batch.json` | The Batch list and its steps |
| `voices` | Your cloned voices and the saved samples of voice templates |
| `voice-cache` | Every spoken voice-over line |
| `recordings` | Recordings you made with the microphone for cloning |
| `cache/visuals` | Timeline pictures and sound waves |
| `cache/separated` | The music-and-effects sound made by **Remove the original voices** |
| `cache/separator-models` | The voice-removal model, downloaded the first time you use it |
| `*.kroma` | Projects you saved here (the default place) |

Exports and covers from Batch go into the export folder in a folder per series: `<series>/01 - EP1 (16x9).mp4`, with `01 - EP1 (16x9) cover.jpg` next to it.

You can move exports and downloads somewhere else in [Settings → Folders](settings#folders). The library folder itself can't be moved.

## Your keys on disk

API keys are encrypted with your system's keychain before they're written to `settings.json`, and only work on the computer that saved them. On some Linux systems no keychain is available; there the keys are stored as plain text, so keep that file private.

## Moving a project to another computer

The `.kroma` file only points to your files by their full location, for example `/Users/dara/Movies/Kroma Studio/downloads/…`. Kroma has no button to find moved files again. To move a project:

1. Copy the `.kroma` file **and** the Kroma Studio library folder (with its `downloads`, `voice-cache`, `voices` and `cache` folders). Also copy any videos or images you added from other places.
2. Put them at **exactly the same place** on the new computer. This works best between two computers of the same kind (Mac to Mac, Windows to Windows) with the same user name.
3. Open the project with **Open project**.

If the new computer's folders are different, the simplest way is to start a new project there and bring your subtitles with you:

1. On the old computer, open the **Post** panel and, under **Subtitle files**, save the translated `.srt` (for Khmer, **Khmer .srt**).
2. On the new computer, add the video again, then use **Import an .srt file** above the subtitle list.

An `.srt` file holds one language, so this brings back the translation, not the original lines, speakers or voice-over.

Keys don't move: they're locked to the computer that saved them. Add them again in [Settings](settings) on the new computer.

## Clearing space

Kroma has no "clear cache" button, but you can delete these folders in the library folder yourself when Kroma is closed:

| Folder | Safe to delete? |
|---|---|
| `cache/visuals` | Yes, any time. Kroma makes the timeline pictures again when needed. |
| `cache/separator-models` | Yes. It's downloaded again the next time you remove voices. |
| `downloads` | Only for projects you've finished. Projects that use a deleted video can't play or export it. |
| `voice-cache` | Only for projects you've finished. Projects lose their spoken lines. |
| `cache/separated` | Only for projects you've finished. Projects that removed the original voices lose that sound. |
| `voices`, `recordings` | No. These are your cloned voices. Delete a voice from the **Voices** page instead. |
| `stories` | Delete stories from the **Story** page instead. |
| `projects`, `batch.json` | No. These are your series' projects and the Batch list. |

Finished videos in `Exports` are yours to keep or delete as you like.
