---
title: Style & objects
group: Making videos
section: 2
order: 5
---
This page covers how your video looks: its shape, how the subtitles look and move, and the things you place on top of the picture, like a blur over the old subtitles or your logo. The preview in the middle always shows exactly what the export will look like, because both are drawn the same way.

## Format

Open **Style**. At the top, **Format** sets the shape of the finished video:

| Format | For | Export size |
|---|---|---|
| **16:9** | YouTube, Facebook | 1920 × 1080 |
| **9:16** | TikTok, Reels | 1080 × 1920 |
| **1:1** | Feed | 1080 × 1080 |

New projects start on **16:9**. If your first video is tall, Kroma switches to **9:16** by itself. The **Export** button at the top right shows the current format, like **Export 9:16**.

You can export the same project in each format: change the format, export, change it again, export again.

### When it doesn't fit

A wide video in a tall format (or the other way round) leaves empty space. **When it doesn't fit** decides what fills it:

- **Blur**: a blurred, slightly darker copy of the video fills the space behind it. This is the usual look for a wide video in a vertical post. It's the default.
- **Bars**: black bars.
- **Crop**: the video is enlarged to fill the whole frame, and the edges are cut off.

## Subtitle style

The **Subtitle style** section changes how every subtitle looks.

### Presets

**Preset** shows 33 ready-made looks as small tiles, each drawn exactly as it will look in your exported video. Click one to use it. They come in four groups:

| Group | Presets |
|---|---|
| **Outlined** | **Classic** (white with a black outline), **Yellow**, **TikTok**, **Minimal**, **Soft shadow**, **Cinema**, **Neon**, **Pink pop**, **Lime**, **Orange** |
| **Glow** | **Gold glow**, **Fire**, **Ice**, **Magic** |
| **Khmer fonts** | **Koulen**, **Poster**, **Moul gold**, **Moul red**, **Comic**, **Battambang**, **Serif**, **Rounded**, **Handwritten**, **Karaoke** |
| **On a box** | **Dark box**, **Light box**, **White box**, **Highlight**, **Violet box**, **Red box**, **News**, **Blue box**, **Green box** |

A preset sets the whole look: the colours, outline, box, shadow and font. Your **Size**, **Position**, **Animation** and **Bilingual** setting stay as they are. You can change anything after picking one; if you change something the preset set, no preset shows as picked.

