"""Text-to-speech + voice cloning with VoxCPM2."""
import tempfile
import threading

import numpy as np
import soundfile as sf

from . import config
from .audio_utils import concat, silence
from .text_utils import chunk_text, split_pauses

_lock = threading.Lock()
_model = None


def get_model():
    global _model
    if _model is None:
        from voxcpm import VoxCPM
        from voxcpm.model.utils import resolve_runtime_device

        device = resolve_runtime_device(config.TTS_DEVICE)
        print(f"[TTS] Loading {config.TTS_MODEL} on {device} (first time downloads ~5 GB)...")
        _model = VoxCPM.from_pretrained(
            config.TTS_MODEL,
            load_denoiser=False,
            device=device,
            optimize=(device.startswith("cuda")),  # torch.compile only helps on NVIDIA
        )
        print("[TTS] Ready.")
    return _model


def sample_rate():
    return get_model().tts_model.sample_rate


def _style_prefix(style):
    style = (style or "").strip().strip("()")
    return f"({style})" if style else ""


def _gen(text, ref=None, prompt_wav=None, prompt_text=None, style="", design=""):
    """One generation. A designed voice's description and the line's style both go in the prefix, so a styled first
    line of a designed voice (the one its later lines are anchored on) keeps its style.

    >>> import numpy as np, studio.tts as T
    >>> class Stub:
    ...     def generate(self, **k): seen.append(k["text"]); return np.ones(10, dtype=np.float32)
    >>> real, seen = (T._model, T.sample_rate), []
    >>> T._model, T.sample_rate = Stub(), (lambda: 10)
    >>> whisper = [{"type": "line", "speaker": "S", "text": t, "style": "whisper"} for t in ("hello", "again")]
    >>> cues = T.synthesize_dialogue(whisper, {"S": ({"name": "s", "design": "old man"}, "")})[2]
    >>> seen   # a per-line style never becomes the anchor, so both styled lines come from the design
    ['(old man, whisper)hello', '(old man, whisper)again']
    >>> seen.clear(); _ = T.redo_line(np.zeros(30, dtype=np.float32), 10, [(0.0, 1.0, "S: hi")], 0,
    ...     dict(whisper[0], text="hi"), {"S": ({"name": "s", "design": "girl"}, "sad")})
    >>> seen   # no other line to anchor on: designed fresh, with the line's style
    ['(girl, whisper)hi']
    >>> T._model, T.sample_rate = real
    """
    model = get_model()
    prefix = _style_prefix(", ".join(x.strip().strip("()") for x in (design, style) if x and x.strip().strip("()")))
    text = text.replace("\u200b", "")  # Khmer word-break marks are for line breaking, not speech
    kwargs = dict(text=prefix + text, cfg_value=config.TTS_CFG, inference_timesteps=config.TTS_STEPS)
    if ref:
        kwargs["reference_wav_path"] = ref
    if prompt_wav and prompt_text:
        kwargs["prompt_wav_path"] = prompt_wav
        kwargs["prompt_text"] = prompt_text
    with _lock:
        wav = model.generate(**kwargs)
    return np.asarray(wav, dtype=np.float32)


