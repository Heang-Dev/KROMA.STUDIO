---
title: Translation
group: Making videos
section: 2
order: 4
---
Kroma translates the meaning the way people really talk, not word by word. It uses the right politeness for who's speaking to whom, common spellings for foreign words, and keeps each line short enough to read, and to say aloud in the time it's on screen.

Everything on this page happens in the **Translate** panel, and in **Settings → Translation**.

## Choose a translator

Open **Settings → Translation** (or press the gear at the top of the **Translate** panel) and pick a **Translator**:

| Translator | Cost | Quality | Notes for the translator |
|---|---|---|---|
| **Gemini** (default) | Free tier · good Khmer | Good | Followed |
| **Google Translate** | Free · no key · basic | Literal | Not used |
| **Claude** | Paid · best Khmer | The most natural, best with names and tone | Followed |

- **Gemini**: get a free key from Google AI Studio, no card needed. Under **Model** you can pick another Gemini model. Flash models are fast and free; Pro is better but has a smaller free limit.
- **Google Translate**: works straight away. It doesn't read your notes or the earlier lines, so names and politeness may be off.
- **Claude**: paid by use with an Anthropic key. **Model** offers **Opus 5.5 · best Khmer** (default), **Sonnet 5.5 · cheaper** and **Haiku 5.5 · cheapest**.

Adding keys is covered in [Add your keys](configuration).

## Translate the video

In **Translate**:

1. Choose **Translate to**.
2. Press **Make Khmer subtitles** (the button follows your language, like **Make Thai subtitles**).

Kroma gets the original lines first (see [Subtitles](subtitles)), then translates them. It sends the lines in batches of 60, each with a few earlier lines so the translator understands the scene. You'll see `Translating with Gemini · 2/6 batches`. When it's done: **Translated 312 lines to Khmer.**

### Step by step

The **Step by step** section lets you redo just one part. Its bar shows how many lines are done, like **Translated 298 / 312**.

| Button | What it does |
|---|---|
| **Translate all** | Translates every line again. Your hand fixes are replaced, so Kroma asks first (Undo brings them back). |
| **Only missing** | Translates only the lines that are still empty. |

### Re-translating some lines

There's no button for one line. To redo a few lines: clear their translation in the **Subtitles** list (select the text and delete it), then press **Only missing**. The other lines keep your changes.

## Languages

**Translate to** offers seven languages:

| Language | Shown as |
|---|---|
| Khmer (default) | Khmer · ខ្មែរ |
| Thai | Thai · ไทย |
| Vietnamese | Vietnamese · Tiếng Việt |
| Lao | Lao · ລາວ |
| English | English |
| Indonesian | Indonesian · Bahasa Indonesia |
| Malay | Malay · Bahasa Melayu |

When you switch language:

- Lines you already translated stay as they are until you translate again.
- The **Khmer** step in the status bar takes the new language's name.
- Instant voices switch to the new language's voice of the same gender. The designed and cloned voices are made for Khmer. See [Characters & voices](characters-and-voices).
- The social posts are written in that language. See [Posting](posting).

## Notes for the translator

The **Notes for the translator** box is the best way to get names and tone right. Write the show's title, the names, who's who and how they speak. For example:

`Palace drama. 李明 is the hero, write it លី មីង. The emperor speaks formally.`

Gemini and Claude read the notes with every batch, and keep names and politeness the same across the whole video. Google Translate ignores them. The notes are saved with the project.

