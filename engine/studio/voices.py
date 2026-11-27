"""Voice library: each voice is a folder in voices/ with ref.wav + meta.json."""
import json
import re
import shutil
import time
from pathlib import Path

from .audio_utils import prepare_reference
from .config import VOICES_DIR

# Built-in "designed" voices (VoxCPM2 creates the voice from a description).
DESIGN_PRESETS = {
    "Storyteller (warm grandfather)": "An elderly Cambodian grandfather, an old man with a low, warm, slow and gentle male storytelling voice",
    "Storyteller (kind grandmother)": "An elderly Cambodian grandmother, an old woman with a soft, kind, calm female voice, clearly a woman",
    "Narrator (deep male)": "A middle-aged man with a deep, clear, confident male narrator voice",
    "Narrator (clear female)": "A young woman with a clear, bright and friendly female narrator voice",
    "News anchor (male)": "A professional adult male news anchor, a man with a low, formal male voice and a steady pace",
    "News anchor (female)": "A professional adult female news anchor, a woman with a formal female voice and a steady pace",
    "Young boy": "A cheerful ten-year-old boy, a child with a high-pitched, energetic young voice",
    "Young girl": "A sweet eight-year-old girl, a child with a high, playful young voice",
    "Villain (dark, slow)": "A menacing man with a dark, low, raspy and slow male voice",
    "Ghost story (whisper)": "A mysterious woman whispering softly, suspenseful female voice",
    "King (majestic)": "A powerful middle-aged king, a man with a deep, commanding, majestic and slow male voice full of authority",
    "Queen (elegant)": "A graceful noble queen, a mature woman with an elegant, calm and dignified female voice",
    "Empress dowager (stern)": "A stern elderly empress dowager, an old woman with a cold, slow and commanding female voice",
    "Prince (young noble)": "A young prince in his twenties, a man with a clear, confident and refined male voice",
    "Princess (gentle)": "A gentle young princess, a young woman with a soft, sweet and graceful female voice",
    "General (bold warrior)": "A middle-aged army general, clearly a man with a very deep, low, rough and commanding male voice, calm and steady",
    "Eunuch (palace servant)": "A palace eunuch, a man with a thin, high, sly and slightly nasal voice who speaks very politely",
    "Young man (hero)": "A brave young man in his twenties, clearly a grown man (not a woman or a child) with a warm, clear, medium-low and energetic male voice",
    "Young woman (heroine)": "A kind young woman in her twenties, a woman with a bright, clear and lively female voice",
    "Maid (timid servant)": "A timid young maid, a young woman with a small, polite and slightly nervous female voice",
    "Old monk (wise)": "A wise elderly Buddhist monk, an old man with a calm, slow, peaceful and kind male voice",
    "Mother (caring)": "A caring middle-aged mother, a woman with a warm, gentle and motherly female voice",
    "Father (strict)": "A strict middle-aged father, a man with a firm, steady and serious male voice",
    "Emperor (cold)": "A young emperor in his twenties, a man with a cold, calm and authoritative male voice",
    "Concubine (scheming)": "A scheming palace concubine, a young woman with a sweet but sly and flirtatious female voice",
    "Minister (old official)": "An elderly court minister, an old man with a careful, polite and slightly hoarse male voice",
    "Assassin (cold killer)": "A cold assassin, a man with a quiet, flat, emotionless and low male voice",
    "Swordswoman (fierce)": "A fierce female warrior, a young woman with a strong, confident and sharp female voice",
    "Old man (village elder)": "A village elder, an old man with a rough, slow and kind male voice",
    "Shopkeeper (cheerful)": "A friendly middle-aged shopkeeper, clearly a man with a deep, warm, relaxed and chatty male voice",
    "Rich young master (arrogant)": "An arrogant rich young master, a young man with a proud, mocking and lazy male voice",
    "CEO (cold boss)": "A rich company boss in his thirties, a man with a deep, calm, confident and slightly cold male voice",
    "Secretary (office woman)": "A capable young office woman, a woman with a clear, polite and professional female voice",
    "Teenage boy (cheeky)": "A teenage boy of about fifteen, a boy with a casual, cheeky voice that is just starting to break",
    "Teenage girl (cheerful)": "A teenage girl of about fifteen, a girl with a bright, quick and cheerful voice",
    "Villainess (cruel)": "A cruel and cunning woman, a middle-aged villainess with a sharp, cold and mocking female voice",
}

DESIGN_PREFIX = "🎨 "


def _slug(name):
    s = re.sub(r"[^\w\-]+", "-", name.strip(), flags=re.UNICODE).strip("-").lower()
    return s or f"voice-{int(time.time())}"


def list_voices():
    out = []
    for d in sorted(VOICES_DIR.iterdir()):
        meta = d / "meta.json"
        if d.is_dir() and meta.exists():
            m = json.loads(meta.read_text(encoding="utf-8"))
            m["dir"] = str(d)
            m["ref"] = str(d / "ref.wav")
            out.append(m)
    return out


def voice_choices():
    """Names for dropdowns: saved voices first, then design presets."""
    return [v["name"] for v in list_voices()] + [DESIGN_PREFIX + k for k in DESIGN_PRESETS]


def get_voice(name):
    """Resolve a dropdown value into a voice spec dict used by the TTS engine."""
    if not name or name == "(default)":
        return {"name": "(default)"}
    if name.startswith(DESIGN_PREFIX):
        key = name[len(DESIGN_PREFIX):]
        return {"name": name, "design": DESIGN_PRESETS.get(key, key)}
    for v in list_voices():
        if v["name"] == name:
            return v
    raise ValueError(f"Voice not found: {name}")


def save_voice(name, audio_path, transcript="", description="", source="upload"):
    if not name or not name.strip():
        raise ValueError("Please give the voice a name.")
    if name.startswith(DESIGN_PREFIX):
        raise ValueError("Name cannot start with the design emoji.")
    d = VOICES_DIR / _slug(name)
    if d.exists():
        raise ValueError(f"A voice called '{name}' already exists. Delete it first or pick another name.")
    d.mkdir(parents=True)
    try:
        _, dur = prepare_reference(audio_path, str(d / "ref.wav"))
    except Exception:
        shutil.rmtree(d, ignore_errors=True)
        raise
    meta = {
        "name": name.strip(),
        "transcript": (transcript or "").strip(),
        "description": description,
        "source": source,
        "seconds": round(dur, 1),
        "created": time.strftime("%Y-%m-%d %H:%M"),
    }
    (d / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def delete_voice(name):
    for v in list_voices():
        if v["name"] == name:
            shutil.rmtree(v["dir"])
            return True
    return False