class VoiceSession:
    """Keeps one voice consistent across many chunks.
    For designed voices, the first chunk spoken in the session's own style becomes the reference for the rest; a
    chunk spoken with a per-line style (`self.style` swapped) before that is designed but never becomes the anchor,
    so the speaker's own style stays the default for their other lines.

    >>> import numpy as np, studio.tts as T
    >>> class Stub:
    ...     def generate(self, **k): seen.append((k["text"], k.get("prompt_text"))); return np.ones(10, dtype=np.float32)
    >>> real, seen = (T._model, T.sample_rate), []
    >>> T._model, T.sample_rate = Stub(), (lambda: 10)
    >>> items = [{"type": "line", "speaker": "S", "text": t, "style": st} for t, st in (("a", "whisper"), ("b", None), ("c", None))]
    >>> _ = T.synthesize_dialogue(items, {"S": ({"name": "s", "design": "old man"}, "")})
    >>> seen   # the whispered 'a' is not the anchor: 'b' is designed (and anchors), 'c' clones 'b'
    [('(old man, whisper)a', None), ('(old man)b', None), ('c', 'b')]
    >>> T._model, T.sample_rate = real
    """

    def __init__(self, voice, style=""):
        self.voice = voice or {"name": "(default)"}
        self.style = style
        self.default_style = style  # the speaker's own style; only a chunk spoken in it may become the anchor
        self.anchor = None  # (wav_path, text)

    def say(self, text):
        v = self.voice
        if v.get("ref"):
            t = v.get("transcript") or None
            return _gen(text, ref=v["ref"], prompt_wav=v["ref"] if t else None, prompt_text=t, style=self.style)
        if self.anchor:
            path, atext = self.anchor
            return _gen(text, ref=path, prompt_wav=path, prompt_text=atext, style=self.style)
        audio = _gen(text, design=v.get("design", ""), style=self.style)
        if self.style != self.default_style:  # a per-line style override is never the voice's anchor
            return audio
        # anchor so the next chunks keep this same voice
        path = tempfile.mktemp(suffix=".wav")
        sf.write(path, audio, sample_rate())
        self.anchor = (path, text)
        return audio


# Seconds of GPU time per character of text, learned from every part spoken (starts at a cautious guess for Apple
# Silicon; CUDA corrects it after the first part). One generation can't report its own progress, so while a part is
# spoken the bar moves by this estimate instead of standing still for a minute.
_SECONDS_PER_CHAR = 1.2


def say_with_progress(sess, text, progress=None, start=0.0, end=1.0, label="Speaking"):
    """`sess.say(text)` while the bar moves from `start` towards `end` by the learned speed (never past 90 % of the
    span until the part is really done), with "about N s left"; then learns the real speed for the next part."""
    import threading
    import time as _time

    global _SECONDS_PER_CHAR
    if not progress:
        return sess.say(text)
    chars = max(1, len(text.replace("\u200b", "")))
    expected = max(3.0, chars * _SECONDS_PER_CHAR)
    began = _time.monotonic()
    done = threading.Event()

    def tick():
        while not done.wait(1.0):
            spent = _time.monotonic() - began
            share = min(0.9, spent / expected)
            left = max(1, int(round(expected - spent)))
            hint = f" · about {left} s left" if spent < expected else " · almost done"
            progress(start + (end - start) * share, desc=label + hint)

    progress(start, desc=label)
    ticker = threading.Thread(target=tick, daemon=True)
    ticker.start()
    try:
        return sess.say(text)
    finally:
        done.set()
        ticker.join(timeout=2)
        took = _time.monotonic() - began
        _SECONDS_PER_CHAR = 0.7 * _SECONDS_PER_CHAR + 0.3 * (took / chars)
        progress(end, desc=label)


def synthesize(text, voice, style="", progress=None, gap=0.35, para_gap=0.8):
    """Long-text TTS. Returns (audio, sr, cues) where cues = [(start, end, text)] for SRT."""
    paragraphs = chunk_text(text, config.MAX_CHUNK_CHARS)
    total = sum(len(p) for p in paragraphs)
    if total == 0:
        raise ValueError("Please enter some text.")
    sess = VoiceSession(voice, style)
    sr = sample_rate()
    parts, cues, t, n = [], [], 0.0, 0
    for pi, para in enumerate(paragraphs):
        if pi:
            parts.append(silence(para_gap, sr))
            t += para_gap
        for ci, chunk in enumerate(para):
            if ci:
                parts.append(silence(gap, sr))
                t += gap
            a = say_with_progress(sess, chunk, progress, n / total, (n + 1) / total, f"Speaking part {n + 1}/{total}")
            n += 1
            parts.append(a)
            cues.append((t, t + len(a) / sr, chunk))
            t += len(a) / sr
    if progress:
        progress(1.0, desc=f"Spoke {n}/{total} parts")
    return np.concatenate(parts), sr, cues