For names that must be the same in **every episode** of a series, use the [series glossary](#series-glossary) too.

## Series glossary

A series has the same characters in every episode, and their names should be spelled the same way every time. The **Series glossary**, in **Translate** under **Notes for the translator**, keeps one spelling for each name and term, and every episode in the same folder uses it.

Each row is the name as written in the original (like 林风) and the way it must be written in the translation (like លីនហ្វេង).

### How it fills in

- **After a series' first translation**, Kroma reads the original and translated lines and adds the characters, places and titles it finds, with the spelling the translation used. You get a notification like *Added 12 names to the series glossary*.
- **Find names** (at the top of the section) does the same for the open episode at any time. Names already in the glossary keep their spelling; only new ones are added.
- **By hand**: type the original and its translation in the empty row at the bottom and press **+**.

Finding names needs a Gemini or Claude key. Fix any spelling by clicking it and typing; it saves when you click away. The bin on a row removes it.

### How it's used

| Translator | What happens |
|---|---|
| **Gemini**, **Claude** | Each batch of lines is sent with the glossary's names that appear in it, and the translator is told to always write them exactly like that. |
| **Google Translate** | It can't follow instructions, so Kroma swaps the names in before translating. |

The glossary is kept next to the projects, in a file called `kroma-glossary.json` in the project's folder. Every project in that folder shares it, so it works best with the [Download Center](downloading#the-download-center), which puts each series' episodes in their own folder. It holds up to 300 names.

The project must be saved to a file first. An unsaved project says *Save the project first*.

## How Kroma writes Khmer

Kroma gives the translator a few Khmer rules of its own:

- **Politeness**: pronouns that fit who's speaking to whom, like បង/អូន, លោក, or ព្រះករុណា for royalty in historical dramas.
- **Foreign names**: written in Khmer script, by sound.
- **Loanwords**: well-known foreign words are spelled the way Cambodians usually write them, never a new spelling. For example: hamburger ហាំប៊ឺហ្គឺ, pizza ភីហ្សា, salad សាឡាត់, coffee កាហ្វេ, chocolate សូកូឡា, calorie កាឡូរី, vitamin វីតាមីន.
- **Only Khmer script**: brand names may stay in English letters, but never Thai, Lao, Chinese or other scripts.
- **Length**: each line is written to be said in about the time it's on screen (roughly 5 Khmer syllables a second), because it may be read aloud as a voice-over.

Thai and Vietnamese get similar rules for polite words and pronouns.

## The wrong-script check

Translators sometimes slip in a word from another language, like a Thai word inside Khmer, or leave a Chinese word untranslated. Kroma checks every translated line. Latin letters (names, brands), numbers and punctuation are always fine; letters from any other script are not.

Lines that fail get **one more try**, with a note telling the translator to use only that language's script. You'll see `Fixing 3 lines that mixed in another script`. If the second try is still wrong, Kroma keeps the first answer so you can fix it by hand.

This check runs for Gemini and Claude. It's skipped with Google Translate, and also in a run where some lines had to fall back to Google Translate (see below).

## Find and replace

When the translator spells a name or word wrong all through the video, fix it once:

1. Press **Find and replace** at the top of the **Subtitles** list. (If you typed in **Find in subtitles**, that word is filled in for you.)
2. Under **Find**, type or paste the wrong word. Kroma shows how many lines have it, like **In 14 lines**.
3. Under **Replace with**, type the right word.
4. Press **Replace in 14 lines**.

It only changes the translations, not the original lines, and it matches the exact text you typed. The whole change is one step, so **Undo** brings everything back.

**Remember for future translations** is ticked by default. It adds a line to your notes, like `Write "លី មីង", never "លីមីង".` That way, the next time you translate, Gemini or Claude spells it right from the start.

## When Gemini is busy

Gemini's free tier allows only a few requests a minute, and a set amount a day. Kroma handles this for you:

1. When Gemini says "too many requests", Kroma waits a little and tries again (**Gemini is busy, retrying in 20 s…**).
2. If it stays busy, or the free daily limit is used up, Kroma tries the lighter **Flash-Lite** model.
3. Any lines still left are translated with Google Translate (**Gemini is busy: translating 40 lines with Google Translate**).

At the end you'll see how many lines used Google Translate: *"Gemini was busy, so 40 lines used Google Translate. Press "Translate all" later for Gemini's better wording."* The free daily limit resets the next day.

If some lines couldn't be translated at all, Kroma says **Translated 280 of 312 lines**, with a **Translate missing** button on the notice. It does the same as **Only missing**.

## Common messages

| Message | What to do |
|---|---|
| *Add your free Gemini key in Settings → Translation, or choose Google Translate there.* | Add a key, or switch translator. |
| *The Gemini API key was refused.* | Check the key in **Settings → Translation**. |
| *Gemini's free daily limit is used up (it resets tomorrow).* | Switch to Google Translate, or wait until tomorrow. |
| *Claude is rate limiting this key.* | Lower **Parallel requests** in **Settings → Translation**, or wait a little. |
| *Google Translate is busy (too many requests).* | Try again in a few minutes, or use Gemini. |

More in [Troubleshooting](troubleshooting).
