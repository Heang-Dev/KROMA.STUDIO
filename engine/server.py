"""Kroma's voice engine: a small HTTP job runner around the `studio` package.

Kroma (src/main/kvs.ts, src/main/story.ts) sends work here and polls for the result; Kroma installs and starts it
(src/main/engine.ts), or it runs on a Colab GPU (engine/colab). The engine keeps no voice library of
its own: every request carries the reference audio it needs, so the engine can run on this Mac or on a Colab GPU.

Run:  python server.py            (http://127.0.0.1:7861)
      KVS_ENGINE_TOKEN=secret python server.py --host 0.0.0.0 --port 7861

API (all but /health need `Authorization: Bearer <KVS_ENGINE_TOKEN>` when the token is set):
  GET    /health                     engine, device and Ollama status
  GET    /meta                       languages and voice-design presets
  POST   /jobs                       multipart: kind, params (JSON), files (voice_<key>, media, base) -> {id}
  GET    /jobs/{id}                  status, progress, message, result, files, started, eta_seconds
  GET    /jobs/{id}/files/{name}     download one result file
  DELETE /jobs/{id}                  forget a job and delete its files

Progress is one bar per job that only moves forward: `progress` 0..1 and `message` (the step and its detail, e.g.
"Transcribing 16/40"), filled by phases (see PHASES and studio/progress.py): tts / story: loading the voice model 0-5 %,
speaking 5-95 %, saving 95-100 %; transcribe: reading + loading the model 0-5 %, the speech 5-100 %; translate: each
target language an equal share; video: download 15, transcribe 40, translate 15, burn-in / subtitle tracks 15,
dubbing 15 (weights over the steps the job runs; studio/video.py WEIGHTS), then "Finishing". `started` is when the job
began running (epoch seconds) and `eta_seconds` a rough estimate of the time left (null until 10 % is done).

Partial success: `translate` and `video` results carry `warnings` (sentences for people naming why, e.g. "Khmer
subtitles couldn't be made: the translator failed (…) and Google Translate limit reached") and `missing` (the target
languages no translator would do right now, studio/translate.py: NLLB-200 on this machine first — KVS_TRANSLATOR,
KVS_NLLB_MODEL —, then batched, throttled Google Translate with backoff, MyMemory last; cached by text). A `video`
result names the spoken `language` (Whisper's detection with "Auto detect"; "Original" when it isn't one we list). The job still ends `done` with the languages that worked; only a
source without speech fails it.

Story: params `script` (lines "Sokha: text" / "Sokha (whisper): text"; a line of only "[pause 2s]" is silence that
takes the place of the gap between lines; inline "[pause 1s]" pauses inside a line) and `speakers` ({name: {voice,
style}}). Redo one line: params `redo: {"line": n}` (0-based, spoken lines only, pauses not counted) and `cues` (the
old job's [[start, end, text], ...]), input file `base` (the old story.wav). Only that line is spoken again and put in
place; later cues move. Result `seconds`, `cues` and, for a redo, `redone: n`.

Resume: a `video` link's download and a `video` / `transcribe` source's transcript are kept 24 h in
OUTPUTS_DIR/cache (studio/cache.py: KVS_CACHE_SECONDS, KVS_CACHE_MAX_BYTES 5 GB, least recently used first), so a
retried job skips those steps ("Using the download from 3 minutes ago"). Trimmed at start-up and after every job.
"""
from __future__ import annotations

import argparse
import json
import os
import queue
import shutil
import threading
import time
import traceback
import uuid
from pathlib import Path
from typing import Any, Callable

from fastapi import Depends, FastAPI, Form, Header, HTTPException, Request
from fastapi.responses import FileResponse

from studio import config

TOKEN = os.environ.get("KVS_ENGINE_TOKEN", "")
JOBS_DIR = config.OUTPUTS_DIR / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)
KEEP_SECONDS = int(os.environ.get("KVS_ENGINE_KEEP_SECONDS", str(24 * 3600)))
KINDS = ("tts", "story", "design", "prepare_voice", "transcribe", "translate", "caption", "video")
HIDDEN = ("source.", "upload_", "voice_", "base.")

