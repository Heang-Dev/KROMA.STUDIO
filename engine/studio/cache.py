"""Resume cache: a retried video / transcription skips the download and the speech recognition it already did.

One folder per source under OUTPUTS_DIR/cache/<key>/, key = sha1 of the link (or of the uploaded file's bytes):
  source.<ext>              the downloaded media (links only; an upload is sent again with every job)
  meta.json                 {"title", "saved"} of the download
  transcript_<lang>.json    {"cues": [[start, end, text]], "language": detected label, "models": [...], "saved"}
Entries live KVS_CACHE_SECONDS (default 24 h) since last used; past KVS_CACHE_MAX_BYTES (default 5 GB) the least
recently used go first. Nothing is ever written outside OUTPUTS_DIR/cache.

>>> key_for_url(" https://youtu.be/x ") == key_for_url("https://youtu.be/x")
True
>>> _slug("Chinese (Simplified)")
'Chinese_Simplified'
>>> age_text(30), age_text(200), age_text(7300)
('a moment ago', '3 minutes ago', '2 hours ago')
"""
import hashlib
import json
import os
import re
import shutil
import time
from pathlib import Path

from . import config

CACHE_DIR = config.OUTPUTS_DIR / "cache"
KEEP_SECONDS = int(os.environ.get("KVS_CACHE_SECONDS", str(24 * 3600)))
MAX_BYTES = int(float(os.environ.get("KVS_CACHE_MAX_BYTES", str(5 * 1024 ** 3))))
_KEY = re.compile(r"^[0-9a-f]{40}$")


def key_for_url(url):
    return hashlib.sha1(url.strip().encode("utf-8")).hexdigest()


def key_for_file(path):
    """sha1 of the file's bytes, read in 1 MB pieces (videos can be large)."""
    h = hashlib.sha1()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def _slug(text):
    return re.sub(r"[^\w\-]+", "_", text or "auto").strip("_")[:40] or "auto"


def _dir(key, create=False):
    if not _KEY.match(key or ""):
        raise ValueError("Bad cache key.")
    d = CACHE_DIR / key
    if create:
        d.mkdir(parents=True, exist_ok=True)
    return d


def _touch(d):
    try:
        os.utime(d)
    except OSError:
        pass


def _fresh(d):
    return d.is_dir() and time.time() - d.stat().st_mtime < KEEP_SECONDS


def age_text(seconds):
    seconds = max(0, int(seconds))
    if seconds < 60:
        return "a moment ago"
    if seconds < 3600:
        n = seconds // 60
        return f"{n} minute{'s' if n != 1 else ''} ago"
    n = seconds // 3600
    return f"{n} hour{'s' if n != 1 else ''} ago"


def _place(src, dst):
    """Hard-link (same disk, no copy) or copy src to dst."""
    dst = Path(dst)
    if dst.exists():
        dst.unlink()
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)
    return dst


# ---------------------------------------------------------------- downloads
def get_download(key, out_dir):
    """(media path in out_dir, title, age seconds) when this link was downloaded recently, else None."""
    d = _dir(key)
    if not _fresh(d):
        return None
    files = sorted(d.glob("source.*"))
    if not files:
        return None
    try:
        meta = json.loads((d / "meta.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        meta = {}
    age = time.time() - float(meta.get("saved") or d.stat().st_mtime)
    media = _place(files[0], Path(out_dir) / files[0].name)
    _touch(d)
    return str(media), meta.get("title") or "video", age


def put_download(key, media, title):
    try:
        d = _dir(key, create=True)
        for old in d.glob("source.*"):
            old.unlink()
        _place(media, d / ("source" + Path(media).suffix))
        (d / "meta.json").write_text(json.dumps({"title": title, "saved": time.time()}), encoding="utf-8")
        _touch(d)
    except OSError as e:  # a full disk must not fail the job
        print(f"[cache] could not keep the download: {e}")


# ---------------------------------------------------------------- transcripts
def _models():
    return [config.ASR_MODEL_KHMER, config.ASR_MODEL_MULTI]


def get_transcript(key, language):
    """(cues, detected language, age seconds) for this source + spoken-language choice, else None."""
    d = _dir(key)
    path = d / f"transcript_{_slug(language)}.json"
    if not _fresh(d) or not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if data.get("models") != _models() or not data.get("cues"):
        return None
    _touch(d)
    cues = [(float(s), float(e), str(t)) for s, e, t in data["cues"]]
    return cues, data.get("language") or language, time.time() - float(data.get("saved") or path.stat().st_mtime)


def put_transcript(key, language, cues, detected):
    try:
        d = _dir(key, create=True)
        data = {"cues": [[s, e, t] for s, e, t in cues], "language": detected, "models": _models(), "saved": time.time()}
        tmp = d / f".transcript_{_slug(language)}.tmp"
        tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        tmp.replace(d / f"transcript_{_slug(language)}.json")
        _touch(d)
    except OSError as e:
        print(f"[cache] could not keep the transcript: {e}")


# ---------------------------------------------------------------- pruning
def _size(d):
    return sum(f.stat().st_size for f in d.rglob("*") if f.is_file())


def prune(now=None):
    """Drop entries unused for KEEP_SECONDS, then the least recently used until the cache fits MAX_BYTES."""
    if not CACHE_DIR.is_dir():
        return
    now = now or time.time()
    entries = []
    for d in CACHE_DIR.iterdir():
        if not d.is_dir() or not _KEY.match(d.name):
            continue
        if now - d.stat().st_mtime >= KEEP_SECONDS:
            shutil.rmtree(d, ignore_errors=True)
        else:
            entries.append((d.stat().st_mtime, _size(d), d))
    total = sum(size for _, size, _ in entries)
    for _, size, d in sorted(entries):
        if total <= MAX_BYTES:
            break
        shutil.rmtree(d, ignore_errors=True)
        total -= size
