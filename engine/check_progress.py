"""Self-check for the progress plumbing (no models, no pytest): runs the doctests of the phase mapping, the
monotonic job bar, the yt-dlp download hook and the ffmpeg progress parser, then one real ffmpeg encode through
run_with_progress when ffmpeg is installed.

Run:  .venv/bin/python check_progress.py
"""
import doctest
import shutil
import sys
import tempfile
from pathlib import Path

import server
from studio import audio_utils, progress, video

failed = 0
for module in (progress, server, video, audio_utils):
    result = doctest.testmod(module)
    print(f"{module.__name__}: {result.attempted - result.failed}/{result.attempted} passed")
    failed += result.failed

if shutil.which("ffmpeg"):
    out = Path(tempfile.mkdtemp()) / "clip.mp4"
    seen = []
    audio_utils.run_with_progress(["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=4:size=320x240:rate=25",
                                   "-c:v", "libx264", "-preset", "ultrafast", str(out)], 4.0,
                                  lambda f, desc="": seen.append(f), "Encoding")
    rising = all(b >= a for a, b in zip(seen, seen[1:]))
    print(f"ffmpeg progress: {len(seen)} reports, last {seen[-1] if seen else None}, rising {rising}")
    failed += 0 if seen and rising and seen[-1] > 0.9 else 1
    shutil.rmtree(out.parent, ignore_errors=True)

sys.exit(1 if failed else 0)
