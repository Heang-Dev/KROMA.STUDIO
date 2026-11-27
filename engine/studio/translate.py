"""Translation: Meta's NLLB-200 on this machine first, Google Translate then MyMemory as the backup.

NLLB (KVS_TRANSLATOR=nllb, the default; KVS_NLLB_MODEL, default facebook/nllb-200-distilled-600M) runs on the GPU
(CUDA, Apple MPS) or the CPU, loaded the first time it is needed (the first time downloads about 2.4 GB) and kept like
the speech recognition models. It needs the source language: the one the caller names (the transcription's detected
language), else a guess from the letters (detect_language: Khmer, Thai, Lao, Hangul, Kana, Han, Cyrillic, Devanagari,
Vietnamese letters, other Latin -> English). Lines go through it KVS_NLLB_BATCH at a time (default 16), shortest first,
order kept; Khmer output loses the spaces NLLB puts between words (Khmer is written without them). When NLLB can't run (no model, an error, a language it isn't given a code for) the lines it didn't do go
to the online services below; KVS_TRANSLATOR=google skips NLLB.

The online services need internet. Google's free endpoint allows about 5 requests a second and blocks an address that asks faster (HTTP 429). So:
- lines go in batches, one request per ~4500 characters (KVS_TRANSLATE_CHUNK_CHARS; also kept under
  KVS_TRANSLATE_CHUNK_URL_BYTES once URL-encoded, Khmer takes 9 bytes a letter), joined by newlines; when the answer
  does not split back into as many lines, the batch is halved and sent again, down to single lines;
- one request at a time for the whole engine, at least KVS_TRANSLATE_INTERVAL seconds apart (default 0.5);
- when Google is busy (429, an HTTP or connection error) it waits KVS_TRANSLATE_BACKOFF seconds (default 5, 15, 45),
  saying so in the progress message, then asks MyMemory for that batch (at most 480 characters a request) and leaves
  Google alone for KVS_TRANSLATE_COOLDOWN seconds (default 10 min); when MyMemory refuses too, TranslationUnavailable;
- translations are kept by (text, target) in OUTPUTS_DIR/cache/translations.json (the newest
  KVS_TRANSLATE_CACHE_ENTRIES), so a retry only asks for what is missing;
- a target that is the source language is copied, not translated.

>>> _tidy("ថ្ងៃ នេះ យើង នឹង ធ្វើ ម្ហូប ខ្មែរ។ ឆ្ងាញ់ ណាស់ Phnom Penh  ល្អ", "khm_Khmr").replace("\u200b", "|")
'ថ្ងៃ|នេះ|យើង|នឹង|ធ្វើ|ម្ហូប|ខ្មែរ។ ឆ្ងាញ់|ណាស់ Phnom Penh ល្អ'

>>> detect_language(["Hello everyone", "Welcome back"]), detect_language(["សួស្តី"]), detect_language(["你好", "谢谢"])
('English', 'Khmer', 'Chinese (Simplified)')
>>> detect_language(["こんにちは、元気ですか"]), detect_language(["Xin chào các bạn"]), detect_language(["", "123"])
('Japanese', 'Vietnamese', None)

>>> list(_chunks(["aa", "bb", "cc"], 6, 100))
[['aa', 'bb'], ['cc']]
>>> _split_answer("One\\r\\nTwo \\n", 2)
['One', 'Two']
"""
import html
import json
import os
import re
import threading
import time
from urllib.parse import quote

from .text_utils import khmer_word_breaks
from .config import LANGUAGES, OUTPUTS_DIR

