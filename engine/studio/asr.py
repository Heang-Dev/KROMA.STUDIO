"""Speech recognition -> timed cues, for any Whisper model on Hugging Face.

With "Auto detect" the multilingual Whisper names the spoken language (its language token, a vote over the first few
stretches of speech), reported as a config.LANGUAGES label so translation knows its source; a language outside that
list stays "Auto detect".

>>> label_for_code("en"), label_for_code("<|zh|>"), label_for_code("km"), label_for_code("ar")
('English', 'Chinese (Simplified)', 'Khmer', None)
"""
import re
import threading
from collections import Counter

from . import config
from .audio_utils import load, split_on_silence

_pipes = {}
_lock = threading.Lock()
SR = 16000


def _device():
    import torch
    if torch.cuda.is_available():
        return "cuda", torch.float16
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps", torch.float32
    return "cpu", torch.float32


def get_pipe(model_id):
    with _lock:
        if model_id not in _pipes:
            from transformers import pipeline
            dev, dtype = _device()
            print(f"[ASR] Loading {model_id} on {dev}...")
            _pipes[model_id] = pipeline(
                "automatic-speech-recognition", model=model_id, device=dev, torch_dtype=dtype
            )
        return _pipes[model_id]


def khmer_ratio(text):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if "ក" <= c <= "៿") / len(letters)


def label_for_code(code):
    """A Whisper language code ("en" or the token "<|en|>") -> the first config.LANGUAGES label for that language."""
    from transformers.models.whisper.tokenization_whisper import LANGUAGES as WHISPER
    name = WHISPER.get(code.strip("<|>").lower())
    return next((label for label, (_, whisper) in config.LANGUAGES.items() if whisper == name), None) if name else None


def detect_language(pipe, chunks):
    """The config.LANGUAGES label most of `chunks` (16 kHz audio) are spoken in, per Whisper, or None."""
    import torch
    features = pipe.feature_extractor(list(chunks), sampling_rate=SR, return_tensors="pt").input_features
    with _lock, torch.inference_mode():
        ids = pipe.model.detect_language(features.to(pipe.model.device, dtype=pipe.model.dtype))
    codes = [pipe.tokenizer.convert_ids_to_tokens(int(i)) for i in ids.view(-1)]
    print(f"[ASR] Detected languages: {codes}")
    labels = [label_for_code(c) for c in codes]
    best = Counter(label for label in labels if label).most_common(1)
    return best[0][0] if best else None


def _clean(text):
    from .text_utils import khmer_word_breaks
    text = re.sub(r"\s+", " ", text or "").strip()
    # The Khmer Whisper writes a space between words: keep them as invisible word breaks (see khmer_word_breaks).
    text = khmer_word_breaks(text)
    # remove obvious Whisper hallucination loops (same phrase repeated 4+ times)
    text = re.sub(r"(.{2,30}?)(?:\s*\1){3,}", r"\1", text)
    return text


def _run(pipe, chunks, language, batch_size=8):
    kw = {"task": "transcribe"}
    if language:
        kw["language"] = language
    # The pipeline consumes these dicts, so build fresh ones for each attempt.
    inputs = lambda: [{"raw": c, "sampling_rate": SR} for c in chunks]  # noqa: E731
    try:
        out = pipe(inputs(), batch_size=batch_size, generate_kwargs=kw)
    except ValueError as e:
        # Older single-language fine-tunes (e.g. the Khmer Whisper) ship a generation config without the language
        # tables newer transformers need for `language` / `task`. They only speak one language, so run them without.
        if "generation config is outdated" not in str(e):
            raise
        out = pipe(inputs(), batch_size=batch_size)
    return [_clean(o["text"]) for o in out]


def transcribe(path, language_label="Auto detect", progress=None):
    """Returns (cues, detected_language_label). cues = [(start, end, text)].

    Progress: reading the audio and loading the model fill the first 5 %, the batches of speech the rest.
    """
    def report(fraction, desc):
        if progress:
            progress(fraction, desc=desc)

    report(0.0, "Reading the audio")
    audio = load(path, sr=SR)
    spans = split_on_silence(audio, SR)
    if not spans:
        return [], language_label
    chunks = [audio[int(s * SR):int(e * SR)] for s, e in spans]

    if language_label in (None, "", "Auto detect"):
        # Detect with the multilingual model on the first few chunks
        report(0.01, "Detecting the spoken language")
        multi = get_pipe(config.ASR_MODEL_MULTI)
        try:
            language_label = detect_language(multi, chunks[:5]) or "Auto detect"
        except Exception as e:  # an older transformers without detect_language: read what it writes instead
            print(f"[ASR] Language detection failed ({e}); guessing from a sample")
            sample = _run(multi, chunks[:3], None)
            language_label = "Khmer" if khmer_ratio(" ".join(sample)) > 0.5 else "Auto detect"
        report(0.02, f"Spoken language: {language_label}" if language_label != "Auto detect" else "Spoken language: not in the list")

    if language_label == "Khmer":
        model_id, lang = config.ASR_MODEL_KHMER, "khmer"
    else:
        model_id = config.ASR_MODEL_MULTI
        lang = config.LANGUAGES.get(language_label, (None, None))[1]

    if model_id not in _pipes:
        report(0.02, "Loading the speech recognition model")
    pipe = get_pipe(model_id)
    texts = []
    step = max(1, min(8, -(-len(chunks) // 10)))  # batches of up to 8, small enough for about ten progress reports
    for i in range(0, len(chunks), step):
        report(0.05 + 0.95 * i / len(chunks), f"Transcribing {min(i + step, len(chunks))}/{len(chunks)}")
        texts += _run(pipe, chunks[i:i + step], lang)
    report(1.0, f"Transcribed {len(chunks)}/{len(chunks)}")
    cues = [(s, e, t) for (s, e), t in zip(spans, texts) if t]
    return cues, language_label
