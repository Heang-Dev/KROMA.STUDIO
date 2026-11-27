"""Video: download from link, transcribe, translate, subtitle, and optionally dub."""
import re
import shutil
import tempfile
import time
from pathlib import Path

import numpy as np
import soundfile as sf

from . import asr, cache, config, subtitles, translate
from .audio_utils import fit_duration, load, media_duration, require_ffmpeg, run, run_with_progress
from .progress import Plan, span

# How much of the bar each step of process() fills (steps a job skips take no room).
WEIGHTS = {"download": 15, "transcribe": 40, "translate": 15, "subtitles": 15, "dub": 15}


def new_job_dir(name="video"):
    safe = re.sub(r"[^\w\-]+", "_", name)[:40] or "video"
    d = config.OUTPUTS_DIR / f"{time.strftime('%Y%m%d-%H%M%S')}_{safe}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _mb(n):
    return f"{n / 1_000_000:.1f} MB"


def download_hook(progress):
    """A yt-dlp progress hook reporting bytes downloaded as progress(fraction, desc).

    The video and audio streams download one after the other; the expected total is the size of every requested
    format when yt-dlp knows them, else what has been seen so far, so the fraction does not restart per stream.

    >>> seen = []
    >>> hook = download_hook(lambda f, desc="": seen.append((round(f, 2), desc)))
    >>> info = {"requested_formats": [{"filesize": 30_000_000}, {"filesize_approx": 6_000_000}]}
    >>> hook({"status": "downloading", "downloaded_bytes": 12_000_000, "total_bytes": 30_000_000, "info_dict": info})
    >>> hook({"status": "finished", "total_bytes": 30_000_000, "info_dict": info})
    >>> hook({"status": "downloading", "downloaded_bytes": 3_000_000, "total_bytes": 6_000_000, "info_dict": info})
    >>> seen
    [(0.33, 'Downloading video 33% · 12.0 MB / 36.0 MB'), (0.92, 'Downloading video 92% · 33.0 MB / 36.0 MB')]
    """
    finished = {"bytes": 0}

    def hook(d):
        if progress is None:
            return
        if d.get("status") == "finished":
            finished["bytes"] += d.get("total_bytes") or d.get("downloaded_bytes") or 0
            return
        if d.get("status") != "downloading":
            return
        got = d.get("downloaded_bytes") or 0
        size = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
        formats = (d.get("info_dict") or {}).get("requested_formats") or []
        expected = sum((f.get("filesize") or f.get("filesize_approx") or 0) for f in formats)
        done = finished["bytes"] + got
        total = max(expected, finished["bytes"] + size)
        if total > 0:
            fraction = min(1.0, done / total)
            progress(fraction, desc=f"Downloading video {round(fraction * 100)}% · {_mb(done)} / {_mb(total)}")
        else:
            progress(0.0, desc=f"Downloading video · {_mb(done)}")

    return hook


def download(url, out_dir, progress=None):
    """Download a video from YouTube, Facebook, TikTok, Instagram, X, etc. (via yt-dlp)."""
    import yt_dlp

    def merging(d):
        if progress and d.get("status") == "started":
            progress(1.0, desc="Preparing the downloaded video")

    opts = {
        "outtmpl": str(Path(out_dir) / "source.%(ext)s"),
        "format": "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [download_hook(progress)],
        "postprocessor_hooks": [merging],
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title") or "video"
    files = sorted(Path(out_dir).glob("source.*"))
    if not files:
        raise RuntimeError("Download failed - the link may be private or unsupported.")
    return str(files[0]), title


def has_video_stream(path):
    if not shutil.which("ffprobe"):
        return Path(path).suffix.lower() in {".mp4", ".mov", ".mkv", ".webm", ".avi"}
    p = run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
             "stream=codec_type", "-of", "csv=p=0", str(path)])
    return "video" in p.stdout


def video_size(path):
    try:
        p = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                 "stream=width,height", "-of", "csv=p=0:s=x", str(path)])
        w, h = p.stdout.strip().split("\n")[0].split("x")
        return int(w), int(h)
    except Exception:
        return 1920, 1080


def burn_subtitles(video, srt_path, out_path, font=None, size=20, progress=None):
    """Hard-burn subtitles into the video (works everywhere, incl. TikTok/Facebook)."""
    require_ffmpeg()
    font = font or config.SUBTITLE_FONT
    tmp = Path(tempfile.mkdtemp())
    w, h = video_size(video)
    subtitles.write_ass(subtitles.from_srt(Path(srt_path).read_text(encoding="utf-8")),
                        tmp / "subs.ass", font=font, size=size, width=w, height=h)
    seconds = media_duration(video)

    def burn(vf):
        run_with_progress(["ffmpeg", "-y", "-i", str(Path(video).resolve()), "-vf", vf, "-c:v", "libx264",
                           "-preset", "veryfast", "-crf", "20", "-c:a", "copy", str(Path(out_path).resolve())],
                          seconds, progress, "Burning subtitles into the video", cwd=str(tmp))

    try:
        try:
            burn("ass=subs.ass:shaping=complex")
        except RuntimeError:  # older ffmpeg without the shaping option
            burn("ass=subs.ass")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return str(out_path)


