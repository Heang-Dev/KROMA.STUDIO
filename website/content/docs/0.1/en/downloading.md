---
title: Downloading videos
group: Making videos
section: 2
order: 2
---
Every project starts with a video. You can download one from a link, or import a file you already have. Both live in the **Media** panel (the first item in the menu on the left).

## Download from a link

1. Open **Media**.
2. In **Download from a link**, paste the link into the box that says **Paste a link or a share message**.
3. Press **Get** (or press Enter).

Kroma downloads with **yt-dlp**, a free tool that knows over 1,000 video sites. The panel names the common ones: YouTube, Bilibili, Douyin, Youku, iQiyi, Facebook and TikTok.

While it works you'll see what's happening:

| Message | What it means |
|---|---|
| **Reading the link…** | Finding the video on the page |
| **Downloading 45% · … · … left** | The download, with its speed and time left |
| **Getting the site's subtitles…** | Saving the site's own subtitles too |
| **Joining video and audio…** | Putting the picture and sound together into one file |

Press the **×** next to the progress to cancel. When it's done, Kroma says **Downloaded.**, or **Downloaded, with the site's subtitles (zh-Hans)** (or another language code) when the site had subtitles.

If the box doesn't hold a link, Kroma says: *"Paste a link that starts with https:// (a share message with a link in it works too)."*

## Share messages

Apps like Douyin and Bilibili don't give you a plain link. Their **Share** button copies a whole message, such as:

`【Is a hamburger really junk food?】 https://b23.tv/abc123`

Paste the whole thing. Kroma finds the link inside it, and also reads the title. You'll see **Title: …** under the box before you press **Get**. That title becomes the video's name and the project's name.

Kroma understands titles inside `【…】`, `《…》`, `「…」` and `『…』`, or plain words before the link. It drops the app's extra words (like "copy and open Douyin") on its own.

Kroma also cleans the link before downloading:

- It removes the parts that only track who shared it.
- Bilibili links with a language in them (like `bilibili.com/en/video/…`) are fixed so they work.
- For a Bilibili video in several parts, the part number (`p=`) is kept, so you get the part you shared.
- A YouTube link from a playlist downloads only that one video, not the whole list.

## The site's own subtitles

Many sites have subtitles of their own. Kroma asks for them with every download, Chinese first (Simplified, then Traditional, including Bilibili's AI subtitles), and English too.

When a video comes with subtitles, its row in **Media** shows a small badge with the language codes, like `zh-Hans`.

Why it matters: when the site's Chinese subtitles are there, **Make Khmer subtitles** uses them and skips speech-to-text. That's faster, and the lines are usually exact. See [Subtitles](subtitles).

If the site refuses the subtitles (this happens when it's busy), Kroma says **Retrying without the site's subtitles…** and gets the video anyway.

## Quality

Kroma picks the best version up to **1080p** and saves it as an **MP4** file. 1080p is the size of the exports, so a bigger download wouldn't help.

Some sites, like Bilibili, only give 1080p when you're signed in. Others only play some videos for members. To use your logins:

1. Sign in to the site in your web browser.
2. In Kroma, open **Settings → Downloads**.
3. Under **Use my logins from**, choose your browser: **Chrome**, **Safari**, **Firefox**, **Edge** or **Brave**. The default is **None · public videos only**.

Your computer may ask you to allow this. Safari also needs Full Disk Access for Kroma.

## Where downloads go

Each download gets its own folder (named with a number) inside the download folder, together with the site's subtitles. The default is:

- Mac: `Movies/Kroma Studio/downloads`
- Windows: `Videos/Kroma Studio/downloads`

To see them, open **Settings → Folders** and press **Open** next to **Download folder**. Press **Change…** to use another folder, or **Reset** to go back to the default. See [Settings](settings).

## Import a file

Already have the video? In **Media**, press **Import** at the top right of the **Media** section. You can pick several files at once.

Kroma opens these kinds of video files: `.mp4`, `.mov`, `.m4v`, `.mkv`, `.webm`, `.avi`, `.flv` and `.ts`.

Imported files stay where they are. Kroma doesn't copy them, so don't move or delete them while you're working on the project.

A file with only sound (no picture) can't go on the video track yet. Kroma tells you: *"Audio-only files can't go on the video track yet."*

## More than one clip

The **Media** section lists every video in the project. Each row shows the name, the length, the picture size (like `1920×1080`) and the subtitle badge if it has one.

- The **first** video you add goes onto the timeline by itself. It also names the project, and if it's a tall video the format switches to **9:16**.
- Videos you add after that only go into the list. Press the **+** on a row (**Add to the end of the timeline**) to put it after the others.
- On the timeline, drag a clip to change the order, and drag its edges to trim it. See [Subtitles](subtitles#the-timeline).

One thing to know: **Make Khmer subtitles** works on the video of the **first clip** on the timeline. For a second video, see [Subtitles](subtitles).

## When a download fails

Kroma explains what went wrong in plain words:

| Message | What to do |
|---|---|
| *This video is protected (encrypted), so it can't be downloaded.* | The site uses DRM (copy protection), common on paid streaming. Kroma can't download these. |
| *This link isn't a video page Kroma can download from…* | Open the video itself and copy its link, not the channel or home page. |
| *This video needs you to be signed in…* | Choose your browser in **Settings → Downloads** (see [Quality](#quality)). |
| *The video isn't available any more…* | It was removed, or the link is wrong. |
| *This video isn't available from your country.* | The site blocks your country. |
| *The connection failed…* | Check your internet and try again. |

If the top of the window says **Missing yt-dlp**, the download tool isn't installed. It shows the command to install it (on a Mac, `brew install yt-dlp`). See [Troubleshooting](troubleshooting).