app = FastAPI(title="Kroma voice engine", version="1.0")
_jobs: dict[str, dict[str, Any]] = {}
_queue: "queue.Queue[str]" = queue.Queue()
_lock = threading.Lock()


def _auth(authorization: str = Header(default="")) -> None:
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid engine token.")


# ------------------------------------------------------------------ jobs
class JobCancelled(Exception):
    """Stops a running job whose cancel was asked for (DELETE /jobs/<id>): raised at its next progress report."""

    def __init__(self) -> None:
        super().__init__("Cancelled")


class Progress:
    """The `progress(fraction, desc=...)` callable the studio functions expect, for one job's whole bar.

    Never goes back: a lower fraction keeps the bar where it is (the message still updates). `phase(start, end,
    label)` gives a step its own 0..1 mapped into [start, end] of the bar (studio.progress.span uses it). The first
    moment the bar moves is kept for the time-left estimate.

    >>> job = {"progress": 0.0, "message": ""}
    >>> bar = Progress(job)
    >>> bar(0.1, "Loading"); bar(0.05, "Still loading"); (job["progress"], job["message"])
    (0.1, 'Still loading')
    >>> step = bar.phase(0.5, 0.9, "Transcribing")
    >>> step(0.5); (job["progress"], job["message"])
    (0.7, 'Transcribing')
    >>> step(0.25, "Transcribing 2/8"); bar(2); job["progress"]
    1.0

    Once a cancel was asked for (DELETE on the running job), the next report stops the job:

    >>> job["cancel"] = True
    >>> bar(0.5, "Line 3/9")  # doctest: +IGNORE_EXCEPTION_DETAIL
    Traceback (most recent call last):
    JobCancelled: Cancelled

    Only the job's own thread stops; a helper thread (the ticker that moves the bar while a line is spoken) just
    stops reporting, and the job stops when the line is done:

    >>> job["runner"] = -1  # the job runs on another thread
    >>> bar(0.6, "about 4 s left"); job["progress"]
    1.0
    """

    def __init__(self, job: dict[str, Any]):
        self.job = job

    def __call__(self, fraction: float, desc: str = "") -> None:
        if self.job.get("cancel"):
            if self.job.get("runner") in (None, threading.get_ident()):
                raise JobCancelled()
            return  # a helper thread: the job stops on its own thread
        from studio.progress import clamp
        value = round(clamp(fraction), 3)
        if value > self.job["progress"]:
            now = time.time()
            if self.job.get("moved") is None:
                self.job["moved"] = (now, self.job["progress"])
            self.job["progress"], self.job["changed"] = value, now
        if desc:
            self.job["message"] = desc

    def phase(self, start: float, end: float, label: str = ""):
        from studio.progress import clamp

        def report(fraction: float, desc: str = "") -> None:
            self(start + (end - start) * clamp(fraction), desc or label)

        return report


def _eta(job: dict[str, Any]) -> int | None:
    """Seconds left at the pace so far (from the bar's first move to its last), counting down from that last move,
    once at least 10 % is done; None before that, and once the estimate has run out (the step is slower than it)."""
    moved, changed, value = job.get("moved"), job.get("changed"), job["progress"]
    if job["status"] != "running" or not moved or not changed or value < 0.1 or value >= 1 or value - moved[1] < 0.02:
        return None
    rate = (value - moved[1]) / max(1e-6, changed - moved[0])
    left = round((1 - value) / rate - (time.time() - changed))
    return left if left > 0 else None


def _public(job: dict[str, Any]) -> dict[str, Any]:
    files = []
    d = Path(job["dir"])
    if job["status"] == "done" and d.exists():
        for f in sorted(d.iterdir()):
            if f.is_file() and not f.name.startswith(HIDDEN):
                files.append({"name": f.name, "size": f.stat().st_size})
    return {k: job[k] for k in ("id", "kind", "status", "progress", "message", "error", "result", "created", "finished")} | {
        "started": job.get("started"), "eta_seconds": _eta(job), "files": files}