INTERVAL = float(os.environ.get("KVS_TRANSLATE_INTERVAL", "0.5"))
BACKOFF = [float(x) for x in os.environ.get("KVS_TRANSLATE_BACKOFF", "5,15,45").split(",") if x.strip()]
COOLDOWN = float(os.environ.get("KVS_TRANSLATE_COOLDOWN", "600"))
CHUNK_CHARS = int(os.environ.get("KVS_TRANSLATE_CHUNK_CHARS", "4500"))
CHUNK_URL_BYTES = int(os.environ.get("KVS_TRANSLATE_CHUNK_URL_BYTES", "10000"))
MYMEMORY_CHARS = 480  # MyMemory refuses more than 500 characters a request
MYMEMORY_EMAIL = os.environ.get("KVS_MYMEMORY_EMAIL", "")  # raises MyMemory's free daily allowance
CACHE_FILE = OUTPUTS_DIR / "cache" / "translations.json"
CACHE_ENTRIES = int(os.environ.get("KVS_TRANSLATE_CACHE_ENTRIES", "50000"))
TRANSLATOR = os.environ.get("KVS_TRANSLATOR", "nllb").strip().lower()  # nllb | google
NLLB_MODEL = os.environ.get("KVS_NLLB_MODEL", "facebook/nllb-200-distilled-600M")
NLLB_BATCH = int(os.environ.get("KVS_NLLB_BATCH", "16"))
NLLB_BEAMS = int(os.environ.get("KVS_NLLB_BEAMS", "4"))
NLLB_MAX_TOKENS = int(os.environ.get("KVS_NLLB_MAX_TOKENS", "256"))  # a line longer than this is cut
NLLB_NO_REPEAT = int(os.environ.get("KVS_NLLB_NO_REPEAT", "3"))  # no 3 tokens twice: stops "សួស្តី សួស្តី សួស្តី ..." loops

GOOGLE, MYMEMORY, NLLB = "Google Translate", "MyMemory", "NLLB"
# config.LANGUAGES labels -> NLLB-200 (FLORES-200) codes
NLLB_CODES = {
    "Khmer": "khm_Khmr", "English": "eng_Latn", "Chinese (Simplified)": "zho_Hans", "Chinese (Traditional)": "zho_Hant",
    "Japanese": "jpn_Jpan", "Korean": "kor_Hang", "Thai": "tha_Thai", "Vietnamese": "vie_Latn", "Lao": "lao_Laoo",
    "French": "fra_Latn", "Spanish": "spa_Latn", "Indonesian": "ind_Latn", "Malay": "zsm_Latn", "Hindi": "hin_Deva",
    "Russian": "rus_Cyrl", "German": "deu_Latn",
}
# config.LANGUAGES Google codes -> MyMemory's (RFC 3066) codes
MYMEMORY_CODES = {
    "km": "km-KH", "en": "en-GB", "zh-CN": "zh-CN", "zh-TW": "zh-TW", "ja": "ja-JP", "ko": "ko-KR", "th": "th-TH",
    "vi": "vi-VN", "lo": "lo-LA", "fr": "fr-FR", "es": "es-ES", "id": "id-ID", "ms": "ms-MY", "hi": "hi-IN",
    "ru": "ru-RU", "de": "de-DE",
}

# Patched by check_translate.py: time goes through these two.
_sleep = time.sleep
_clock = time.monotonic

_rate_lock = threading.Lock()   # one request at a time, engine-wide
_last = [float("-inf")]         # when the last request finished (_clock)
_google_rests_until = [float("-inf")]
_cache_lock = threading.Lock()
_cache = None                   # {"<target>\x1f<text>": translation}, oldest first
sent = {GOOGLE: 0, MYMEMORY: 0}  # requests made since the engine started (logged)


class TranslationUnavailable(RuntimeError):
    """No service would translate into `language` right now; `reason` says why, for people."""

    def __init__(self, language, reason):
        self.language, self.reason = language, reason
        super().__init__(f"Couldn't translate to {language}: {reason}.")


class Busy(Exception):
    """The service refused for now: a rate or daily limit (`network` False) or no connection (`network` True)."""

    def __init__(self, message, network=False):
        super().__init__(message)
        self.network = network


class Unusable(Exception):
    """The service could not translate this text (no result, too long); halving the batch may help."""


# ---------------------------------------------------------------- the source language
# Unicode ranges -> the language their letters most likely mean (a guess for text without a known language).
_SCRIPTS = [
    ("Khmer", (0x1780, 0x17FF), (0x19E0, 0x19FF)), ("Thai", (0x0E00, 0x0E7F)), ("Lao", (0x0E80, 0x0EFF)),
    ("Korean", (0xAC00, 0xD7AF), (0x1100, 0x11FF), (0x3130, 0x318F)), ("Japanese", (0x3040, 0x30FF)),
    ("Chinese (Simplified)", (0x4E00, 0x9FFF), (0x3400, 0x4DBF)), ("Russian", (0x0400, 0x04FF)), ("Hindi", (0x0900, 0x097F)),
]
_VIETNAMESE = set("ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ")  # letters only Vietnamese uses


