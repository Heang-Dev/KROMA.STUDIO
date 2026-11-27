"""SRT read/write helpers."""
import re


def ts(seconds):
    seconds = max(0.0, float(seconds))
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def parse_ts(s):
    h, m, rest = s.strip().replace(".", ",").split(":")
    sec, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


def wrap(text, width=42):
    """Split long cue text into max 2 lines: on the space nearest the middle, else (Khmer, written without spaces)
    between two letter clusters near the middle, so a burnt-in line never runs off the picture.

    >>> top, bottom = wrap("ថ្ងៃនេះយើងនឹងរៀនពីវិធីធ្វើម្ហូបដ៏ងាយស្រួលមួយមុននឹងលាងអង្ករជាមួយទឹកស្អាត").split(chr(10))
    >>> top, bottom
    ('ថ្ងៃនេះយើងនឹងរៀនពីវិធីធ្វើម្ហូបដ៏ងា', 'យស្រួលមួយមុននឹងលាងអង្ករជាមួយទឹកស្អាត')
    """
    if len(text) <= width:
        return text
    mid = len(text) // 2
    spaces = [i for i, c in enumerate(text) if c == " "]
    if spaces:
        cut = min(spaces, key=lambda i: abs(i - mid))
        return text[:cut].strip() + "\n" + text[cut:].strip()
    cut = _cluster_start(text, mid)
    return text[:cut] + "\n" + text[cut:] if 0 < cut < len(text) else text


def _cluster_start(text, i):
    """The nearest place at or after `i` that starts a Khmer letter cluster, so a cut never leaves a vowel sign or a
    subscript consonant (after the coeng ្) at the start of the next piece.

    >>> text = "សាលារៀន"
    >>> text[:_cluster_start(text, 1)], text[:_cluster_start(text, 4)], text[:_cluster_start(text, 5)]
    ('សា', 'សាលា', 'សាលារៀ')
    """
    while 0 < i < len(text) and ("\u17B6" <= text[i] <= "\u17D3" or text[i] == "\u17DD" or text[i - 1] == "\u17D2"):
        i += 1
    return i