def _voice(spec: dict[str, Any] | None, d: Path) -> dict[str, Any]:
    """A request voice spec -> the dict tts.VoiceSession wants. {ref: <uploaded file key>, transcript, design}."""
    if not spec:
        return {"name": "(default)"}
    out: dict[str, Any] = {"name": spec.get("name") or "voice"}
    if spec.get("ref"):
        path = d / f"voice_{spec['ref']}.wav"
        if not path.exists():
            raise ValueError(f"Reference audio for voice '{out['name']}' was not sent.")
        out["ref"] = str(path)
        out["transcript"] = spec.get("transcript") or ""
    elif spec.get("design"):
        out["design"] = spec["design"]
    return out


def _media(d: Path) -> str:
    found = sorted(d.glob("upload_media*"))
    if not found:
        raise ValueError("No media file was sent.")
    return str(found[0])


def _save_tts(audio, sr, cues, d: Path, stem: str) -> dict[str, Any]:
    from studio import subtitles
    from studio.audio_utils import save_audio

    save_audio(audio, sr, str(d / f"{stem}.wav"))
    subtitles.write_srt(cues, d / f"{stem}.srt")
    return {"seconds": round(len(audio) / sr, 2), "cues": [[round(s, 3), round(e, 3), t] for s, e, t in cues]}


def _model_cached(repo_id: str) -> bool:
    """True when the Hugging Face model is already on disk (no download needed)."""
    try:
        from huggingface_hub import snapshot_download
        snapshot_download(repo_id, local_files_only=True)
        return True
    except Exception:
        return False


def _warm_up(kind: str, p: dict[str, Any], progress: Progress) -> None:
    """Say what is happening while the voice model downloads / loads, instead of sitting at 0 % on "Starting".
    The first 5 % of a speaking job (tts, story, design) is this step; a video's dubbing loads the model at 0 %."""
    from studio import tts
    needs_tts = kind in ("tts", "story", "design") or (kind == "video" and p.get("dub_lang"))
    ready = 0.05 if kind in ("tts", "story", "design") else 0.0
    if needs_tts and tts._model is None:
        if _model_cached(config.TTS_MODEL):
            progress(0.0, "Loading the voice model")
        else:
            progress(0.0, "Downloading the voice model (first time only, about 5 GB)")
        tts.get_model()
        progress(ready, "Voice model ready")
    elif needs_tts:
        progress(ready, "Voice model ready")
    elif kind in ("transcribe", "video") or (kind == "prepare_voice" and p.get("transcribe")):
        progress(0.0, "Loading the speech recognition model (the first time downloads it)")


