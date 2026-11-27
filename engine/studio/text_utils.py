"""Text splitting for long stories (Khmer-aware)."""
import re

# Khmer sentence enders ។ ៕ plus ! ? and "." followed by a space
_SENT_END = re.compile(r"(?<=[។៕!?！？。\n])|(?<=\.)(?=\s)")


def split_sentences(text):
    parts = [p.strip() for p in _SENT_END.split(text) if p and p.strip()]
    return parts


def split_long(sentence, max_chars):
    """Khmer usually has spaces only between phrases; split on spaces/commas."""
    if len(sentence) <= max_chars:
        return [sentence]
    pieces, cur = [], ""
    for tok in re.split(r"(\s+|,|،|、)", sentence):
        if len(cur) + len(tok) > max_chars and cur.strip():
            pieces.append(cur.strip())
            cur = tok
        else:
            cur += tok
    if cur.strip():
        pieces.append(cur.strip())
    # last resort: hard cut very long runs with no spaces
    out = []
    for p in pieces:
        while len(p) > max_chars * 1.5:
            out.append(p[:max_chars])
            p = p[max_chars:]
        out.append(p)
    return out


def chunk_text(text, max_chars=180):
    """Split text into TTS-friendly chunks. Paragraph breaks are kept as markers."""
    chunks = []
    for para in re.split(r"\n\s*\n", text.strip()):
        para_chunks = []
        for s in split_sentences(para.replace("\n", " ")):
            para_chunks += split_long(s, max_chars)
        # merge very short neighbours so the voice flows naturally
        merged = []
        for c in para_chunks:
            short = len(merged[-1]) + len(c) < max_chars * 0.6 if merged else False
            tiny = len(c) < 12 and merged and len(merged[-1]) + len(c) <= max_chars * 1.2
            if short or tiny:
                merged[-1] = merged[-1] + " " + c
            else:
                merged.append(c)
        if merged:
            chunks.append(merged)
    return chunks  # list of paragraphs, each a list of chunks


_PAUSE = re.compile(r"\[pause(?:\s+(\d+(?:\.\d+)?)\s*(ms|s)?)?\]", re.I)
_SPEAKER = re.compile(r"^([^:：៖()]{1,30}?)\s*(?:\(([^)]{1,40})\))?\s*[:：៖]\s*(.+)$")


def _pause_seconds(number, unit):
    """Seconds of one pause token, kept between 0.1s and 10s; a bare [pause] is 1s."""
    if number is None:
        return 1.0
    seconds = float(number) / (1000 if (unit or "s").lower() == "ms" else 1)
    return min(10.0, max(0.1, seconds))


def split_pauses(text):
    """Cut a line's text at its [pause] tokens: text parts (stripped, non-empty) and pause seconds, in order.
    [pause] is 1s, [pause 0.5s] / [pause 500ms] are explicit; lengths are kept between 0.1s and 10s.

    >>> split_pauses("Hi [pause 0.5s] there [PAUSE]")
    ['Hi', 0.5, 'there', 1.0]
    >>> split_pauses("[pause 500ms]"), split_pauses("[pause 99s]"), split_pauses("[pause 0s]")
    ([0.5], [10.0], [0.1])
    >>> split_pauses("[pause ២s]")   # Khmer digits count too (Python's \\d), as in the web editor
    [2.0]
    """
    out, pos = [], 0
    for m in _PAUSE.finditer(text):
        part = text[pos:m.start()].strip()
        if part:
            out.append(part)
        out.append(_pause_seconds(m.group(1), m.group(2)))
        pos = m.end()
    tail = text[pos:].strip()
    if tail:
        out.append(tail)
    return out


def parse_story(script):
    r"""Parse a story script into items: {"type": "line", "speaker", "text", "style"} for each spoken line and
    {"type": "pause", "seconds"} for a line that is only [pause] tokens. A line looks like 'Narrator: text' or
    'Sokha (whisper): text'; lines without a speaker use 'Narrator'. Inline pauses stay inside the line's text.

    >>> parse_story("Narrator: Once.\n[pause 2s]\nSokha (whisper): Grandpa?\nplain")
    [{'type': 'line', 'speaker': 'Narrator', 'text': 'Once.', 'style': None}, {'type': 'pause', 'seconds': 2.0}, {'type': 'line', 'speaker': 'Sokha', 'text': 'Grandpa?', 'style': 'whisper'}, {'type': 'line', 'speaker': 'Narrator', 'text': 'plain', 'style': None}]
    >>> parse_story("Sokha: [pause 2s]")
    [{'type': 'pause', 'seconds': 2.0}]
    """
    items = []
    for raw in script.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        speaker, style, text = "Narrator", None, raw
        m = _SPEAKER.match(raw)
        if m and not re.match(r"^https?$", m.group(1).strip(), re.I):
            speaker, style, text = m.group(1).strip(), (m.group(2) or "").strip() or None, m.group(3).strip()
        if all(isinstance(p, float) for p in split_pauses(text)):
            items += [{"type": "pause", "seconds": p} for p in split_pauses(text)]
        else:
            items.append({"type": "line", "speaker": speaker, "text": text, "style": style})
    return items


def parse_script(script):
    r"""Parse a dialogue script with lines like 'Narrator: text' or 'សុខា៖ text'.
    Returns list of (speaker, text). Lines without a speaker use 'Narrator'. Styles and pauses are dropped.

    >>> parse_script("សុខា (ខ្សឹប)៖ លោកតា!\n[pause]")
    [('សុខា', 'លោកតា!')]
    """
    return [(i["speaker"], i["text"]) for i in parse_story(script) if i["type"] == "line"]


ZWSP = "\u200b"


def khmer_word_breaks(text):
    """Spaces between Khmer words (what NLLB and the Khmer Whisper write) become zero-width spaces: Khmer is written
    without spaces, but the line breaker of burnt-in subtitles may still break there, between whole words. A space
    after ។ / ៕ (a sentence end) stays a space.

    >>> khmer_word_breaks("ថ្ងៃ នេះ យើង នឹង ធ្វើ។ ឆ្ងាញ់ ណាស់ Phnom Penh") == "ថ្ងៃ\u200bនេះ\u200bយើង\u200bនឹង\u200bធ្វើ។ ឆ្ងាញ់\u200bណាស់ Phnom Penh"
    True
    """
    return re.sub(r"(?<=[\u1780-\u17D3\u17DD]) +(?=[\u1780-\u17D3])", ZWSP, text)

