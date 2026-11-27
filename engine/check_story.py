"""Self-check for story scripts (no models, no pytest): runs the doctests of the story parser in text_utils and of
the story timing and redo splice in tts (a stub voice; the model is never loaded).

Run:  .venv/bin/python check_story.py
"""
import doctest
import sys

from studio import text_utils, tts

failed = 0
for module in (text_utils, tts):
    result = doctest.testmod(module)
    print(f"{module.__name__}: {result.attempted - result.failed}/{result.attempted} passed")
    failed += result.failed
for module, name in ((text_utils, "parse_story"), (tts, "splice"), (tts, "synthesize_dialogue")):
    if ">>>" not in (getattr(getattr(module, name, None), "__doc__", None) or ""):
        print(f"{name} has no doctests")
        failed += 1
sys.exit(1 if failed else 0)