def _run(job: dict[str, Any]) -> dict[str, Any]:
    kind, p, d, progress = job["kind"], job["params"], Path(job["dir"]), Progress(job)
    _warm_up(kind, p, progress)

    if kind == "tts":
        from studio import tts
        audio, sr, cues = tts.synthesize(p.get("text", ""), _voice(p.get("voice"), d), p.get("style", ""),
            progress=progress.phase(0.05, 0.95, "Speaking"))
        progress(0.95, "Saving the audio")
        return _save_tts(audio, sr, cues, d, "speech")

    if kind == "story":
        from studio import tts
        from studio.text_utils import parse_story
        items = parse_story(p.get("script", ""))
        lines = [i for i in items if i["type"] == "line"]
        if not lines:
            raise ValueError("Write a script first, e.g.  Narrator: ...  /  Sokha: ...")
        speakers = {name: (_voice(s.get("voice"), d), s.get("style", "")) for name, s in (p.get("speakers") or {}).items()}
        if p.get("redo"):
            import soundfile as sf
            n = int((p.get("redo") or {}).get("line", -1))
            if not (d / "base.wav").is_file():
                raise ValueError("The story to redo was not sent.")
            cues = [(float(s), float(e), str(t)) for s, e, t in p.get("cues") or []]
            if not 0 <= n < len(lines) or n >= len(cues):
                raise ValueError(f"This story has no line {n + 1}.")
            base, sr = sf.read(str(d / "base.wav"), dtype="float32", always_2d=True)
            audio, sr, cues = tts.redo_line(base.mean(axis=1), sr, cues, n, lines[n], speakers,
                progress=progress.phase(0.05, 0.95, f"Speaking line {n + 1}"),
                lines=lines)
            progress(0.95, "Saving the audio")
            return {**_save_tts(audio, sr, cues, d, "story"), "redone": n}
        audio, sr, cues = tts.synthesize_dialogue(items, speakers, progress=progress.phase(0.05, 0.95, "Speaking"))
        progress(0.95, "Saving the audio")
        return _save_tts(audio, sr, cues, d, "story")

    if kind == "design":
        from studio import tts
        from studio.audio_utils import save_audio
        if not (p.get("description") or "").strip():
            raise ValueError("Describe the voice first.")
        from studio.audio_utils import median_pitch
        text = p.get("sample_text") or "សួស្តី នេះគឺជាសំឡេងថ្មីរបស់ខ្ញុំ។"
        # A designed voice is a little random each time and can miss the gender or age it was asked for ("male news
        # anchor" coming out as a woman). With `pitch: [low, high]` (Hz) the voice is designed again, up to `attempts`
        # times, until its median pitch fits; otherwise the closest attempt is kept.
        pitch = p.get("pitch")
        attempts = max(1, min(8, int(p.get("attempts") or (5 if pitch else 1))))
        best = None
        for attempt in range(attempts):
            label = "Designing the voice" + (f" (try {attempt + 1}/{attempts})" if attempts > 1 else "")
            audio = tts.say_with_progress(tts.VoiceSession({"name": "design", "design": p["description"]}), text, progress,
                                          0.05 + 0.85 * attempt / attempts, 0.05 + 0.85 * (attempt + 1) / attempts, label)
            hz = median_pitch(audio, tts.sample_rate()) if pitch else None
            miss = 0.0 if not pitch or hz is None else max(0.0, pitch[0] - hz, hz - pitch[1])
            if best is None or miss < best[2]:
                best = (audio, hz, miss, attempt + 1)
            if miss == 0.0:
                break
        audio, hz, miss, used = best
        progress(0.95, "Saving the preview")
        save_audio(audio, tts.sample_rate(), str(d / "preview.wav"), mp3=False)
        result = {"seconds": round(len(audio) / tts.sample_rate(), 2), "attempts": used}
        if pitch:
            result.update({"pitch_hz": None if hz is None else round(hz), "pitch_ok": miss == 0.0})
        return result

    if kind == "prepare_voice":
        from studio.audio_utils import prepare_reference
        progress(0.05, "Cleaning the voice sample")
        _, seconds = prepare_reference(_media(d), str(d / "ref.wav"))
        transcript = ""
        if p.get("transcribe"):
            from studio import asr
            progress(0.3, "Writing down what was said")
            cues, _ = asr.transcribe(str(d / "ref.wav"), p.get("language") or "Khmer", progress=progress.phase(0.3, 0.95, "Writing down what was said"))
            transcript = " ".join(c[2] for c in cues)
        return {"seconds": round(seconds, 2), "transcript": transcript}

    if kind == "transcribe":
        from studio import asr, cache, subtitles
        media, language = _media(d), p.get("language") or "Auto detect"
        key = cache.key_for_file(media)
        hit = cache.get_transcript(key, language)
        if hit:
            cues, language, age = hit
            progress(1.0, f"Using the transcript from {cache.age_text(age)}")
        else:
            cues, language = asr.transcribe(media, language, progress=progress)
            if cues:
                cache.put_transcript(key, p.get("language") or "Auto detect", cues, language)
        if not cues:
            raise ValueError("No speech was found in this file.")
        subtitles.write_srt(cues, d / "subtitles.srt")
        return {"language": language, "cues": [[round(s, 3), round(e, 3), t] for s, e, t in cues]}

    if kind == "translate":
        from studio import subtitles, translate
        cues = [(float(s), float(e), str(t)) for s, e, t in p.get("cues") or []]
        if not cues:
            raise ValueError("There are no subtitle lines to save.")
        subtitles.write_srt(cues, d / "subtitles.srt")
        by_lang, warnings, missing = {}, [], []
        targets = p.get("targets") or []
        for i, target in enumerate(targets):
            try:
                tc = translate.translate_cues(cues, target, progress=progress.phase(i / len(targets), (i + 1) / len(targets), f"Translating to {target}"),
                    source_label=p.get("source_lang") or None)
            except translate.TranslationUnavailable as e:  # keep the other languages; the job ends done with a warning
                missing.append(target)
                warnings.append(f"{target} subtitles couldn't be made: {e.reason}. Try again later.")
                continue
            subtitles.write_srt(tc, d / f"subtitles_{target}.srt")
            by_lang[target] = [[s, e, t] for s, e, t in tc]
        return {"translations": by_lang, "warnings": warnings, "missing": missing}

    if kind == "caption":
        from studio import captions
        progress(0.2, "Writing the caption")
        return {"caption": captions.make_caption(p.get("transcript", ""), p.get("language", "Khmer"), p.get("platform", "Facebook"), p.get("tone", "friendly"))}

    if kind == "video":
        from studio import video
        source = (p.get("url") or "").strip() or _media(d)
        dub_voice = _voice(p.get("dub_voice"), d) if p.get("dub_lang") else None
        res = video.process(source, p.get("source_lang") or "Auto detect", p.get("targets") or [], burn_lang=p.get("burn_lang") or None,
            soft_subs=bool(p.get("soft_subs", True)), dub_lang=p.get("dub_lang") or None, dub_voice=dub_voice,
            original_volume=float(p.get("original_volume", 0.15)), progress=progress.phase(0.0, 0.98))
        progress(0.98, "Finishing")
        out = Path(res["job_dir"])
        for f in out.iterdir():
            if f.is_file() and not f.name.startswith("source."):
                shutil.move(str(f), d / f.name)
        shutil.rmtree(out, ignore_errors=True)
        return {"title": res.get("title"), "language": res.get("language"), "log": res.get("log", []), "video": Path(res["video"]).name if res.get("video") else None,
            "dubbed": Path(res["dubbed"]).name if res.get("dubbed") else None, "warnings": res.get("warnings", []), "missing": res.get("missing", [])}

    raise ValueError(f"Unknown job kind: {kind}")


