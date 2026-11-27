---
title: Voice library
group: Voices
section: 3
order: 2
---
The voice library is where you listen to every voice Kroma has, side by side, and pick one for your project. Open it with **Voices** in the left menu (below the editor's tools). The page is called **My voices**.

At the top right there are two buttons:

- **Clone voice** makes a new voice from a short recording. See [Voice cloning](voice-cloning). It's greyed out when the [voice engine](voice-engine) isn't connected.
- **Import from KVS** copies voices from a Khmer Voice Studio dashboard on this computer (see [below](voice-library#importing-from-khmer-voice-studio)).

The page has three sections: **Your voices**, **Preset voices** and **Instant voices**.

## Voice cards

Every voice is a card. A card shows:

- the voice's name,
- a short line under it: the sample's length (for example "12.4 s"), "cloned", "instant · Khmer" or **no sample yet**,
- a green **Ready** badge when the voice has a sample you can play,
- a waveform player (see below),
- the text the sample says, or a description of the voice.

The **⋯** button on a card opens a menu:

- **Use in this project** makes this the project's voice (the default voice in the **Voice** panel) and turns the voice-over on. A message confirms it, for example: "Narrator (deep male)" is the voice for this project.
- **Delete** (for your voices) or **Delete the sample** (for preset voices). Deleting a cloned voice asks you to confirm first.

To give a voice to one character instead, use the voice menu next to that character in the **Voice** panel. See [Characters & voices](characters-and-voices).

## The waveform player

Each card has a small player:

- Press the round ▶ button to play. Press it again to pause.
- The bars show the shape of the sound. They fill in as it plays.
- Click anywhere on the bars to jump to that point.
- The times under the bars show where you are and how long the sample is.

Only one sample plays at a time. Starting one stops any other.

## Your voices

Voices you cloned or imported. The section reminds you: "Only use voices you have permission to use."

Each card shows the length of the recording and the words it says. If you have none yet, it says "No cloned voices yet."

If the Khmer Voice Studio dashboard on this computer has cloned voices that Kroma doesn't have yet, a note lists them ("In Khmer Voice Studio, not here yet: …") with an **Import** button.

Cloned voices need the [voice engine](voice-engine) to speak.

## Preset voices

36 designed Khmer voices, the same ones as in Khmer Voice Studio. They're sorted into seven groups:

| Group | Voices |
|---|---|
| **Narration** (6) | Narrator (deep male), Narrator (clear female), News anchor (male), News anchor (female), Storyteller (warm grandfather), Storyteller (kind grandmother) |
| **Palace & royalty** (10) | King (majestic), Emperor (cold), Queen (elegant), Empress dowager (stern), Prince (young noble), Princess (gentle), Concubine (scheming), Minister (old official), Eunuch (palace servant), Maid (timid servant) |
| **Heroes & fighters** (5) | Young man (hero), Young woman (heroine), General (bold warrior), Swordswoman (fierce), Assassin (cold killer) |
| **Modern drama** (4) | CEO (cold boss), Secretary (office woman), Rich young master (arrogant), Shopkeeper (cheerful) |
| **Family & elders** (4) | Father (strict), Mother (caring), Old man (village elder), Old monk (wise) |
| **Children & teens** (4) | Young boy, Young girl, Teenage boy (cheeky), Teenage girl (cheerful) |
| **Villains & mood** (3) | Villain (dark, slow), Villainess (cruel), Ghost story (whisper) |

When the voice engine is connected, Kroma shows the engine's own list. If the engine offers voices that aren't in these groups, they appear under **More**.

### Making a sample

A preset voice is designed from a written description, for example "A middle-aged man with a deep, clear, confident male narrator voice". The first time, the engine makes a sample of about 10 seconds from that description. That sample is then saved on your computer and used every time, so the voice **sounds the same in every video**.

On a card with **no sample yet**, press **Make a sample (once)**. It takes about a minute. The button says **Making the sample…** while it works. Kroma checks that the result has the right pitch for the character (a man sounds like a man, a child like a child), and tries again if not.

If the engine isn't connected, the button says **Start the engine to make a sample**.

You don't have to make samples by hand. If you use a preset voice in a voice-over before it has a sample, Kroma makes the sample first ("Preparing the voice … (once)").

**Delete the sample** removes the saved sample. The next time you use the voice, a new one is made, and it may sound a little different.

## Instant voices

Microsoft's free voices. They're ready in seconds and need no key and no engine, only an internet connection. For Khmer they're good for drafts. For the other languages they're the voice-over.

There are two voices, one female and one male, for each language:

| Language | Voices |
|---|---|
| Khmer · ខ្មែរ | Sreymom (female), Piseth (male) |
| Thai · ไทย | Premwadee (female), Niwat (male) |
| Vietnamese · Tiếng Việt | Hoài My (female), Nam Minh (male) |
| Lao · ລາວ | Keomany (female), Chanthavong (male) |
| English | Ava (female), Andrew (male) |
| Indonesian · Bahasa Indonesia | Gadis (female), Ardi (male) |
| Malay · Bahasa Melayu | Yasmin (female), Osman (male) |

The first time you press ▶ on an instant voice, Kroma asks Microsoft for a short sample, so it takes a moment. After that it plays straight away.

## Instant, designed or cloned?

| | Instant | Designed (preset) | Cloned |
|---|---|---|---|
| Needs | Internet only | The [voice engine](voice-engine) | The [voice engine](voice-engine) and a recording |
| Speed | Seconds | Slower | Slower |
| Languages | 7 | Made for Khmer | Made for Khmer |
| Speed slider | Yes | No | No |
| Best for | Drafts, other languages | Dramas with many characters | Your own voice |

## Importing from Khmer Voice Studio

If you also run the Khmer Voice Studio dashboard on this computer, **Import from KVS** copies its voices into Kroma.

1. Press **Import from KVS**. Kroma reads the dashboard's list ("Reading KVS…").
2. Preset voices are ticked for you. Tick the cloned voices you want too. Voices already in Kroma show "already in Kroma".
3. If you chose any cloned voice, tick the box to confirm each one is your own voice, or that you have that person's permission.
4. Press **Import**.

Kroma also brings over the dashboard's preset samples by itself, so both apps sound the same. Cloned voices always need your confirmation.

Importing needs the dashboard's database to be running and the `psql` tool. If it isn't, you'll see "Couldn't read KVS's voices (is its database running?)" or "Importing from KVS needs psql (brew install postgresql)."

## Where voices are kept

Your cloned voices and saved samples are kept on your computer, in the `Kroma Studio/voices` folder inside your Movies folder (Videos on Windows). The voice engine doesn't keep them. Kroma sends the recording along with each job.
