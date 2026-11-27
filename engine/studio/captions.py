"""Social-media captions with a local LLM through Ollama (optional, free)."""
import json
import urllib.request

from . import config


def ollama_available():
    try:
        urllib.request.urlopen(config.OLLAMA_URL + "/api/tags", timeout=2)
        return True
    except Exception:
        return False


def make_caption(transcript, language="Khmer", platform="Facebook", tone="friendly"):
    if not transcript.strip():
        raise ValueError("No transcript text to write a caption from.")
    if not ollama_available():
        raise RuntimeError(
            "Ollama is not running. Install it from https://ollama.com, then run:\n"
            f"  ollama pull {config.OLLAMA_MODEL}\nand keep the Ollama app open."
        )
    prompt = (
        f"Write a short, engaging {platform} post caption in {language} for this video/audio. "
        f"Tone: {tone}. 2-4 sentences, then 5-8 relevant hashtags (mix {language} and English). "
        "Only output the caption.\n\nTranscript:\n" + transcript[:6000]
    )
    body = json.dumps({"model": config.OLLAMA_MODEL, "prompt": prompt, "stream": False}).encode()
    req = urllib.request.Request(config.OLLAMA_URL + "/api/generate", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["response"].strip()
