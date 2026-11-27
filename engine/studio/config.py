"""Settings for Kroma's voice engine. Change values here or via environment variables (Kroma sets the folders)."""
import os
import platform
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICES_DIR = Path(os.environ.get("KVS_VOICES_DIR", ROOT / "voices"))
OUTPUTS_DIR = Path(os.environ.get("KVS_OUTPUTS_DIR", ROOT / "outputs"))
VOICES_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# ---- Text to speech (VoxCPM2: Apache-2.0, supports Khmer + 29 other languages) ----
# Alternative Khmer fine-tune: "ravuthz/VoxCPM2-khmer"
TTS_MODEL = os.environ.get("KVS_TTS_MODEL", "openbmb/VoxCPM2")
TTS_DEVICE = os.environ.get("KVS_DEVICE", "auto")  # auto | cuda | mps | cpu
TTS_CFG = float(os.environ.get("KVS_TTS_CFG", "2.0"))
TTS_STEPS = int(os.environ.get("KVS_TTS_STEPS", "10"))  # higher = better but slower
MAX_CHUNK_CHARS = int(os.environ.get("KVS_MAX_CHUNK_CHARS", "180"))

# ---- Speech recognition ----
# Khmer-specialised Whisper (Apache-2.0). Others: "sengtha/whisper-base-khmer" (faster)
ASR_MODEL_KHMER = os.environ.get("KVS_ASR_KHMER", "seanghay/whisper-small-khmer-v2")
# Multilingual Whisper for English / Chinese / auto-detect
ASR_MODEL_MULTI = os.environ.get("KVS_ASR_MULTI", "openai/whisper-large-v3-turbo")

# ---- Social captions (optional, needs Ollama running locally: https://ollama.com) ----
OLLAMA_URL = os.environ.get("KVS_OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("KVS_OLLAMA_MODEL", "qwen2.5:7b")

# Font used when burning subtitles into video (must support Khmer)
SUBTITLE_FONT = os.environ.get(
    "KVS_SUB_FONT",
    "Khmer Sangam MN" if platform.system() == "Darwin" else "Khmer OS",
)

# Languages shown in the UI: label -> (google translate code, whisper language)
LANGUAGES = {
    "Khmer": ("km", "khmer"),
    "English": ("en", "english"),
    "Chinese (Simplified)": ("zh-CN", "chinese"),
    "Chinese (Traditional)": ("zh-TW", "chinese"),
    "Japanese": ("ja", "japanese"),
    "Korean": ("ko", "korean"),
    "Thai": ("th", "thai"),
    "Vietnamese": ("vi", "vietnamese"),
    "Lao": ("lo", "lao"),
    "French": ("fr", "french"),
    "Spanish": ("es", "spanish"),
    "Indonesian": ("id", "indonesian"),
    "Malay": ("ms", "malay"),
    "Hindi": ("hi", "hindi"),
    "Russian": ("ru", "russian"),
    "German": ("de", "german"),
}
