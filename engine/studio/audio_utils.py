"""Audio helpers built on ffmpeg + numpy."""
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf


def require_ffmpeg():
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is not installed. On Mac run: brew install ffmpeg")


def run(cmd, cwd=None):
    p = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(map(str, cmd))}\n{p.stderr[-2000:]}")
    return p


def media_duration(path):
    """Length of an audio / video file in seconds (ffprobe); 0.0 when it cannot be read."""
    if not shutil.which("ffprobe"):
        return 0.0
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    try:
        return max(0.0, float(p.stdout.strip().splitlines()[0]))
    except (ValueError, IndexError):
        return 0.0


def ffmpeg_seconds(line):
    """Seconds written so far from one `ffmpeg -progress` line (out_time_us / out_time_ms are both microseconds,
    out_time is HH:MM:SS.micro); None for any other line.

    >>> ffmpeg_seconds("out_time_us=1500000"), ffmpeg_seconds("out_time=00:01:02.500000"), ffmpeg_seconds("fps=30")
    (1.5, 62.5, None)
    """
    key, _, value = line.strip().partition("=")
    try:
        if key in ("out_time_us", "out_time_ms"):
            return max(0.0, int(value) / 1_000_000)
        if key == "out_time":
            h, m, s = value.split(":")
            return max(0.0, int(h) * 3600 + int(m) * 60 + float(s))
    except ValueError:
        return None
    return None


def run_with_progress(cmd, duration, progress=None, desc="", cwd=None):
    """`run()` for an ffmpeg command, reporting how far it got: out_time / duration as progress(fraction, desc).

    Adds `-progress pipe:1 -nostats` after "ffmpeg"; stderr goes to a temp file (shown when ffmpeg fails), so neither
    pipe can fill up and stall ffmpeg. Without progress or a known duration it is just `run()`.
    """
    if progress is None or not duration or duration <= 0:
        return run(cmd, cwd=cwd)
    cmd = [cmd[0], "-progress", "pipe:1", "-nostats", *cmd[1:]]
    with tempfile.TemporaryFile(mode="w+") as err:
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err, text=True, cwd=cwd)
        for line in p.stdout:
            done = ffmpeg_seconds(line)
            if done is not None:
                fraction = min(1.0, done / duration)
                progress(fraction, desc=f"{desc} {round(fraction * 100)}%".strip())
        p.wait()
        if p.returncode != 0:
            err.seek(0)
            raise RuntimeError(f"Command failed: {' '.join(map(str, cmd))}\n{err.read()[-2000:]}")
    return p


def to_wav(src, dst=None, sr=16000, mono=True):
    """Convert any audio/video file to WAV with ffmpeg."""
    require_ffmpeg()
    dst = dst or tempfile.mktemp(suffix=".wav")
    cmd = ["ffmpeg", "-y", "-i", str(src), "-vn", "-ar", str(sr)]
    if mono:
        cmd += ["-ac", "1"]
    run(cmd + [str(dst)])
    return str(dst)


def load(path, sr=16000):
    wav_path = to_wav(path, sr=sr)
    audio, _ = sf.read(wav_path, dtype="float32")
    Path(wav_path).unlink(missing_ok=True)
    return audio


def trim_silence(audio, sr, top_db=35):
    import librosa
    trimmed, _ = librosa.effects.trim(audio, top_db=top_db)
    return trimmed


def normalize(audio, peak=0.95):
    m = float(np.max(np.abs(audio))) if len(audio) else 0
    return audio * (peak / m) if m > 0 else audio


def prepare_reference(src, dst, max_seconds=20.0, sr=24000):
    """Clean a voice sample for cloning: mono, trimmed, normalised, max 20 s."""
    audio = load(src, sr=sr)
    audio = trim_silence(audio, sr)
    audio = audio[: int(max_seconds * sr)]
    audio = normalize(audio)
    if len(audio) < sr * 3:
        raise ValueError("Voice sample is too short. Please use 5-20 seconds of clear speech.")
    sf.write(dst, audio, sr)
    return dst, len(audio) / sr


def silence(seconds, sr):
    return np.zeros(int(seconds * sr), dtype=np.float32)


def concat(parts, sr, gap=0.35):
    out = []
    for i, p in enumerate(parts):
        if i:
            out.append(silence(gap, sr))
        out.append(np.asarray(p, dtype=np.float32))
    return np.concatenate(out) if out else np.zeros(0, dtype=np.float32)


def fit_duration(audio, sr, target_seconds, max_speedup=1.6):
    """Speed audio up (never slow down) so it fits in target_seconds, for dubbing."""
    import librosa
    cur = len(audio) / sr
    if target_seconds <= 0 or cur <= target_seconds:
        return audio
    rate = min(cur / target_seconds, max_speedup)
    return librosa.effects.time_stretch(audio, rate=rate)


def save_audio(audio, sr, path, mp3=True):
    """Save WAV, and an MP3 copy if requested. Returns the preferred path."""
    sf.write(path, audio, sr)
    if mp3 and shutil.which("ffmpeg"):
        mp3_path = str(Path(path).with_suffix(".mp3"))
        run(["ffmpeg", "-y", "-i", str(path), "-b:a", "192k", mp3_path])
        return mp3_path
    return str(path)


def split_on_silence(audio, sr, max_len=12.0, min_len=1.0, top_db=32):
    """Split speech into chunks (start, end) in seconds, respecting pauses.
    Used to get subtitle timestamps from any ASR model."""
    import librosa
    intervals = librosa.effects.split(audio, top_db=top_db, frame_length=2048, hop_length=256)
    chunks = []
    cur_s = cur_e = None
    for s, e in intervals:
        s, e = s / sr, e / sr
        if cur_s is None:
            cur_s, cur_e = s, e
        elif e - cur_s <= max_len and s - cur_e < 0.6:
            cur_e = e
        else:
            chunks.append((cur_s, cur_e))
            cur_s, cur_e = s, e
    if cur_s is not None:
        chunks.append((cur_s, cur_e))
    # break any chunk still longer than max_len into equal pieces
    final = []
    for s, e in chunks:
        if e - s <= max_len:
            if e - s >= min_len * 0.3:
                final.append((max(0, s - 0.1), e + 0.1))
            continue
        n = int(np.ceil((e - s) / max_len))
        step = (e - s) / n
        final += [(s + i * step, s + (i + 1) * step) for i in range(n)]
    return final


def median_pitch(audio, sr, fmin=60.0, fmax=450.0):
    """Median voiced pitch in Hz (pYIN), or None when nothing voiced is found (a whisper, silence).
    Men speak around 85-155 Hz, women 165-255 Hz, children higher - used to check a designed voice's gender / age."""
    import librosa
    y = np.asarray(audio, dtype=np.float32)
    if sr != 16000:
        y = librosa.resample(y, orig_sr=sr, target_sr=16000)
        sr = 16000
    f0, voiced, _ = librosa.pyin(y, fmin=fmin, fmax=fmax, sr=sr)
    if voiced is None or not voiced.any():
        return None
    return float(np.nanmedian(f0[voiced]))
