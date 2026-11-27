"""Self-check for translation and the resume cache (no internet, no models, no pytest).

NLLB, Google Translate and MyMemory are replaced by fakes, time by a fake clock, so this covers: NLLB first (batches,
order, the NLLB codes, the source language named or guessed from the letters, the loading message), Google when NLLB
fails, the reason naming both when everything fails; then for the online services: batching (many lines, few
requests, order kept; an answer that does not split back -> smaller batches), the engine-wide spacing between
requests, 429 -> backoff -> MyMemory, both refusing -> TranslationUnavailable, same-language copy, the translation
cache; video.process finishing with warnings when a language fails; a second run of the same link reusing the
download and the transcript; cache pruning.

Run:  .venv/bin/python check_translate.py
"""
import doctest
import os
import sys
import tempfile
import time
from pathlib import Path

os.environ["KVS_OUTPUTS_DIR"] = tempfile.mkdtemp(prefix="kvs-check-")

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402

from studio import asr, cache, config, subtitles, translate, video  # noqa: E402

failed = 0


def check(name, ok, detail=""):
    global failed
    print(f"{'ok  ' if ok else 'FAIL'} {name}{f'  ({detail})' if detail else ''}")
    failed += 0 if ok else 1


class Clock:
    def __init__(self):
        self.t, self.slept = 1000.0, []

    def now(self):
        return self.t

    def sleep(self, seconds):
        self.slept.append(round(seconds, 3))
        self.t += seconds


class Fake:
    """A translation service: records each request (time, text) and answers with `answer(text, target)`."""

    def __init__(self, clock, answer):
        self.clock, self.answer, self.calls = clock, answer, []

    def __call__(self, text, source, target):
        self.calls.append((self.clock.now(), text))
        self.clock.t += 0.05  # the request itself
        return self.answer(text, target)


def tag(text, target):
    return "\n".join(f"[{target}] {line}" for line in text.split("\n"))


def busy(_text, _target):
    raise translate.Busy("limit reached")


class FakeNllb:
    """The local model: records (batch, source, target) and tags each line with the target code."""

    def __init__(self, fail=None):
        self.fail, self.calls = fail, []

    def __call__(self, texts, source, target):
        self.calls.append((list(texts), source, target))
        if self.fail:
            raise self.fail
        translate._nllb_model = ("tokenizer", "model")
        return [f"[{target}] {t}" for t in texts]


def fresh(google=tag, mymemory=tag, nllb=None):
    translate.TRANSLATOR = "nllb" if nllb else "google"
    translate._nllb = nllb or FakeNllb(RuntimeError("NLLB must not run in this check"))
    translate._nllb_model = ("tokenizer", "model")
    clock = Clock()
    translate._clock, translate._sleep = clock.now, clock.sleep
    translate._last[0] = float("-inf")
    translate._google_rests_until[0] = float("-inf")
    translate._cache = {}
    translate.CACHE_FILE.unlink(missing_ok=True)
    g, m = Fake(clock, google), Fake(clock, mymemory)
    translate._google, translate._mymemory = g, m
    return clock, g, m


for module in (translate, cache, asr, subtitles):
    result = doctest.testmod(module)
    check(f"{module.__name__} doctests", result.failed == 0, f"{result.attempted - result.failed}/{result.attempted}")

lines = [f"បន្ទាត់ទី {i} សួស្តី" for i in range(150)]

# NLLB first: 40 English lines -> Khmer in batches of 16 on the local model, Google never asked, order kept.
english = [f"Line {i}: hello everyone" for i in range(40)]
nllb = FakeNllb()
clock, g, m = fresh(nllb=nllb)
translate._nllb_model = None  # not loaded yet: the progress says it is loading
said = []
out = translate.translate_lines(english[:2] + [""] + english[2:], "Khmer", progress=lambda f, desc="": said.append(desc), source_label="English")
check("nllb: primary, Google not asked", nllb.calls and not g.calls and not m.calls, f"{len(nllb.calls)} batches")
check("nllb: batches of KVS_NLLB_BATCH", [len(b) for b, _, _ in nllb.calls] == [16, 16, 8], str([len(b) for b, _, _ in nllb.calls]))
check("nllb: order kept, empty line kept", out[0] == f"[khm_Khmr] {english[0]}" and out[2] == "" and out[-1] == f"[khm_Khmr] {english[-1]}")
check("nllb: codes eng_Latn -> khm_Khmr", {(s, t) for _, s, t in nllb.calls} == {("eng_Latn", "khm_Khmr")})
check("nllb: says it loads the model", any(d.startswith("Loading the translation model") for d in said))
check("nllb: progress per batch", "Translating to Khmer 16/40" in said and "Translating to Khmer 40/40" in said, str(said[-3:]))
check("nllb: cached like the others", translate.translate_lines(english[:3], "Khmer", source_label="English")[1] == f"[khm_Khmr] {english[1]}" and len(nllb.calls) == 3)