def split_cue(start, end, text, max_chars=84):
    """Break a long cue into several shorter ones, time-split by character count."""
    if len(text) <= max_chars:
        return [(start, end, text)]
    words = text.split(" ")
    pieces, cur = [], ""
    for w in words:
        if cur and len(cur) + len(w) + 1 > max_chars:
            pieces.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        pieces.append(cur)
    if len(pieces) == 1:  # no spaces (common in Khmer)
        n = -(-len(text) // max_chars)
        size = -(-len(text) // n)
        pieces, at = [], 0
        while at < len(text):
            cut = _cluster_start(text, min(len(text), at + size))
            pieces.append(text[at:cut])
            at = cut
    total = sum(len(p) for p in pieces)
    out, t = [], start
    for p in pieces:
        d = (end - start) * len(p) / total
        out.append((t, t + d, p))
        t += d
    return out


def to_srt(cues, max_chars=84):
    lines, i = [], 1
    for start, end, text in cues:
        text = (text or "").strip()
        if not text:
            continue
        for s, e, t in split_cue(start, end, text, max_chars):
            lines.append(f"{i}\n{ts(s)} --> {ts(e)}\n{wrap(t)}\n")
            i += 1
    return "\n".join(lines)


def from_srt(srt):
    cues = []
    for block in re.split(r"\n\s*\n", srt.strip()):
        rows = block.strip().splitlines()
        if len(rows) >= 2 and "-->" in rows[1]:
            a, b = rows[1].split("-->")
            cues.append((parse_ts(a), parse_ts(b), " ".join(rows[2:]).strip()))
        elif len(rows) >= 1 and "-->" in rows[0]:
            a, b = rows[0].split("-->")
            cues.append((parse_ts(a), parse_ts(b), " ".join(rows[1:]).strip()))
    return cues


def write_srt(cues, path):
    with open(path, "w", encoding="utf-8") as f:
        f.write(to_srt(cues))
    return str(path)


def _ass_ts(seconds):
    cs = int(round(max(0.0, seconds) * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    sec, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{sec:02d}.{cs:02d}"


_KHMER_MARKS = ("\u17B6", "\u17D3")


def _advance(ch, prev=""):
    """Roughly how wide a character draws, in font sizes: Khmer vowel signs and the consonant after a coeng (្) stack
    on their base letter and take no width of their own."""
    if prev == "\u17D2" or _KHMER_MARKS[0] <= ch <= _KHMER_MARKS[1] or ch == "\u17DD" or ch == "\u200b":
        return 0.0
    # Measured with libass + the burn-in font (Khmer Sangam MN / Khmer OS): a Khmer base letter draws ~0.80 of the
    # font size, CJK ~0.75, Latin ~0.5.
    o = ord(ch)
    if 0x1780 <= o <= 0x17FF:
        return 0.80
    if 0x3000 <= o <= 0x9FFF or 0xAC00 <= o <= 0xD7AF or 0xFF00 <= o <= 0xFFEF:
        return 0.75
    if ch == " ":
        return 0.28
    return 0.5


def visual_width(text):
    """How wide `text` draws, in font sizes (see `_advance`).

    >>> round(visual_width("សួស្តី"), 2), visual_width("ab")  # two base letters; the rest stack on them
    (1.6, 1.0)
    """
    total, prev = 0.0, ""
    for ch in text:
        total += _advance(ch, prev)
        prev = ch
    return total


def _tokens(text):
    """Break points: after spaces and Khmer full stops (។), and inside a long run without them, between clusters."""
    parts = re.findall(r"[^ ។\u200b]+[ ។\u200b]*|[ ។\u200b]+", text)
    out = []
    for part in parts:
        if visual_width(part) <= 6 or " " in part.strip():
            out.append(part)
            continue
        i = 0
        while i < len(part):
            j = _cluster_start(part, i + 1)
            out.append(part[i:j])
            i = j
    return out


def fit_lines(text, capacity):
    """`text` packed into lines no wider than `capacity` font sizes.

    >>> [x.replace("\u200b", "") for x in fit_lines("ថ្ងៃ\u200bនេះ\u200bយើង\u200bនឹង\u200bរៀន\u200bពី\u200bវិធី\u200bធ្វើ\u200bម្ហូប", 5)]
    ['ថ្ងៃនេះយើងនឹង', 'រៀនពីវិធីធ្វើ', 'ម្ហូប']
    """
    lines, cur = [], ""
    for tok in _tokens(text):
        if cur and visual_width((cur + tok).rstrip()) > capacity:
            lines.append(cur.strip(" \u200b"))
            cur = tok.lstrip(" \u200b")
        else:
            cur += tok
    if cur.strip(" \u200b"):
        lines.append(cur.strip(" \u200b"))
    return lines


def write_ass(cues, path, font="Khmer OS", size=20, width=1920, height=1080):
    """ASS subtitles for burning in (lets ffmpeg shape Khmer script correctly). Lines are packed to fit the picture's
    width by how wide the script really draws, at most two lines per subtitle; a longer cue becomes several subtitles
    sharing its time by length, so nothing runs off the edges."""
    # Sized by the shorter side, so a vertical (9:16) video does not get giant text.
    fs = max(16, int(min(width, height) * 0.06 * size / 20))
    margin = max(20, int(width * 0.05))
    capacity = max(6.0, (width - 2 * margin) / fs * 0.92)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{fs},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,{max(2, fs // 14)},0,2,{margin},{margin},{int(height * 0.06)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    rows = []
    for start, end, text in cues:
        text = (text or "").strip()
        if not text:
            continue
        lines = fit_lines(text, capacity)
        pages = [lines[i:i + 2] for i in range(0, len(lines), 2)]
        weights = [max(1e-6, sum(visual_width(x) for x in page)) for page in pages]
        t, total = float(start), sum(weights)
        for page, wgt in zip(pages, weights):
            t_end = t + (float(end) - float(start)) * wgt / total
            body = "\\N".join(page).replace("{", "(").replace("}", ")")
            rows.append(f"Dialogue: 0,{_ass_ts(t)},{_ass_ts(t_end)},Default,,0,0,0,,{body}")
            t = t_end
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + "\n".join(rows) + "\n")
    return str(path)
