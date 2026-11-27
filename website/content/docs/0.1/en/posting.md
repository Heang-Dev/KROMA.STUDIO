---
title: Posting
group: Publishing
section: 4
order: 1
---
Kroma can post your finished video to YouTube, Facebook and TikTok in one click. The AI writes a title, text and hashtags for each platform, and you can edit them before posting.

Only post videos you have the right to use. If you translated someone else's video, make sure you have their permission to share it.

## How it works

Kroma doesn't post to the platforms directly. It posts through a service called **Upload-Post** (upload-post.com). YouTube, Facebook and TikTok have already approved Upload-Post, so your posts go out publicly.

You set this up once:

1. Make an Upload-Post account and an API key.
2. Paste the key into Kroma.
3. Connect your YouTube, Facebook and TikTok accounts.

After that, posting is one click from the **Post** panel.

## Plans and limits

| Platform | Upload-Post plan |
|---|---|
| YouTube | Free plan |
| Facebook | Free plan |
| TikTok | Needs the paid **Basic** plan |

The free plan allows **10 posts a month**. When they're used up, you'll see "This month's Upload-Post uploads are used up (the free plan has 10). Upgrade the plan or wait for next month."

These are Upload-Post's plans, not Kroma's. Kroma itself is free.

## Set up posting (once)

### 1. Make an account and an API key

An API key is a long password that lets Kroma use your Upload-Post account.

1. Open **Settings** (⌘,) → **Posting**. Under **Getting started**, press **Open** to go to upload-post.com, and sign up for free.
2. In Upload-Post, go to **API Keys** and create a key. Copy it.
3. Back in Kroma, paste it into **API key** and save it.

The **Account** row now shows your email and plan, for example "you@example.com · free plan", with a green tick. Press **Check** to check again. If the key is wrong, you'll see "Upload-Post refused the API key."

### 2. Connect your accounts

1. Under **Your accounts**, press **Connect**.
2. A secure Upload-Post page opens in your browser. Sign in to YouTube, Facebook and TikTok, and allow access. (The page works for 48 hours.)
3. Come back to Kroma. It refreshes by itself when you return.

Each platform now shows the connected account name, or **Not connected**. If a sign-in has run out, it says "sign-in expired: press Connect". Press **Connect** again to fix it.

Upload-Post keeps your accounts in a **profile**. If you don't have one yet, Kroma makes one called "Kroma Studio" for you. If your Upload-Post account has more than one profile, a **Profile** menu lets you choose which one Kroma posts to.

### 3. Choose your Facebook Page

Facebook only lets apps post to **Pages**, not personal profiles. After you connect Facebook, pick your Page in the **Facebook Page** menu. If it says **No Pages found**, make a Page on Facebook first.

If you have exactly one Page, Kroma uses it automatically.

## Post a video

Open the **Post** panel (left menu). It has up to four sections.

### 1 · Posts

Press **Write the posts**. The AI reads your translated subtitles and writes one post for each platform, in the subtitles' language:

| Platform | What the AI writes |
|---|---|
| **YouTube** | A title people can search for (under 90 characters) and a description of 2–3 short paragraphs |
| **Facebook** | A warm post that makes people curious |
| **TikTok** | A very short hook |

Each post also gets 5–10 hashtags, mixing your language and English. The AI is told not to make up facts that aren't in the video. It also uses the project's name and your translation notes.

Each post is a card with a **title**, the **text** and the **hashtags**. Edit anything:

- Type in the title and text boxes.
- Type hashtags with or without `#`, separated by spaces or commas, for example `#food #fyp`. They're saved when you leave the box or press Enter.
- **Copy** copies the whole post (title, text and hashtags), if you want to paste it somewhere yourself.

Your posts are saved with the project. Press **Write them again** for new ones.

Writing posts needs an AI key: Gemini (free) or Claude. Google Translate can't write posts. See [Add your keys](configuration). Without one you'll see "Writing posts needs an AI: add a free Gemini key (or a Claude key) in Settings → Translation."

If you press **Post** before writing the posts, Kroma writes them first.

### 2 · Post to

If you haven't set up posting, this section shows a **Connect accounts** button that opens **Settings → Posting**.

Otherwise:

1. **Tick the platforms.** Connected accounts are ticked to start with. A platform that isn't connected is greyed out, with a **Connect** button.
2. **YouTube visibility:** **Public** (the default), **Unlisted** (only people with the link can see it) or **Private** (only you).
3. **TikTok:** **Post now** posts straight away. **To drafts** sends it to your TikTok drafts, so you can add music or effects in the TikTok app, then post it yourself.
4. **Video:** if you exported the video and nothing has changed since, Kroma reuses that file ("Uses your last export (nothing changed since).") and shows a green tick. Otherwise choose the export size: **Small**, **Standard** (the default) or **High**. See [Export](export#sizes).
5. Press the button. It names the platforms, for example **Post to YouTube, Facebook, TikTok**.

The button is greyed out when the timeline is empty, when there are no translated subtitles, or when no platform is ticked (it then says **Choose where to post**).

### What happens next

1. Kroma exports the video, unless it can reuse your last export.
2. It uploads the video **once** to Upload-Post, with each platform's own title and text.
3. It follows each platform until it's done. The progress shows, for example, "Posting · 1/3 platforms done".

Platforms can take a while to process a video. Kroma keeps checking for up to 30 minutes. If a platform still isn't done, it says "Still processing on the platform. Check it there in a few minutes."

When it finishes, a message says "Posted to YouTube, Facebook", or "Not posted to TikTok" with the reason. If you sent TikTok to drafts, it reminds you to open the TikTok app and post it from your drafts.

Each post is sent with its own unique key, so if the same upload request reaches Upload-Post twice, it's posted only once.

### What goes where

- **YouTube:** your title (up to 100 characters), and the text with the hashtags added at the end (up to 5000 characters). The hashtags are also added as YouTube tags.
- **Facebook:** a **Reel** if the video is vertical (9:16) and 90 seconds or shorter. Otherwise a normal video on your Page. The hashtags are added at the end of the text.
- **TikTok:** the title and text together, with the hashtags at the end, up to TikTok's 2200 characters.

Anything longer than a platform allows is cut short and ends with "…".

### Posted

After you post, a **Posted** section keeps a history for this project, newest first. Each entry shows the date and time, then each platform:

- a green tick when it's posted, with an **Open** button that opens the post in your browser,
- a red cross when it failed, with the reason,
- a spinner while it's still processing.

The history is saved with the project.

### Subtitle files

At the bottom, **Subtitle files** saves your subtitles as `.srt` files, for YouTube's subtitle upload or to keep a copy:

- **Khmer .srt** (or your language's name): the translated subtitles.
- **Original .srt**: the original subtitles.

## Troubleshooting

| Message | What to do |
|---|---|
| "Add your Upload-Post API key in Settings → Posting first." | Do step 1 above. |
| "Upload-Post refused the API key…" | Copy the key again from app.upload-post.com → API Keys into **Settings → Posting**. |
| "Choose your Facebook Page" | Pick your Page in **Settings → Posting**. |
| "Can't reach Upload-Post. Check your internet connection." | Check you're online and try again. |
| "Upload-Post didn't answer in time." | Check your internet and try again. |
| "sign-in expired" next to a platform | Press **Connect** in **Settings → Posting** and sign in again. |

More help: [Troubleshooting](troubleshooting).
