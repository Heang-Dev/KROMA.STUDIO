---
title: Export
group: Making videos
section: 2
order: 6
---
Exporting turns your project into one video file, with the subtitles, objects and voice-over burned in. The file works everywhere: YouTube, Facebook, TikTok, your phone.

## Start an export

There are three ways, and they all open the same menu of sizes:

- The **Export** button at the top right. It shows your format, like **Export 16:9**.
- The **Export** step in the step bar at the bottom.
- **Next: Export the video**, on the right of the step bar, once the earlier steps are done.

They're greyed out until there's a video on the timeline.

## Sizes

Pick one of three sizes. Each one shows how big the file will be for your video, like *about 75 MB*.

| Size | What the menu says | How it's made |
|---|---|---|
| **Small** | For TikTok and Facebook: they shrink videos anyway. | Squeezed to a smaller file (about 2 Mbit/s at 1080p) |
| **Standard** | Fastest: uses the Mac's video chip. Good for YouTube. | On a Mac, made by the Mac's built-in video chip (about 4 Mbit/s at 1080p) |
| **High** | Best quality, about 3× slower to export. | Close to the original quality, with better sound (192 kbit/s instead of 128) |

On Windows and Linux, **Standard** says *Quick to export. Good for YouTube.* and uses a fast setting on the processor instead of the video chip.

### How big will it be?

Rough sizes for a 5-minute video, from the estimate Kroma shows:

| Size | About |
|---|---|
| Small | 75 MB |
| Standard | 160 MB |
| High | 170 MB |

These are estimates. **High** changes the most from video to video: a calm, simple picture can come out smaller than **Standard**, a busy one bigger. A video over 1,000 MB shows in GB, like *about 1.2 GB*.

### Which one to choose

- Posting to **TikTok** or **Facebook**? Choose **Small**. They compress every upload again anyway, so a bigger file doesn't look better there, it just takes longer to upload.
- Posting to **YouTube**? **Standard** is quick and looks good.
- Keeping a master copy, or the picture has lots of fine detail? Choose **High**, and give it more time.

## What you get

Every export is an **MP4** video (H.264 picture, AAC sound) at 30 frames a second, the format every platform accepts. Its size in pixels comes from the format you chose in **Style**:

| Format | Pixels |
|---|---|
| 16:9 | 1920 × 1080 |
| 9:16 | 1080 × 1920 |
| 1:1 | 1080 × 1080 |

The file is set up to start playing before it has fully loaded, which helps when it's played online.

## Following the export

While it works, a progress bar shows at the top right, next to the buttons:

1. **Drawing subtitles 25/312**: Kroma draws each subtitle as a picture, so the export looks exactly like the preview.
2. If there's a voice-over, Kroma puts the voice track together.
3. **Exporting · 1:23 / 5:00**: the video itself, with how far it has got.

The **Export** button becomes **Cancel export** while it runs. Press it to stop.

When it's done, Kroma says **Export finished** with the file's location, and opens the folder with the new video selected.

## Where the file is saved

Exports go straight into your export folder. By default that's:

- Mac: `Movies/Kroma Studio/Exports`
- Windows: `Videos/Kroma Studio/Exports`

The file is named after the project and the format, like `My drama (9x16).mp4`. Kroma never overwrites a file: if that name is taken, it saves `My drama (9x16) (2).mp4`, and so on.

To change this, open **Settings → Folders**:

- **Export folder**: press **Change…** to pick another folder, **Reset** to go back to the default, or **Open** to see it.
- **Ask where to save each time**: turn it on to choose the name and place for every export. Off (the default), Kroma saves straight into the folder.

Subtitle `.srt` files saved from **Post** go to the same folder. See [Posting](posting).

## With a voice-over

If you made a voice-over (see [Characters & voices](characters-and-voices)), it's mixed into the export, as long as **Use the voice-over** is on in **Voice → Mix**.

### Removing the original voices

A voice-over sounds best without the original speech underneath. **Remove the original voices** (in **Voice → Mix**) keeps the music and sound effects and drops the original speech. It's on unless you turn it off.

Usually Kroma does this right after the voice-over is made. If it hasn't happened yet, Kroma does it when you press export, before the export starts. That takes about 40 seconds per 5 minutes of video on a recent Mac or PC, and it's instant afterwards.

How loud things are in the export:

- With the voices removed, the background plays at the **Music & effects** level (100% by default).
- With **Remove the original voices** off, the original sound plays at the **Original sound** level (15% by default) under the voice-over.

If removing the voices fails, Kroma tells you *"The original voices are still in"*, and the original sound plays quietly under the voice-over. Try again from **Voice → Mix**.

If some lines don't have a voice yet, Kroma warns you: *"Some lines have no voice yet; they'll be silent. Press 'Make voice-over' to fill them."*

## When an export fails

If the export stops with an error, Kroma saves the full details as `last-export-error.log` in its settings folder (on a Mac: `~/Library/Application Support/Kroma Studio`). Attach that file to a [GitHub issue](https://github.com/Heang-Dev/KROMA.STUDIO/issues) so it can be fixed. See [Troubleshooting](troubleshooting).

If the top of the window says **Missing ffmpeg**, the tool that makes the video isn't installed. It shows the command to install it.