def detect_language(texts):
    """A config.LANGUAGES label guessed from the letters of `texts`, or None when there are none. Any kana makes
    Chinese characters Japanese; Latin letters are English unless Vietnamese letters show up."""
    counts, latin, viet = {}, 0, 0
    for c in "".join(texts):
        if not c.isalpha():
            continue
        o = ord(c)
        for label, *ranges in _SCRIPTS:
            if any(lo <= o <= hi for lo, hi in ranges):
                counts[label] = counts.get(label, 0) + 1
                break
        else:
            if c.isascii() or 0x00C0 <= o <= 0x024F or 0x1E00 <= o <= 0x1EFF:
                latin += 1
                viet += c.lower() in _VIETNAMESE
    if counts.get("Japanese") and counts.get("Chinese (Simplified)"):
        counts["Japanese"] += counts.pop("Chinese (Simplified)")
    if latin:
        counts["Vietnamese" if viet >= max(1, latin * 0.02) else "English"] = latin
    return max(counts, key=counts.get) if counts else None


# ---------------------------------------------------------------- NLLB (local)
_nllb_lock = threading.Lock()
_nllb_model = None  # (tokenizer, model)


def nllb_loaded():
    return _nllb_model is not None


def _nllb_load():
    global _nllb_model
    with _nllb_lock:
        if _nllb_model is None:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            if torch.cuda.is_available():
                device, dtype = "cuda", torch.float16
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                device, dtype = "mps", torch.float32
            else:
                device, dtype = "cpu", torch.float32
            print(f"[translate] Loading {NLLB_MODEL} on {device}...")
            tokenizer = AutoTokenizer.from_pretrained(NLLB_MODEL)
            model = AutoModelForSeq2SeqLM.from_pretrained(NLLB_MODEL, dtype=dtype).to(device).eval()
            _nllb_model = (tokenizer, model)
        return _nllb_model


def _nllb(texts, source, target):
    """One batch of lines from NLLB code `source` to `target`, in order ("" where it gave nothing)."""
    import torch
    tokenizer, model = _nllb_load()
    with _nllb_lock:
        tokenizer.src_lang = source
        enc = tokenizer(texts, return_tensors="pt", padding=True, truncation=True, max_length=NLLB_MAX_TOKENS).to(model.device)
        with torch.inference_mode():
            out = model.generate(**enc, forced_bos_token_id=tokenizer.convert_tokens_to_ids(target), num_beams=NLLB_BEAMS,
                                 no_repeat_ngram_size=NLLB_NO_REPEAT, max_new_tokens=min(2 * NLLB_MAX_TOKENS, int(enc["input_ids"].shape[1] * 2.5) + 10))
    return [_tidy(t, target) for t in tokenizer.batch_decode(out, skip_special_tokens=True)]


def _tidy(text, target):
    """One line of model output: single spaces; between Khmer words an invisible zero-width space (Khmer is written
    without spaces, but burnt-in subtitles may break there); a space stays after ។."""
    text = " ".join(text.split())
    if target == "khm_Khmr":
        text = khmer_word_breaks(text)
    return text


def _short(error):
    text = " ".join(str(error).split()) or error.__class__.__name__
    return text if len(text) <= 120 else text[:117] + "..."


# ---------------------------------------------------------------- the services
def _google(text, source, target):
    import requests
    from deep_translator import GoogleTranslator
    from deep_translator.exceptions import RequestError, TooManyRequests
    try:
        return GoogleTranslator(source=source or "auto", target=target).translate(text) or ""
    except TooManyRequests as e:
        raise Busy("Google Translate limit reached") from e
    except RequestError as e:
        raise Busy("Google Translate refused the request") from e
    except requests.RequestException as e:
        raise Busy("no internet connection", network=True) from e
    except Exception as e:  # TranslationNotFound, NotValidLength, ...
        raise Unusable(str(e) or e.__class__.__name__) from e