# Source unknown: guessed from the letters (Chinese -> zho_Hans, Khmer -> khm_Khmr).
nllb = FakeNllb()
clock, g, m = fresh(nllb=nllb)
translate.translate_lines(["你好，欢迎来到我们的频道", "谢谢大家"], "English")
translate.translate_lines(["សួស្តីអ្នកទាំងអស់គ្នា"], "English")
check("nllb: source guessed from the letters", [s for _, s, _ in nllb.calls] == ["zho_Hans", "khm_Khmr"], str([s for _, s, _ in nllb.calls]))
check("nllb: every language has a code", set(translate.NLLB_CODES) == set(config.LANGUAGES), str(set(config.LANGUAGES) ^ set(translate.NLLB_CODES)))

# NLLB fails -> Google does the lines, the progress says so.
nllb = FakeNllb(RuntimeError("MPS backend out of memory"))
clock, g, m = fresh(nllb=nllb)
said = []
out = translate.translate_lines(english[:5], "Khmer", progress=lambda f, desc="": said.append(desc), source_label="English")
check("nllb fails: Google takes over", nllb.calls and g.calls and out[0] == f"[km] {english[0]}")
check("nllb fails: progress says so", any("translation model failed" in d for d in said))

# Everything fails -> the reason names the translator's error and the online services'.
clock, g, m = fresh(google=busy, mymemory=busy, nllb=FakeNllb(RuntimeError("MPS backend out of memory")))
try:
    translate.translate_lines(english[:5], "Khmer", source_label="English")
    check("all fail: raises", False)
except translate.TranslationUnavailable as e:
    check("all fail: reason names both", e.reason.startswith("the translator failed (MPS backend out of memory) and") and "limit reached" in e.reason, e.reason)

# KVS_TRANSLATOR=google: NLLB is not used.
nllb = FakeNllb()
clock, g, m = fresh(nllb=nllb)
translate.TRANSLATOR = "google"
translate.translate_lines(english[:3], "Khmer", source_label="English")
check("KVS_TRANSLATOR=google skips NLLB", not nllb.calls and g.calls)


# Batching: 150 Khmer lines -> a handful of requests, order kept, empty lines untouched.
clock, g, m = fresh()
out = translate.translate_lines(lines[:3] + [""] + lines[3:], "English")
check("batching: 150 lines in few requests", 1 < len(g.calls) <= 8 and not m.calls, f"{len(g.calls)} requests")
check("batching: order kept, empty line kept", out[0] == f"[en] {lines[0]}" and out[3] == "" and out[-1] == f"[en] {lines[-1]}")
check("batching: requests stay under the URL size", all(len(translate.quote(t)) <= translate.CHUNK_URL_BYTES for _, t in g.calls))

# Throttle: requests at least INTERVAL apart.
gaps = [b[0] - a[0] for a, b in zip(g.calls, g.calls[1:])]
check("throttle: spacing", gaps and min(gaps) >= translate.INTERVAL - 1e-9, f"min gap {min(gaps):.2f} s")

# Cache: the same lines again -> no request.
before = len(g.calls)
again = translate.translate_lines(lines, "English")
check("cache: second time asks nothing", len(g.calls) == before and again[5] == f"[en] {lines[5]}")
check("cache: kept on disk", translate.CACHE_FILE.is_file())

# Answer that does not split back into as many lines -> halves, still right.
clock, g, m = fresh(google=lambda text, target: " ".join(f"<{line}>" for line in text.split("\n")) if "\n" in text else f"<{text}>")
out = translate.translate_lines(lines[:8], "English")
check("mismatch: falls back to smaller batches", out == [f"<{line}>" for line in lines[:8]], f"{len(g.calls)} requests")