def _execute(job: dict[str, Any], run: Callable[[dict[str, Any]], dict[str, Any]] | None = None) -> None:
    """Runs one job to its end: done, failed, or cancelled (its files are removed then).

    >>> import tempfile
    >>> job = {"status": "running", "progress": 0.0, "message": "", "dir": tempfile.mkdtemp()}
    >>> def lines(job): Progress(job)(0.2, "Line 1/9"); job["cancel"] = True; Progress(job)(0.3, "Line 2/9")
    >>> _execute(job, lines); (job["status"], job["message"], Path(job["dir"]).exists())
    ('cancelled', 'Cancelled', False)
    >>> job = {"status": "running", "progress": 0.0, "message": "", "dir": tempfile.mkdtemp()}
    >>> _execute(job, lambda job: {"wav": "a.wav"}); (job["status"], job["result"], job["progress"])
    ('done', {'wav': 'a.wav'}, 1.0)
    """
    job["runner"] = threading.get_ident()
    try:
        job["result"] = (run or _run)(job)
        job.update(status="done", progress=1.0, message="Done")
    except JobCancelled:
        job.update(status="cancelled", message="Cancelled")
        shutil.rmtree(job["dir"], ignore_errors=True)
    except Exception as e:  # reported to the dashboard as the job's error
        traceback.print_exc()
        job.update(status="failed", error=str(e) or e.__class__.__name__)


def _worker() -> None:
    """One job at a time: the models share one GPU."""
    while True:
        job_id = _queue.get()
        job = _jobs.get(job_id)
        if not job or job["status"] != "queued":
            continue
        job.update(status="running", message="Starting", started=time.time())
        try:
            _execute(job)
        finally:
            job["finished"] = time.time()
            _prune()


def _prune() -> None:
    """Forget finished jobs older than KEEP_SECONDS and trim the resume cache (studio/cache.py)."""
    from studio import cache
    cutoff = time.time() - KEEP_SECONDS
    with _lock:
        for job_id, job in list(_jobs.items()):
            if job.get("finished") and job["finished"] < cutoff:
                shutil.rmtree(job["dir"], ignore_errors=True)
                _jobs.pop(job_id, None)
    try:
        cache.prune()
    except OSError as e:
        print(f"[cache] prune failed: {e}")