def _mymemory(text, source, target):
    import requests
    pair = f"{MYMEMORY_CODES.get(source, 'autodetect') if source else 'autodetect'}|{MYMEMORY_CODES.get(target, target)}"
    params = {"q": text, "langpair": pair}
    if MYMEMORY_EMAIL:
        params["de"] = MYMEMORY_EMAIL
    try:
        r = requests.get("https://api.mymemory.translated.net/get", params=params, timeout=30)
    except requests.RequestException as e:
        raise Busy("no internet connection", network=True) from e
    if r.status_code == 429:
        raise Busy("MyMemory limit reached")
    try:
        data = r.json()
    except ValueError as e:
        raise Busy(f"MyMemory answered HTTP {r.status_code}") from e
    out = html.unescape((data.get("responseData") or {}).get("translatedText") or "")
    status = str(data.get("responseStatus"))
    if data.get("quotaFinished") or status == "429" or "MYMEMORY WARNING" in out.upper():
        raise Busy("MyMemory daily limit reached")
    if status != "200" or not out:
        raise Unusable(out or f"MyMemory status {status}")
    return out


# ---------------------------------------------------------------- requests
def _ask(service, text, source, target, say):
    """One request to `service` (throttled engine-wide), waiting out busy answers per BACKOFF (MyMemory: once)."""
    fn = _google if service == GOOGLE else _mymemory
    waits = BACKOFF if service == GOOGLE else BACKOFF[:1]
    for attempt in range(len(waits) + 1):
        try:
            with _rate_lock:
                gap = _last[0] + INTERVAL - _clock()
                if gap > 0:
                    _sleep(gap)
                sent[service] += 1
                print(f"[translate] {service} request #{sent[service]}: {text.count(chr(10)) + 1} lines, {len(text)} characters -> {target}")
                try:
                    return fn(text, source, target)
                finally:
                    _last[0] = _clock()
        except Busy:
            if attempt == len(waits):
                raise
            say(f"{service} is busy — retrying in {waits[attempt]:g} s")
            _sleep(waits[attempt])


def _split_answer(out, n):
    parts = [p.strip() for p in (out or "").replace("\r\n", "\n").strip().split("\n")]
    return parts if len(parts) == n and all(parts) else None


def _batch(lines, service, source, target, say):
    """Translations of `lines` in order (None for a line the service could not do). Halves the batch when the answer
    does not split back into one line each."""
    try:
        parts = _split_answer(_ask(service, "\n".join(lines), source, target, say), len(lines))
    except Unusable:
        parts = None
    if parts is not None:
        return parts
    if len(lines) == 1:
        return [None]
    mid = len(lines) // 2
    return _batch(lines[:mid], service, source, target, say) + _batch(lines[mid:], service, source, target, say)


def _chunks(lines, max_chars, max_url_bytes):
    chunk, chars, url = [], 0, 0
    for line in lines:
        c, u = len(line) + 1, len(quote(line)) + 3
        if chunk and (chars + c > max_chars or url + u > max_url_bytes):
            yield chunk
            chunk, chars, url = [], 0, 0
        chunk.append(line)
        chars, url = chars + c, url + u
    if chunk:
        yield chunk


def _chunk(lines, label, source, target, say):
    """Google first (unless it is resting after refusing), else MyMemory in its smaller pieces."""
    google_reason = None
    if _clock() >= _google_rests_until[0]:
        try:
            return _batch(lines, GOOGLE, source, target, say)
        except Busy as e:
            _google_rests_until[0] = _clock() + COOLDOWN
            google_reason = e
            say(f"Google Translate is not answering — trying {MYMEMORY}")
    out = []
    try:
        for piece in _chunks(lines, MYMEMORY_CHARS, CHUNK_URL_BYTES):
            out += _batch(piece, MYMEMORY, source, target, say)
    except Busy as e:
        if e.network and (google_reason is None or google_reason.network):
            raise TranslationUnavailable(label, "no internet connection") from e
        reasons = [str(r) for r in (google_reason, e) if r is not None and not r.network]
        raise TranslationUnavailable(label, " and ".join(dict.fromkeys(reasons)) or "the online services refused") from e
    return out


# ---------------------------------------------------------------- cache
def _load_cache():
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
            if not isinstance(_cache, dict):
                _cache = {}
        except (OSError, ValueError):
            _cache = {}
    return _cache


