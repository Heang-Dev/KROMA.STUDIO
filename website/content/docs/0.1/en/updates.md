---
title: Updates
group: Getting started
section: 1
order: 3
---
Kroma keeps itself up to date.

## How it works

1. Kroma checks [GitHub Releases](https://github.com/Heang-Dev/kroma/releases) when it starts and every 4 hours.
2. A new version downloads in the background; a card in the bottom-right corner shows the progress.
3. When it's ready, the card shows **Restart to update**. Click it whenever you like: Kroma restarts on the new version and your project reopens. **Later** hides the card; **Restart to update** stays in the status bar at the bottom.

## Settings

In **Settings → About → Updates**:

- **Check now** looks for a new version right away.
- **Update automatically**: on by default. Off: Kroma only tells you a new version is out, and you choose when to download it.

## How each system installs

| System | Install |
|---|---|
| macOS | Kroma downloads the new app and swaps it into Applications on restart |
| Windows | The installer runs on restart |
| Linux AppImage | The AppImage is replaced on restart |
| Linux .deb | The new `.deb` is downloaded and opened in your system's installer (it asks for your password) |

## Staying on an older version

Turn off **Update automatically**, and read the docs for your version: use the version menu at the top of the sidebar. Each version's [release notes](release-notes) list what changed.

Versions before 0.1.1 can't update themselves: download the latest once by hand.