Your own saved looks show above the presets, under **My styles** (see [My styles](#my-styles)).

### Animation

**Animation** decides how each line comes in, or how its words follow the voice:

| Animation | What you see |
|---|---|
| **None** (default) | Each line just appears |
| **Fade in** | Each line fades in |
| **Pop** | Each line pops in, a little bouncy |
| **Slide up** | Each line rises into place |
| **Spoken word** | The word being said lights up (TikTok style). Pick its colour in **Spoken word colour** (yellow by default). |
| **Word by word** | Words appear as they're said |

Lines come in over about a quarter of a second. For **Spoken word** and **Word by word**, Kroma has no exact timing for each word, so it shares the line's time between its words by their length. That follows natural speech closely enough for captions.

The preview and the exported video move the same way.

### Font

**Font** sets the letters. Eight fonts come with Kroma, so Khmer always looks right, even on a computer that doesn't have them:

| Font | Look |
|---|---|
| **Kantumruy Pro** (default) | Clear and modern |
| **Koulen** | Bold poster letters |
| **Bayon** | Heavy and loud |
| **Moul** | Traditional title letters |
| **Battambang** | Plain and easy to read |
| **Hanuman** | Serif, like a book |
| **Dangrek** | Rounded and friendly |
| **Fasthand** | Handwritten |

### All the settings

| Setting | What it does | Default |
|---|---|---|
| **Size** | Text size, from 2.5% to 10% of the frame's shorter side | 5.2% |
| **Position** | How far down the screen the subtitles sit, from 20% to 98% (the bottom of the text sits here) | 90% |
| **Outline** | Thickness of the outline around each letter, from **Off** to 25 | 12 |
| **Shadow** | A soft shadow under the text, from **Off** to 50 | Off |
| **Shadow colour** | Shown when there's a shadow. Dark drops a shadow; a bright colour makes a glow | Black |
| **Text colour** | The colour of the letters | White |
| **Outline colour** | The colour of the outline | Black |
| **Bold** | Thicker letters | On |
| **Dark box behind the text** | A rounded dark box behind each line, easy to read on busy pictures | Off |
| **Bilingual** | Shows the original line (for example the Chinese) above the translation, smaller and in pale yellow | Off |

For the colours, click the swatch to open the colour picker.

Long lines wrap onto two lines, breaking only between words. When the second line would be very short, Kroma evens the two lines out.

The style is saved with the project. Once you change it, the **Style** step in the status bar turns green. Projects from before 0.1.13 keep exactly the look they had.

### My styles

Found a look you like? Keep it for every project:

1. Under the settings, press **Save as my style**.
2. Give it a name (up to 40 characters) and save it.

It keeps the whole look: font, colours, outline, shadow, size, position and animation. It shows first under **Preset**, in **My styles**, in every project, and in the **Subtitle style** step of [Batch](batch). Picking it keeps the project's own **Bilingual** setting.

When the current look is already saved, the row says so: *This look is saved as "…"*. To delete one, point at its tile and press its delete button. Projects that use it keep their look.

My styles are kept in `my-styles.json` in Kroma's settings folder.

## Hide original subtitles

Many videos, especially Chinese dramas, have subtitles burned into the picture. Your new subtitles would sit on top of them and be hard to read. Kroma can find them and blur them for you:

1. Open **Objects**.
2. Press **Hide original subtitles**. It says **Looking for burned-in subtitles…** while it works.

Kroma looks at about 30 frames across the video for the strip in the lower part of the picture where text keeps coming back, and puts a blur box exactly over it, for the whole video. The box follows the picture, so it's in the right place whether the video uses **Blur**, **Bars** or **Crop**.

- **Found**: *Covered the burned-in subtitles* The box is selected, so you can fine-tune it: drag it, drag its corner, or change **Blur** (30 to start with).
- **None found**: *No burned-in subtitles found* Kroma still adds a box where subtitles usually are, so you can move it, or delete it.

Pressing it again replaces the box it placed before. It works on the first video on the timeline.

To do this for a whole series, turn on **Hide original subtitles** in [Batch](batch). Covers made by Kroma keep the hidden subtitles blurred too.

## Objects

**Objects** lets you place things on top of the video. Your subtitles always stay above them.

Under **Add to the video**:

| Button | What you get |
|---|---|
| **Hide original subtitles** | Finds the burned-in subtitles and blurs them (see above) |
| **Blur area** | A blur box in the middle of the picture, to hide a watermark, a face or a number plate |
| **Image** | Your logo or a sponsor's, from a `.png`, `.jpg`, `.jpeg`, `.webp` or `.gif` file. It starts in the top right corner. |
| **Text** | A short line of text, like a call to action. It starts in the top left, saying "Sponsored by …". |

The buttons are greyed out until there's a video on the timeline.

### Moving and resizing

On the preview:

- Click an object to select it. It gets a dashed white outline.
- Drag it to move it.
- Drag the round handle at its bottom right corner to resize it.

Images keep their shape when you resize them. For text, making the box taller makes the letters bigger; the width follows the text.

### Object settings

When an object is selected, its settings show at the bottom of the **Objects** panel:

| Setting | For | What it does |
|---|---|---|
| **Blur** | Blur boxes | How strong the blur is, from 2 to 40 |
| **Opacity** | Images and text | How see-through it is, from 10% to 100% |
| **Text** | Text | The words to show |
| **Colours** | Text | Two swatches: the text colour, then the background colour |
| **Background** | Text | A rounded box behind the text. Off, the text gets a thin dark outline instead. |
| **Bold** | Text | Thicker letters |
| **Whole video** | All | On: shown for the whole video |

### Showing an object for part of the video

Every object starts out shown for the whole video. To show it only for a while:

1. Select the object.
2. Turn off **Whole video**. It now starts where the playhead is, and lasts until the end. The switch shows the times, like *Shown 00:10 → end*.
3. Move the playhead and press **Start here** or **End here** under **Timing**.

### The list of objects

**On the video** lists every object you've added. Click a name to select it. Use the eye button to **Hide** or **Show** an object (hidden ones aren't exported), and the bin to **Delete** it. You can also select an object and press `Delete`.