def _save_cache():
    cache = _load_cache()
    for key in list(cache)[: max(0, len(cache) - CACHE_ENTRIES)]:
        cache.pop(key, None)
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        tmp.replace(CACHE_FILE)
    except OSError as e:
        print(f"[translate] could not save the cache: {e}")


def _khmer_share(texts):
    letters = [c for t in texts for c in t if c.isalpha()]
    return sum(1 for c in letters if "ក" <= c <= "៿") / len(letters) if letters else 0.0


# ---------------------------------------------------------------- API
def translate_lines(lines, target_label, progress=None, source_label=None):
    """`lines` translated into `target_label` (a config.LANGUAGES label), in order. Empty lines stay empty; a line no
    service could translate keeps its text. NLLB first (see the module docstring), the online services for what it
    didn't do. Raises TranslationUnavailable, naming why, when nothing could be translated."""
    def say(desc, fraction=None):
        if progress:
            progress(fraction if fraction is not None else done / max(1, len(todo)), desc=desc)

    target = LANGUAGES[target_label][0]
    source = LANGUAGES[source_label][0] if source_label in LANGUAGES else None
    texts = [" ".join((t or "").split()) for t in lines]
    guessed = source_label if source_label in LANGUAGES else detect_language(texts)
    if source == target or (source is None and target == "km" and _khmer_share(texts) > 0.8) or (guessed == target_label != "English"):
        return list(lines)  # (a guess of English only means Latin letters: still translated)

    key = lambda text: f"{target}\x1f{text}"  # noqa: E731
    with _cache_lock:
        cache = _load_cache()
        todo = [t for t in dict.fromkeys(texts) if t and key(t) not in cache]
    done = 0
    say(f"Translating to {target_label} 0/{len(todo)}" if todo else f"Translating to {target_label}", 0.0)

    def keep(pairs):
        with _cache_lock:
            for text, out in pairs:
                cache[key(text)] = out
            _save_cache()

    local_error = None
    if todo and TRANSLATOR == "nllb" and guessed in NLLB_CODES and target_label in NLLB_CODES:
        try:
            if not nllb_loaded():
                say("Loading the translation model (the first time downloads about 2.4 GB)", 0.0)
            ordered = sorted(todo, key=len)  # less padding per batch
            left = set(todo)
            for i in range(0, len(ordered), max(1, NLLB_BATCH)):
                batch = ordered[i:i + max(1, NLLB_BATCH)]
                got = _nllb(batch, NLLB_CODES[guessed], NLLB_CODES[target_label])
                made = [(text, out) for text, out in zip(batch, got) if out]
                keep(made)
                left -= {text for text, _ in made}
                done += len(batch)
                say(f"Translating to {target_label} {done}/{len(todo)}")
            todo = [t for t in todo if t in left]
        except Exception as e:  # no model / download / GPU error: the online services take over
            local_error = _short(e)
            print(f"[translate] {NLLB} failed, using the online services: {local_error}")
            with _cache_lock:
                todo = [t for t in todo if key(t) not in cache]
            say(f"The translation model failed — trying {GOOGLE}")
        done = 0

    failed = 0
    try:
        for chunk in _chunks(todo, CHUNK_CHARS, CHUNK_URL_BYTES):
            got = _chunk(chunk, target_label, source, target, say)
            failed += sum(1 for out in got if out is None)
            keep([(text, out) for text, out in zip(chunk, got) if out is not None])
            done += len(chunk)
            say(f"Translating to {target_label} {done}/{len(todo)}")
    except TranslationUnavailable as e:
        if not local_error:
            raise
        raise TranslationUnavailable(target_label, f"the translator failed ({local_error}) and {e.reason}") from e
    if todo and failed == len(todo):
        reason = "the translation services returned nothing"
        raise TranslationUnavailable(target_label, f"the translator failed ({local_error}) and {reason}" if local_error else reason)

    with _cache_lock:
        out = []
        for line, text in zip(lines, texts):
            hit = cache.pop(key(text), None) if text else None
            if hit is not None:
                cache[key(text)] = hit  # most recently used last
            out.append(hit if hit is not None else line)
    return out


def translate_cues(cues, target_label, progress=None, source_label=None):
    texts = translate_lines([c[2] for c in cues], target_label, progress, source_label)
    return [(s, e, t) for (s, e, _), t in zip(cues, texts)]
