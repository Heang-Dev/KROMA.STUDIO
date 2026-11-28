---
title: Downloading videos
group: Making videos
section: 2
order: 2
---
Every project starts with a video. There are two places to get one:

- The **Media** panel (the first item in the menu on the left), for **one video**: download it from a link, or import a file you already have.
- The **Download Center** (**Downloads** in the left menu), for **many videos**: a whole series, a collection, a playlist or a channel, or a folder of episodes you already have. Each video becomes its own project. See [The Download Center](#the-download-center).

The rest of this page starts with the Media panel.

## Download from a link

1. Open **Media**.
2. In **Download from a link**, paste the link into the box that says **Paste a link or a share message**.
3. Press **Get** (or press Enter).

Under the box, **Download many (series, playlist, channel) →** opens the Download Center.

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

Why it matters: when the site has subtitles, **Make Khmer subtitles** uses them and skips speech-to-text: Chinese first, then English, then any other language the site has. That's faster, and the lines are usually exact. See [Subtitles](subtitles).

If the site refuses the subtitles (this happens when it's busy), Kroma says **Retrying without the site's subtitles…** and gets the video anyway.

## Quality

Kroma picks the best version up to **1080p** and saves it as an **MP4** file when the site has one. 1080p is the size of the exports, so a bigger download wouldn't help. In the Download Center you can choose **720p** or **480p** instead.

Some sites, like Bilibili, only give 1080p when you're signed in. Others only play some videos for members. To use your logins:

1. Sign in to the site in your web browser.
2. In Kroma, open **Settings → Downloads**.
3. Under **Use my logins from**, choose your browser: **Chrome**, **Safari**, **Firefox**, **Edge** or **Brave**. The default is **None · public videos only**.

Your computer may ask you to allow this. Safari also needs Full Disk Access for Kroma.

## Where downloads go

Each download from the **Media** panel gets its own folder (named with a number) inside the download folder, together with the site's subtitles. The Download Center uses a folder per series instead (see [One project per episode](#one-project-per-episode)). The default download folder is:

- Mac: `Movies/Kroma Studio/downloads`
- Windows and Linux: `Videos/Kroma Studio/downloads`

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

## The Download Center

The **Download Center** downloads many videos at once, and makes a Kroma project for each one, ready to translate and voice. Open it with **Downloads** in the left menu. On the left you add videos; on the right is the **Queue** (or **Supported sites**).

### Add videos

1. Under **Add videos**, paste one or more links, one per line: a single video, a whole series, a collection (合集), a playlist, a multi-part upload, or a channel. Share messages work too, like `【第1集】 https://b23.tv/…`.
2. Press **Find videos** (or ⌘Enter / Ctrl+Enter).

Kroma lists every video behind each link, grouped by series or playlist, with how many it has, for example *Playlist · 40 videos · 40 picked*. Titles fill in as Kroma reads them. A long playlist or channel lists its first videos; press **Load more** for the rest.

Everything is ticked to start with. Untick what you don't want, or use the group's buttons to pick all or none. Videos already in the queue say **In queue**. Nothing downloads until you press **Download**.

A YouTube channel link (`youtube.com/@name`) lists the channel's videos.

### Options

**Options** apply to the videos you download next:

| Option | Default | What it does |
|---|---|---|
| **Quality** | **1080p** | **1080p**, **720p** or **480p**. Some sites only give 1080p when you're signed in (see [Quality](#quality)). |
| **Site subtitles** | On | Downloads the site's own subtitles too, when it has them. |
| **Make a project for each video** | On | Makes a `.kroma` project for every video, with the video on the timeline. |

Then press **Download … videos**.

### The queue

The **Queue** lists every video, grouped by series, with a summary like *12 done · 2 downloading · 30 waiting*. Each video shows **Waiting**, its progress with speed and time left, **Downloaded · project ready**, **Already downloaded**, or why it failed.

- **Downloads at the same time**: **1 at a time**, **2 at a time** (the default) or **3 at a time**.
- **Pause** stops new downloads from starting (those running finish); **Resume** carries on.
- **Retry failed** tries every failed video again. **Clear finished** takes finished videos off the list.
- On each video: **Open project**, **Retry** (when it failed), **Cancel**, **Show in folder**, and **Remove from the list (the files stay)**.

The queue keeps going while you work on other pages, and picks up where it stopped after a restart. You get a notification for each video and a summary when the queue is done.

**Nothing downloads twice.** Kroma remembers every video it downloaded. Add the same series again and the videos you have say **Already downloaded**, so only new episodes download. Removing a video from the list lets you download it again.

**When a site asks for a break.** Downloading many videos in a row can make a site slow you down (Bilibili, or YouTube asking to confirm you're not a bot). Kroma then pauses the queue and says so: wait a while (Bilibili: a few minutes; YouTube: up to an hour) and press **Resume**, or turn on browser logins in **Settings → Downloads**.

### One project per episode

With **Make a project for each video** on, every video becomes its own project, numbered in a folder named after the series:

| What | Where |
|---|---|
| The videos | The download folder, in a folder for the series: `<series>/07 - <title> [<id>].mp4`, with the site's subtitles next to them |
| The projects | `projects/<series>/07 - <title>.kroma` in the Kroma Studio library folder |

The number keeps the episodes in order, with as many digits as the series needs (`07` in a series of 12, `007` in one of 250). Single videos have no number. The projects open ready to translate: the video is on the timeline, and a tall video starts in **9:16**.

Because every episode of a series shares a folder, they also share one [series glossary](translation#series-glossary), and covers read the episode number from the name ([Episode covers](posting#episode-covers)).

### Your own files

Already have the episodes? Under **Your own files**, press **Import files…** or **Import a folder…**. Each video becomes its own project, in natural order (EP1, EP2 … EP10, or 第2集 before 第10集).

- A folder is read directly (not the folders inside it), for `mp4`, `mov`, `mkv`, `webm`, `m4v`, `avi` and `flv` files.
- Subtitle files with the same name come with the video: `EP1.srt`, or with a language, `EP1.zh.srt`. Files with subtitles show **SRT**.
- Tick the files you want and press **Make … projects**. The projects go in `projects/<folder name>/`.
- Kroma uses the files where they are. Don't move or delete them.

### Send them to Batch

Tick finished videos in the queue and press **Process … selected** to send them to [Batch](batch), which runs every step on them (subtitles, translation, voice-over, export…).

### Supported sites

**Supported sites** (next to **Queue**) shows the sites people ask about most, Chinese sites first, with what works on each and **Open site** to visit it:

| Site | Works |
|---|---|
| Bilibili | Videos, multi-part videos, collections (合集), series and channel uploads. 1080p and member videos need browser logins. |
| Douyin | Single videos and share messages. May need browser logins. |
| Ixigua / Toutiao, Xiaohongshu, Weibo, AcFun | Videos |
| Youku, iQiyi / iq.com, Tencent Video / WeTV, Mango TV | **Free only**: free episodes download; VIP episodes are locked (DRM). |
| YouTube | Videos, Shorts, playlists and whole channels. Works without installing anything else. |
| TikTok, Facebook, Instagram, X (Twitter), Vimeo, Dailymotion | Videos, and their profiles, playlists or showcases |

Under them, **Every site** lists every site the downloader can read, with **Search sites**. Protected (DRM) VIP episodes can't be downloaded by any app like this one.

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

In the Download Center, the reason shows on the video in the queue, and in the [bell](notifications). If the whole queue pauses, see *When a site asks for a break* in [The queue](#the-queue).

If the top of the window says **Missing yt-dlp**, the download tool isn't installed. It shows the command to install it (on a Mac, `brew install yt-dlp`). See [Troubleshooting](troubleshooting).