# ------------------------------------------------------------------ routes
@app.get("/health")
def health() -> dict[str, Any]:
    from studio import captions
    device = config.TTS_DEVICE
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    except Exception:
        pass
    busy = sum(1 for j in _jobs.values() if j["status"] in ("queued", "running"))
    return {"ok": True, "version": app.version, "device": device, "tts_model": config.TTS_MODEL, "asr_khmer": config.ASR_MODEL_KHMER,
        "asr_multi": config.ASR_MODEL_MULTI, "ollama": captions.ollama_available(), "busy": busy, "auth": bool(TOKEN)}


@app.get("/meta", dependencies=[Depends(_auth)])
def meta() -> dict[str, Any]:
    from studio.voices import DESIGN_PRESETS
    return {"languages": list(config.LANGUAGES.keys()), "design_presets": DESIGN_PRESETS}


@app.post("/jobs", dependencies=[Depends(_auth)])
async def create_job(request: Request, kind: str = Form(...), params: str = Form("{}")) -> dict[str, Any]:
    if kind not in KINDS:
        raise HTTPException(status_code=422, detail=f"Unknown job kind: {kind}")
    try:
        parsed = json.loads(params or "{}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"params is not valid JSON: {e}") from e
    job_id = uuid.uuid4().hex
    d = JOBS_DIR / job_id
    d.mkdir(parents=True)
    form = await request.form()
    for key, value in form.multi_items():
        if hasattr(value, "filename") and value.filename:
            if key == "media":
                target = d / f"upload_media{Path(value.filename).suffix.lower()}"
            elif key.startswith("voice_"):
                target = d / f"{key}.wav"
            elif key == "base":
                target = d / "base.wav"
            else:
                continue
            with target.open("wb") as fh:
                shutil.copyfileobj(value.file, fh)
    job = {"id": job_id, "kind": kind, "params": parsed, "dir": str(d), "status": "queued", "progress": 0.0, "message": "Waiting in line",
        "error": None, "result": None, "created": time.time(), "finished": None}
    with _lock:
        _jobs[job_id] = job
    _queue.put(job_id)
    return _public(job)


def _job(job_id: str) -> dict[str, Any]:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="This job is not on the engine (it may have restarted).")
    return job


@app.get("/jobs/{job_id}", dependencies=[Depends(_auth)])
def get_job(job_id: str) -> dict[str, Any]:
    return _public(_job(job_id))


@app.get("/jobs/{job_id}/files/{name}", dependencies=[Depends(_auth)])
def get_file(job_id: str, name: str) -> FileResponse:
    d = Path(_job(job_id)["dir"]).resolve()
    path = (d / name).resolve()
    if path.parent != d or not path.is_file() or name.startswith(HIDDEN):
        raise HTTPException(status_code=404, detail="No such file.")
    return FileResponse(path, filename=name)


@app.delete("/jobs/{job_id}", dependencies=[Depends(_auth)])
def delete_job(job_id: str) -> dict[str, bool]:
    """Cancels a job. A running one stops at its next progress report (within a line or so), then frees the engine
    for the next job; a queued or finished one goes at once.

    >>> _jobs["t-running"] = {"status": "running", "message": "Line 4/90", "dir": "/nonexistent"}
    >>> delete_job("t-running"), _jobs["t-running"]["cancel"], _jobs["t-running"]["message"]
    ({'ok': True}, True, 'Cancelling')
    >>> del _jobs["t-running"]
    """
    job = _job(job_id)
    if job["status"] == "running":
        job.update(cancel=True, message="Cancelling")
        return {"ok": True}
    job["status"] = "cancelled"
    shutil.rmtree(job["dir"], ignore_errors=True)
    with _lock:
        _jobs.pop(job_id, None)
    return {"ok": True}


threading.Thread(target=_prune, daemon=True, name="kvs-prune").start()  # expired cache from earlier runs
threading.Thread(target=_worker, daemon=True, name="kvs-worker").start()

if __name__ == "__main__":
    import uvicorn

    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default=os.environ.get("KVS_ENGINE_HOST", "127.0.0.1"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("KVS_ENGINE_PORT", "7861")))
    args = ap.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