def soft_subtitles(video, srt_files, out_path, progress=None):
    """Attach several subtitle tracks the viewer can switch on/off (mp4 players, VLC)."""
    cmd = ["ffmpeg", "-y", "-i", str(video)]
    for _, path in srt_files:
        cmd += ["-i", str(path)]
    cmd += ["-map", "0:v?", "-map", "0:a?"]
    for i in range(len(srt_files)):
        cmd += ["-map", str(i + 1)]
    cmd += ["-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text"]
    for i, (label, _) in enumerate(srt_files):
        code = config.LANGUAGES.get(label, ("und",))[0]
        cmd += [f"-metadata:s:s:{i}", f"title={label}", f"-metadata:s:s:{i}", f"language={code[:3]}"]
    run_with_progress(cmd + [str(out_path)], media_duration(video), progress, "Adding subtitle tracks")
    return str(out_path)


def dub(video, cues, voice, out_path, original_volume=0.15, progress=None):
    """Generate a voice-over from translated cues and mix it under/over the original."""
    from . import tts
    sess = tts.VoiceSession(voice)
    sr = tts.sample_rate()
    original = load(video, sr=sr)
    track = np.zeros(len(original) + sr * 5, dtype=np.float32)
    lines = span(progress, 0.0, 0.9)
    for i, (start, end, text) in enumerate(cues):
        if lines:
            lines(i / len(cues), desc=f"Dubbing line {i + 1}/{len(cues)}")
        if not text.strip():
            continue
        nxt = cues[i + 1][0] if i + 1 < len(cues) else end + 2
        slot = max(end, nxt) - start
        a = fit_duration(sess.say(text), sr, slot)
        a0 = int(start * sr)
        need = a0 + len(a)
        if need > len(track):
            track = np.concatenate([track, np.zeros(need - len(track), dtype=np.float32)])
        track[a0:need] += a
    track = track[: max(len(original), int(np.nonzero(track)[0][-1]) + 1 if track.any() else len(original))]
    mix = track.copy()
    mix[: len(original)] += original[: len(mix)] * original_volume
    peak = np.max(np.abs(mix)) or 1.0
    mix = mix / max(1.0, peak / 0.98)
    wav = Path(out_path).with_suffix(".dub.wav")
    sf.write(wav, mix, sr)
    mixing = span(progress, 0.9, 1.0)
    seconds = len(mix) / sr
    if has_video_stream(video):
        run_with_progress(["ffmpeg", "-y", "-i", str(video), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                           "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(out_path)], seconds, mixing, "Mixing the voice-over")
        return str(out_path)
    mp3 = Path(out_path).with_suffix(".mp3")
    run_with_progress(["ffmpeg", "-y", "-i", str(wav), "-b:a", "192k", str(mp3)], seconds, mixing, "Mixing the voice-over")
    return str(mp3)


def process(source, source_lang, targets, burn_lang=None, soft_subs=True,
            dub_lang=None, dub_voice=None, original_volume=0.15, progress=None):
    """Full pipeline. `source` is a URL or a local file path. Returns dict of results.

    Progress fills one bar across the steps the job runs (WEIGHTS): download, transcribe, translate (split evenly
    between the languages), burn-in / subtitle tracks, dubbing.

    Resumable (studio/cache.py): a link downloaded, or a source transcribed with the same spoken-language choice, in
    the last 24 h is reused, and the bar jumps past that step. Partial success: a language no translation service would
    do is left out with a line in `warnings` (and its name in `missing`); burning in a missing language falls back to
    switchable subtitle tracks (so does an ffmpeg that cannot burn subtitles), dubbing into one is skipped. Only a source
    without speech fails the job.
    """
    is_url = isinstance(source, str) and re.match(r"^https?://", source.strip())
    job = new_job_dir("link" if is_url else Path(source).stem)
    log, warnings, missing = [], [], []
    dubbing = bool(dub_lang and dub_lang != "(no dubbing)")
    plan = Plan(progress, [
        ("download", WEIGHTS["download"] if is_url else 0),
        ("transcribe", WEIGHTS["transcribe"]),
        ("translate", WEIGHTS["translate"] if targets or dubbing else 0),
        ("subtitles", WEIGHTS["subtitles"] if burn_lang or soft_subs else 0),
        ("dub", WEIGHTS["dub"] if dubbing else 0),
    ])
    key = cache.key_for_url(source) if is_url else cache.key_for_file(source)
    if is_url:
        downloading = plan.step("download", "Downloading video")
        hit = cache.get_download(key, job)
        if hit:
            media, title, age = hit
            if downloading:
                downloading(1.0, desc=f"Using the download from {cache.age_text(age)}")
            log.append(f"Used the download from {cache.age_text(age)}: {title}")
        else:
            media, title = download(source.strip(), job, progress=downloading)
            cache.put_download(key, media, title)
            log.append(f"Downloaded: {title}")
    else:
        media = str(job / ("source" + Path(source).suffix))
        shutil.copy(source, media)
        title = Path(source).stem

    transcribing = plan.step("transcribe", "Transcribing")
    hit = cache.get_transcript(key, source_lang)
    if hit:
        cues, detected, age = hit
        if transcribing:
            transcribing(1.0, desc=f"Using the transcript from {cache.age_text(age)}")
    else:
        cues, detected = asr.transcribe(media, source_lang, progress=transcribing)
        if cues:
            cache.put_transcript(key, source_lang, cues, detected)
    if not cues:
        raise RuntimeError("No speech was found in this file.")
    src_label = detected if detected != "Auto detect" else "Original"
    log.append(f"Transcribed {len(cues)} lines (language: {src_label}).")

    srt_files = [(src_label, subtitles.write_srt(cues, job / f"subtitles_{src_label}.srt"))]
    by_lang = {src_label: cues}
    langs = [t for t in dict.fromkeys(targets or []) if t != src_label]
    if dubbing and dub_lang != src_label and dub_lang not in langs:
        langs.append(dub_lang)  # translated for the voice-over only, no subtitle file
    translating = plan.step("translate", "Translating")
    for i, t in enumerate(langs):
        try:
            tc = translate.translate_cues(cues, t, progress=span(translating, i / len(langs), (i + 1) / len(langs), f"Translating to {t}"),
                                          source_label=detected if detected in config.LANGUAGES else None)
        except translate.TranslationUnavailable as e:
            missing.append(t)
            made = f"{t} subtitles" if t in (targets or []) else f"The {t} voice-over"
            warnings.append(f"{made} couldn't be made: {e.reason}. Try again later.")
            log.append(f"Not translated to {t}: {e.reason}.")
            continue
        by_lang[t] = tc
        if t in (targets or []):
            srt_files.append((t, subtitles.write_srt(tc, job / f"subtitles_{t}.srt")))
            log.append(f"Translated to {t}.")

    result = {"job_dir": str(job), "srt_files": [p for _, p in srt_files], "cues": by_lang, "language": src_label,
              "video": None, "dubbed": None, "log": log, "title": title, "warnings": warnings, "missing": missing}

    base_video = media
    if has_video_stream(media):
        burn_missing = bool(burn_lang) and burn_lang not in dict(srt_files)
        if burn_missing:
            warnings.append(f"{burn_lang} subtitles weren't burned into the video, so it has switchable subtitle tracks instead.")
        burned = False
        if burn_lang and not burn_missing:
            try:
                base_video = burn_subtitles(media, dict(srt_files)[burn_lang], job / f"video_{burn_lang}_subs.mp4",
                                            progress=plan.step("subtitles", f"Burning {burn_lang} subtitles into the video"))
                burned = True
                log.append(f"Burned {burn_lang} subtitles into the video.")
            except RuntimeError as e:  # e.g. an ffmpeg built without libass (no `ass` filter)
                print(f"[video] burning subtitles failed: {e}")
                warnings.append(f"{burn_lang} subtitles couldn't be burned into the video (this ffmpeg can't draw subtitles; "
                                "install one with libass), so it has switchable subtitle tracks instead.")
        if not burned and (soft_subs or burn_lang):
            base_video = soft_subtitles(media, srt_files, job / "video_with_subtitle_tracks.mp4",
                                        progress=plan.step("subtitles", "Adding subtitle tracks"))
            log.append("Added switchable subtitle tracks.")
        result["video"] = base_video

    if dubbing and dub_lang in missing:
        log.append(f"Skipped dubbing into {dub_lang}: no translation.")
    elif dubbing:
        dcues = by_lang.get(dub_lang) or cues
        result["dubbed"] = dub(base_video, dcues, dub_voice, job / f"dubbed_{dub_lang}.mp4",
                               original_volume=original_volume, progress=plan.step("dub", f"Dubbing into {dub_lang}"))
        log.append(f"Dubbed into {dub_lang}.")
    return result