def splice(base, sr, cues, index, new):
    """Put `new` audio in place of cue `index` of `base`; later cues move by the change in length. Pure (numpy only).

    >>> import numpy as np
    >>> base = np.ones(10, dtype=np.float32); cues = [(0.0, 0.4, "a"), (0.5, 0.7, "b"), (0.8, 1.0, "c")]
    >>> audio, out = splice(base, 10, cues, 1, np.zeros(4, dtype=np.float32))
    >>> len(audio), out
    (12, [(0.0, 0.4, 'a'), (0.5, 0.9, 'b'), (1.0, 1.2, 'c')])
    >>> splice(base, 10, cues, 3, base)
    Traceback (most recent call last):
    ValueError: This story has no line 4.
    """
    if not 0 <= index < len(cues):
        raise ValueError(f"This story has no line {index + 1}.")
    s, e = int(round(cues[index][0] * sr)), int(round(cues[index][1] * sr))
    new = np.asarray(new, dtype=np.float32)
    shift = (len(new) - (e - s)) / sr
    audio = np.concatenate([base[:s], new, base[e:]])
    out = []
    for i, (cs, ce, text) in enumerate(cues):
        if i == index:
            ce = cs + len(new) / sr
        elif i > index:
            cs, ce = cs + shift, ce + shift
        out.append((round(cs, 3), round(ce, 3), text))
    return audio, out


def _as_items(lines):
    """parse_story items as they are; old `(speaker, text)` tuples become line items."""
    return [i if isinstance(i, dict) else {"type": "line", "speaker": i[0], "text": i[1], "style": None} for i in lines]


def _cue_text(speaker, text):
    """'Speaker: text' with the [pause] tokens taken out (the Narrator without a prefix)."""
    spoken = " ".join(p for p in split_pauses(text) if isinstance(p, str))
    return spoken if speaker == "Narrator" else f"{speaker}: {spoken}"


def _trim_edges(audio, sr, start, end, top_db=40.0, keep=0.05):
    """`audio` without the near-silent run at its start and/or end (quieter than `top_db` under its peak), keeping
    `keep` seconds. The voice model pads what it says with silence; next to an inline [pause] that padding would make
    the pause longer than asked.

    >>> import numpy as np
    >>> a = np.concatenate([np.zeros(50), np.ones(20), np.zeros(30)]).astype(np.float32)
    >>> len(_trim_edges(a, 100, True, True)), len(_trim_edges(a, 100, False, True)), len(_trim_edges(a, 100, True, False))
    (30, 75, 55)
    >>> len(_trim_edges(np.zeros(10, dtype=np.float32), 100, True, True))
    10
    """
    loud = np.flatnonzero(np.abs(audio) > (np.max(np.abs(audio)) if len(audio) else 0) * 10 ** (-top_db / 20))
    if not len(loud) or not np.max(np.abs(audio)):
        return audio
    pad = int(keep * sr)
    first = max(0, loud[0] - pad) if start else 0
    last = min(len(audio), loud[-1] + 1 + pad) if end else len(audio)
    return audio[first:last]


def _speak_line(sess, item, sr, progress, lo, hi, label):
    """One line's audio: each text part in chunks (0.25 s between chunks), parts joined by their inline pause (the
    speech's own silence next to a pause is trimmed, so the pause is as long as written)."""
    pieces = split_pauses(item["text"])
    chunks = [[c for para in chunk_text(p, config.MAX_CHUNK_CHARS) for c in para] if isinstance(p, str) else p
              for p in pieces]
    total = sum(len(c) for c in chunks if isinstance(c, list)) or 1
    default, n, out = sess.style, 0, []
    if item.get("style"):
        sess.style = item["style"]
    try:
        for k, c in enumerate(chunks):
            if not isinstance(c, list):
                out.append(silence(c, sr))
                continue
            sub = []
            for chunk in c:
                sub.append(say_with_progress(sess, chunk, progress, lo + (hi - lo) * n / total,
                                             lo + (hi - lo) * (n + 1) / total, label))
                n += 1
            spoken = concat(sub, sr, gap=0.25)
            before = k > 0 and not isinstance(chunks[k - 1], list)
            after = k + 1 < len(chunks) and not isinstance(chunks[k + 1], list)
            out.append(_trim_edges(spoken, sr, before, after) if before or after else spoken)
    finally:
        sess.style = default
    return np.concatenate(out) if out else np.zeros(0, dtype=np.float32)


