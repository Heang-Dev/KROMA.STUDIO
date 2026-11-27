---
title: Updates
group: Getting started
section: 1
order: 3
---
Kroma keeps itself up to date. New versions download in the background while you work, and you choose when to restart. Your project is saved and opens again after the restart.

## How it works

1. **Kroma checks for a new version.** The first check happens a few seconds after Kroma starts, then every 4 hours while it's open. New versions come from [GitHub Releases](https://github.com/Heang-Dev/kroma/releases).
2. **It downloads in the background.** A card appears in the bottom-right corner: **Downloading Kroma 0.1.4**, "It downloads in the background. Keep working.", with a progress bar and a percentage.
3. **It's ready.** The card changes to **Kroma 0.1.4 is ready**, "Restart to finish updating. Your project is saved and opens again." It has two buttons:
   - **Restart to update**: Kroma closes, installs the new version, and opens again with your project.
   - **Later**: hides the card. You can keep working as long as you like.

If Kroma is already up to date, nothing appears at all.

## After you click Later

The card stays hidden for that version, but the update isn't lost. A small green **Restart to update** stays in the step bar along the bottom of the window, on the right, next to the **Next** button. Click it to bring the card back.

If you hide the card while it's still downloading, the step bar shows **Updating** with the percentage instead.

You can also hide the card with the **×** in its top-right corner. That works the same as **Later**.

## Update settings

Open **Settings → About**. The **Updates** card has:

| Setting | What it does |
|---|---|
| **Check for updates** · **Check now** | Looks for a new version right away. The line under it tells you what happened, for example "You have the latest version (0.1.3)." or "Downloading Kroma 0.1.4 · 45%". |
| **Update automatically** | On by default: new versions download in the background. Off: Kroma only tells you a new version is out, and downloads nothing until you ask. |
| **What's new** · **Changelog** | Opens the list of changes on the Kroma website. |

### When Update automatically is off

Kroma still checks on start and every 4 hours. When a new version is out, the card says **Kroma 0.1.4 is available**, "A new version of Kroma is out.", with **Download** and **Later**. Click **Download** to get it; the card then shows the progress and **Restart to update** as usual. After **Later**, the step bar shows a small **Update to 0.1.4** you can click to bring the card back.

Clicking **Check now** in Settings downloads a new version straight away, even when automatic updates are off.

## How each system installs

| System | What happens when you click Restart to update |
|---|---|
| **macOS** | Kroma already copied the new app out of the downloaded `.dmg`. On restart it swaps the new app into place (keeping the old one until the copy works), clears the "downloaded from the internet" mark, and opens it. You don't need the `xattr` command again. |
| **Windows** | The new installer runs and Kroma opens again. |
| **Linux AppImage** | The AppImage file is replaced with the new one and Kroma opens again. |
| **Linux .deb** | Installing a `.deb` needs your password, so Kroma can't do it alone. It downloads the new `.deb` and opens it in your system's software installer. Install it there, then open Kroma again. |

On **Windows** and with the **AppImage**, if you simply quit Kroma after an update has downloaded, it installs when Kroma closes. On a **Mac**, the new version is only put in place when you click **Restart to update**.

## If an update doesn't work

| Message | What it means |
|---|---|
| "Couldn't reach GitHub to check for updates." | No internet, or GitHub is blocked. Kroma tries again in 4 hours, or click **Check now** later. |
| "No releases found yet." | GitHub had nothing to offer. Try again later. |
| "Kroma can't replace itself in …. Drag the new Kroma Studio from the window that opened into Applications." | Mac only. Kroma isn't allowed to write to the folder it runs from, for example when you opened it straight from the `.dmg`. A Finder window opens with the new app: drag it into **Applications**. From then on, run Kroma from Applications. |
| "The downloaded update is missing. Check for updates again." | Mac only. The downloaded copy was removed. Click **Check now** in Settings → About. |

When a restart fails, a **Couldn't update** message appears in the bottom-right corner with the reason. You can always [download the latest version by hand](https://github.com/Heang-Dev/kroma/releases/latest) and install it over the old one, as in [Installation](installation). Your projects, settings and keys are kept.

## Older versions

- Versions before **0.1.1** can't update themselves. Download the latest once by hand.
- On Windows and Linux, automatic updates work from **0.1.2**. If you have 0.1.1 on Windows or Linux, download the latest once by hand too.

## Staying on an older version

Turn off **Update automatically**, and don't click **Download** on the card. To read the docs for your version, use the version menu at the top of the docs sidebar. Each version's [release notes](release-notes) list what changed, and [Upgrading](upgrade) explains anything you need to do when moving to a new version.
