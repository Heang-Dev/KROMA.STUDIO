---
title: Upgrade guide
group: This version
section: 6
order: 2
---
How to move to a newer version of Kroma, what stays the same, and how to go back to an older one.

## Within 0.1: nothing to do

From 0.1.1 on, every 0.1.x version updates itself:

1. Kroma checks for a new version when it starts and every 4 hours.
2. It downloads the new version in the background. A card at the bottom right shows the progress.
3. When the card says **Restart to update**, click it when you're ready. Kroma restarts on the new version and your project opens again.

Click **Later** to hide the card; **Restart to update** stays in the status bar at the bottom. You can also check by hand in **Settings → About → Check now**. Details for each system are on [Updates](updates).

If you turned off **Update automatically**, Kroma only tells you a new version is out. Press **Download** on the card when you want it.

## From 0.1.0 to 0.1.1 or later

0.1.0 can't update itself. Do this once:

1. Download the latest version from the [download page](/#download).
2. Install it over the old one, the same way you installed Kroma ([Installation](installation)). On a Mac, drag it into **Applications** and choose to replace the old app.
3. Open it. From now on, updates come by themselves.

## What carries over

Updating only replaces the app. Everything you made is kept, because it lives outside the app ([where files live](projects-and-files#where-files-live)):

| What | Kept? | Where it lives |
|---|---|---|
| Your projects (`.kroma` files) | Yes | Wherever you saved them |
| The project you had open | Yes, it reopens | The autosave in Kroma's settings folder |
| Settings and API keys | Yes | `settings.json` in Kroma's settings folder |
| Cloned voices and voice samples | Yes | `voices` in the Kroma Studio library folder |
| Spoken lines, downloads, exports | Yes | The Kroma Studio library folder |
| Panel sizes | Yes | Kroma's own storage in the settings folder |

Projects made in any 0.1.x version open in every later 0.1.x version.

## Installing an older version

If a new version gives you trouble, you can go back:

1. Turn off **Settings → About → Update automatically**, so Kroma doesn't update again straight away.
2. Open [GitHub Releases](https://github.com/Heang-Dev/kroma/releases) and find the version you want.
3. Under **Assets**, download the file for your system:

| System | File |
|---|---|
| macOS | the `.dmg` |
| Windows | `Kroma-Studio-Setup-<version>.exe` |
| Linux | `Kroma-Studio-<version>-<arch>.AppImage` or the `.deb` |

4. Install it over the current one, as in [Installation](installation).

Your projects and settings stay. A project saved by a newer version may use things an older version doesn't know about, so keep a copy of anything important before going back. Read the older version's docs with the version menu at the top of the sidebar, and see what changed in the [release notes](release-notes).

Please also [report the problem](troubleshooting#reporting-a-problem), so it can be fixed.

## Moving to a new computer

1. Install Kroma on the new computer ([Installation](installation)), and on a Mac install the tools again (`brew install ffmpeg yt-dlp`).
2. Add your API keys again in [Settings](settings). Keys are encrypted with the old computer's keychain, so they can't be copied over.
3. To keep cloned voices, copy the `voices` folder from the old Kroma Studio library folder into the new one, at the same place.
4. To bring a project, follow [Moving a project to another computer](projects-and-files#moving-a-project-to-another-computer). The project file only points to its videos and voice lines, so they must be copied to the same places too.

Your other settings (translator, folders, theme and so on) are in `settings.json`. You can copy that file into the new computer's settings folder while Kroma is closed; the keys in it won't work, so add them again.