# 429 -> backoff 5, 15, 45 s (said in the progress message) -> MyMemory.
clock, g, m = fresh(google=busy)
said = []
out = translate.translate_lines(lines[:20], "English", progress=lambda f, desc="": said.append(desc))
check("busy: Google tried 4 times with backoff", len(g.calls) == 4 and [s for s in clock.slept if s >= 5] == [5, 15, 45], f"slept {clock.slept}")
check("busy: progress says it waits", any("retrying in 15 s" in d for d in said))
check("busy: MyMemory did it", out[0] == f"[en] {lines[0]}" and m.calls and all(len(t) <= translate.MYMEMORY_CHARS for _, t in m.calls))
before = len(g.calls)
translate.translate_lines(["ថ្មី"], "French")
check("busy: Google rests after refusing", len(g.calls) == before)

# Both refuse -> TranslationUnavailable naming the language and the reason.
clock, g, m = fresh(google=busy, mymemory=busy)
try:
    translate.translate_lines(lines[:5], "English")
    check("both refuse: raises", False)
except translate.TranslationUnavailable as e:
    check("both refuse: raises", e.language == "English" and "limit reached" in e.reason, str(e))
check("both refuse: waits at most ~2 minutes", sum(clock.slept) <= 120, f"{sum(clock.slept):.0f} s")

# Same language: copied without asking.
clock, g, m = fresh()
check("same language: copied", translate.translate_lines(lines[:5], "Khmer") == lines[:5] and not g.calls)
check("same language: named source", translate.translate_lines(["Hello"], "English", source_label="English") == ["Hello"] and not g.calls)

# video.process: English works, French refused -> done with a warning; second run reuses download + transcript.
clock, g, m = fresh(google=lambda text, target: busy(text, target) if target == "fr" else tag(text, target),
                    mymemory=lambda text, target: busy(text, target) if target == "fr" else tag(text, target))
tmp = Path(tempfile.mkdtemp())
sf.write(tmp / "clip.wav", np.zeros(16000, dtype=np.float32), 16000)
counts = {"download": 0, "transcribe": 0}


def fake_download(url, out_dir, progress=None):
    counts["download"] += 1
    target = Path(out_dir) / "source.wav"
    target.write_bytes((tmp / "clip.wav").read_bytes())
    return str(target), "Test clip"


def fake_transcribe(path, language, progress=None):
    counts["transcribe"] += 1
    return [(0.0, 1.0, "សួស្តី"), (1.0, 2.0, "អរគុណ")], "Khmer"


video.download, video.asr.transcribe = fake_download, fake_transcribe
seen = []
res = video.process("https://example.com/v/1", "Auto detect", ["English", "French"], soft_subs=False,
                    progress=lambda f, desc="": seen.append(desc))
names = sorted(Path(p).name for p in res["srt_files"])
check("video: languages that worked are made", names == ["subtitles_English.srt", "subtitles_Khmer.srt"], str(names))
check("video: warning + missing", res["missing"] == ["French"] and res["warnings"] and "French subtitles couldn't be made" in res["warnings"][0], str(res["warnings"]))
res = video.process("https://example.com/v/1", "Auto detect", ["English"], soft_subs=False, progress=lambda f, desc="": seen.append(desc))
check("resume: second run skips download + transcription", counts == {"download": 1, "transcribe": 1}, str(counts))
check("resume: progress says so", any(d.startswith("Using the download from") for d in seen) and any(d.startswith("Using the transcript from") for d in seen))
check("resume: other spoken language transcribes again", (video.process(str(tmp / "clip.wav"), "English", [], soft_subs=False), counts["transcribe"])[1] == 2)

# Pruning: expired entries go, then the oldest while over the size cap.
old = cache.CACHE_DIR / ("a" * 40)
old.mkdir(parents=True)
(old / "source.mp4").write_bytes(b"x")
os.utime(old, (time.time() - cache.KEEP_SECONDS - 10,) * 2)
keep = cache.MAX_BYTES
cache.MAX_BYTES = 0
cache.prune()
check("prune: expired and over-size entries removed", not old.exists() and not any(d.is_dir() for d in cache.CACHE_DIR.iterdir()))
cache.MAX_BYTES = keep
check("prune: translations cache file kept", translate.CACHE_FILE.is_file())

print("all passed" if not failed else f"{failed} failed")
sys.exit(1 if failed else 0)
