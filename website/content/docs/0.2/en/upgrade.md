---
title: Upgrade guide
group: This version
section: 6
order: 2
---
How to move from 0.1 to 0.2, what changes, what stays the same, and how to go back to an older version.

## From 0.1 to 0.2: nothing to do

If you have 0.1.1 or later, Kroma updates itself to 0.2, like any other update:

1. Kroma checks for a new version when it starts and every 4 hours.
2. It downloads 0.2 in the background. A card at the bottom right shows the progress.
3. When the card says **Restart to update**, click it when you're ready. Kroma restarts on 0.2 and your project opens again.

There's nothing to convert and nothing to set up again. Your projects, settings, keys, voices and stories carry over as they are. If **Update automatically** is off, press **Download** on the card, or **Check now** in **Settings → About**. Details for each system are on [Updates](updates).

If you still have **0.1.0**, it can't update itself: download 0.2 once from the [download page](/#download) and install it over the old one, as in [Installation](installation). On a Mac, drag it into **Applications** and choose to replace the old app.

## Two things worth checking

These aren't new in 0.2, but people coming from early 0.1 versions sometimes miss them:

- **Your API keys.** Before 0.1.11, an update could make Kroma lose a key it couldn't read from the Mac's keychain. If a key field in **Settings → Translation**, **Speech to Text** or **Posting** is empty, or says a key is saved but can't be read, paste the key again. When your Mac asks, choose **Always Allow**. From 0.1.11 on, keys are kept through updates.
- **Notifications.** 0.2 tells you when long work finishes, with a system notification and a sound. If you don't see them, open **Settings → Notifications → Not seeing them?** and allow Kroma Studio in your system's settings. See [Notifications](notifications#not-seeing-them).

## What's different in 0.2

Nothing you used is gone. Some things moved or got new names:

| In 0.1 | In 0.2 |
|---|---|
| **Objects → Cover original subtitles**, a box over the lower part of the picture | **Objects → Hide original subtitles** finds the burned-in subtitles and blurs exactly them. See [Hide original subtitles](style-and-objects#hide-original-subtitles). |
| Four presets: **Classic**, **Yellow**, **Box**, **TikTok** | 33 presets in four groups. **Box** is now called **Dark box**. Your projects keep their look. |
| **Translate missing** in **Translate → Step by step** | **Only missing** |
| **Image / logo** in **Objects** | **Image** |
| The step bar | The **status bar**: the same steps and **Next**, plus the voice engine, Batch and updates, on every page |
| One video at a time from **Media** | **Media** still downloads one video; **Downloads** (the Download Center) does whole series. See [Downloading videos](downloading). |
| Posting one file to every platform | Each platform gets its own format: YouTube 16:9, Facebook and TikTok 9:16 to start with. See [Posting](posting#formats-per-platform). |
| Khmer Voice Studio, run on its own | Kroma's own voice engine: **Settings → Voice Engine → Install voice engine**. See [The voice engine](voice-engine). |

New in the left menu: **Story**, **Downloads** and **Batch**, under **Voices**. New in the title bar: the notification bell.

## What carries over

Updating only replaces the app. Everything you made is kept, because it lives outside the app ([where files live](projects-and-files#where-files-live)):

| What | Kept? | Where it lives |
|---|---|---|
| Your projects (`.kroma` files) | Yes, with exactly the look they had | Wherever you saved them |
| The project you had open | Yes, it reopens | The autosave in Kroma's settings folder |
| Settings and API keys | Yes | `settings.json` in Kroma's settings folder |
| My styles | Yes | `my-styles.json` in Kroma's settings folder |
| The voice engine | Yes | `voice-engine` in Kroma's settings folder |
| Cloned voices and voice samples | Yes | `voices` in the Kroma Studio library folder |
| Stories, the download queue, the batch list | Yes | `stories`, `downloads`, `batch.json` in the library folder |
| Spoken lines, downloads, exports | Yes | The Kroma Studio library folder |
| Panel sizes, notification history | Yes | Kroma's own storage in the settings folder |

Projects made in any 0.1.x version open in 0.2. A project saved by 0.2 can use things 0.1 doesn't know about, like animated captions or a cover.

## Installing an older version

If a new version gives you trouble, you can go back:

1. Turn off **Settings → About → Update automatically**, so Kroma doesn't update again straight away.
2. Open [GitHub Releases](https://github.com/Heang-Dev/kroma/releases) and find the version you want.
3. Under **Assets**, download the file for your system:

| System | File |
|---|---|
| macOS | `Kroma-Studio-<version>-arm64.dmg` |
| Windows | `Kroma-Studio-Setup-<version>.exe` |
| Linux | `Kroma-Studio-<version>-<arch>.AppImage` or the `.deb` |

4. Install it over the current one, as in [Installation](installation).

Your projects and settings stay. A project saved by a newer version may use things an older version doesn't know about (an older version shows its subtitles without the animation, for example), so keep a copy of anything important before going back. Read the older version's docs with the version menu at the top of the sidebar, and see what changed in the [release notes](release-notes).

Please also [report the problem](troubleshooting#reporting-a-problem), so it can be fixed.

## Moving to a new computer

1. Install Kroma on the new computer ([Installation](installation)), and on a Mac install the tools again (`brew install ffmpeg yt-dlp`).
2. Add your API keys again in [Settings](settings). Keys are encrypted with the old computer's keychain, so they can't be copied over.
3. Install the voice engine again in **Settings → Voice Engine**, if you use it.
4. To keep cloned voices, copy the `voices` folder from the old Kroma Studio library folder into the new one, at the same place. Copy `stories` too for your stories, and `my-styles.json` (in the settings folder) for your styles.
5. To bring a project, follow [Moving a project to another computer](projects-and-files#moving-a-project-to-another-computer). The project file only points to its videos and voice lines, so they must be copied to the same places too. For a series, copy its folder in `projects`, which holds its `kroma-glossary.json`.

Your other settings (translator, folders, theme and so on) are in `settings.json`. You can copy that file into the new computer's settings folder while Kroma is closed; the keys in it won't work, so add them again.