def synthesize_dialogue(lines, speaker_voices, progress=None, gap=0.45):
    """lines = parse_story items (line and own-line pause dicts; old `(speaker, text)` tuples still work),
    speaker_voices = {speaker: (voice_spec, style)}.

    Timing (a stub voice that says 1 s of sound for any text, at 10 samples a second):

    >>> import numpy as np, studio.tts as T
    >>> real = T.say_with_progress, T.sample_rate
    >>> T.say_with_progress, T.sample_rate = (lambda sess, text, *a, **k: np.ones(10, dtype=np.float32)), (lambda: 10)
    >>> A, B = ({"type": "line", "speaker": s, "text": t, "style": None} for s, t in (("A", "x"), ("B", "y")))
    >>> pause = {"type": "pause", "seconds": 2.0}
    >>> T.synthesize_dialogue([pause, A, B], {})[2]
    [(2.0, 3.0, 'A: x'), (3.45, 4.45, 'B: y')]
    >>> T.synthesize_dialogue([A, pause, B], {})[2]
    [(0.0, 1.0, 'A: x'), (3.0, 4.0, 'B: y')]
    >>> audio, sr, cues = T.synthesize_dialogue([dict(A, text="x [pause 1s] y")], {})
    >>> cues, len(audio)
    ([(0.0, 3.0, 'A: x y')], 30)
    >>> T.synthesize_dialogue([("Narrator", "x [pause] y")], {})[2]
    [(0.0, 3.0, 'x y')]
    >>> T.synthesize_dialogue([A, pause, dict(pause, seconds=1.0), B], {})[2]
    [(0.0, 1.0, 'A: x'), (4.0, 5.0, 'B: y')]
    >>> T.say_with_progress, T.sample_rate = real
    """
    items = _as_items(lines)
    count = sum(1 for i in items if i["type"] == "line")
    sessions = {}
    sr = sample_rate()
    parts, cues, t, n, after_pause = [], [], 0.0, 0, True
    for item in items:
        if item["type"] == "pause":  # an own-line pause takes the place of the gap between lines
            parts.append(silence(item["seconds"], sr))
            t += item["seconds"]
            after_pause = True
            continue
        spk = item["speaker"]
        if spk not in sessions:
            voice, style = speaker_voices.get(spk, ({"name": "(default)"}, ""))
            sessions[spk] = VoiceSession(voice, style)
        a = _speak_line(sessions[spk], item, sr, progress, n / count, (n + 1) / count, f"Line {n + 1}/{count} ({spk})")
        if not after_pause:
            parts.append(silence(gap, sr))
            t += gap
        parts.append(a)
        cues.append((round(t, 3), round(t + len(a) / sr, 3), _cue_text(spk, item["text"])))
        t += len(a) / sr
        n, after_pause = n + 1, False
    if progress:
        progress(1.0, desc=f"Spoke {count}/{count} lines")
    return (np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)), sr, cues


def redo_line(base, sr, cues, index, item, speaker_voices, progress=None, lines=None):
    """Speak one story line again (`item` from parse_story) and splice it into `base` in place of cue `index`.
    Returns (audio, sr, cues). A voice without a reference recording (a designed one) is anchored on another line of
    the same speaker cut from `base` (the shortest one spoken in the speaker's own style, i.e. without a per-line style),
    so it keeps sounding the same; with no such line it is designed fresh.
    `lines` are the script's line items, one per cue: they name each cue's speaker and per-line style; without them
    the speaker is read from the cue text and every line counts as unstyled.

    With a stub model (1 s of sound, 10 samples a second) that notes what each call was given:

    >>> import numpy as np, studio.tts as T
    >>> real, calls = (T._gen, T.sample_rate), []
    >>> T._gen, T.sample_rate = (lambda text, **k: calls.append((text, k)) or np.ones(10, dtype=np.float32)), (lambda: 10)
    >>> designed = {"A": ({"name": "a", "design": "old man"}, ""), "B": ({"name": "b", "design": "girl"}, "")}
    >>> base, cues = np.zeros(40, dtype=np.float32), [(0.0, 1.0, "A: x"), (1.5, 2.5, "B: y"), (3.0, 4.0, "A: z")]
    >>> line = {"type": "line", "speaker": "A", "text": "new [pause 0.5s] words", "style": "sad"}
    >>> audio, sr, out = T.redo_line(base, 10, cues, 2, line, designed)
    >>> out, len(audio)
    ([(0.0, 1.0, 'A: x'), (1.5, 2.5, 'B: y'), (3.0, 5.5, 'A: new words')], 55)
    >>> [(text, k["prompt_text"], k["style"]) for text, k in calls]   # anchored on A's first line: same voice
    [('new', 'x', 'sad'), ('words', 'x', 'sad')]
    >>> calls.clear(); out = T.redo_line(base, 10, cues, 1, dict(line, speaker="B", text="hi"), designed)[2]
    >>> [(text, k.get("design"), k.get("prompt_text")) for text, k in calls[:1]]   # B has no other line: designed fresh
    [('hi', 'girl', None)]
    >>> cues5 = cues + [(4.5, 5.0, "A: w"), (5.5, 5.8, "A: v")]
    >>> script = [dict(line, text=t[3:], speaker=t[0], style=st) for t, st in zip([c[2] for c in cues5],
    ...     (None, None, None, None, "whisper"))]
    >>> calls.clear(); _ = T.redo_line(np.zeros(60, dtype=np.float32), 10, cues5, 0, script[0], designed, lines=script)
    >>> [k["prompt_text"] for _, k in calls]   # shortest unstyled other A line ('w'), not the shorter whispered 'v'
    ['w']
    >>> T.redo_line(base, 10, cues, 3, line, designed)
    Traceback (most recent call last):
    ValueError: This story has no line 4.
    >>> T._gen, T.sample_rate = real
    """
    if not 0 <= index < len(cues):
        raise ValueError(f"This story has no line {index + 1}.")
    if sr != sample_rate():
        raise ValueError("The story to redo was made by a different voice model.")
    spk = item["speaker"]
    voice, style = speaker_voices.get(spk, ({"name": "(default)"}, ""))
    sess = VoiceSession(voice, style)
    if not sess.voice.get("ref"):
        aligned = lines if lines and len(lines) == len(cues) else None
        speakers = [i["speaker"] for i in aligned] if aligned else None
        others = [k for k, c in enumerate(cues) if k != index and _cue_speaker(c[2], k, speakers, speaker_voices) == spk
                  and not (aligned and aligned[k].get("style"))]
        if others:
            k = min(others, key=lambda k: cues[k][1] - cues[k][0])  # shortest: least to clone, first on a tie
            text = cues[k][2]
            if spk != "Narrator" and text.startswith(f"{spk}: "):
                text = text[len(spk) + 2:]
            path = tempfile.mktemp(suffix=".wav")
            sf.write(path, base[int(round(cues[k][0] * sr)):int(round(cues[k][1] * sr))], sr)
            sess.anchor = (path, text)
    new = _speak_line(sess, item, sr, progress, 0.0, 1.0, f"Line {index + 1} ({spk})")
    audio, out = splice(base, sr, cues, index, new)
    out[index] = (out[index][0], out[index][1], _cue_text(spk, item["text"]))
    if progress:
        progress(1.0, desc=f"Spoke line {index + 1}")
    return audio, sr, out


def _cue_speaker(text, k, speakers, speaker_voices):
    """Who says cue k: from `speakers` when given, else the 'Name: ' prefix of a known speaker, else the Narrator."""
    if speakers and k < len(speakers):
        return speakers[k]
    for name in speaker_voices:
        if name != "Narrator" and text.startswith(f"{name}: "):
            return name
    return "Narrator"
