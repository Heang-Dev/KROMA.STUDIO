"""Progress in phases: each studio step reports its own 0..1, the job shows one bar that only moves forward.

Every studio function takes `progress(fraction, desc="")` (the engine's server.Progress, or Gradio's gr.Progress).
`span()` hands a step a callable that maps the step's 0..1 into its slice [start, end] of the whole job, so a
pipeline (download -> transcribe -> translate -> subtitles -> dub) fills one bar instead of restarting it per step.
`Plan` splits 0..1 between the steps a job actually runs, by weight.

>>> seen = []
>>> step = span(lambda f, desc="": seen.append((round(f, 3), desc)), 0.2, 0.6, "Transcribing")
>>> step(0.5, desc="Transcribing 4/8"); step(2.0); seen
[(0.4, 'Transcribing 4/8'), (0.6, 'Transcribing')]
>>> plan = Plan(None, [("download", 15), ("transcribe", 40), ("dub", 0)])
>>> [(name, round(a, 3), round(b, 3)) for name, (a, b) in plan.slices.items()]
[('download', 0.0, 0.273), ('transcribe', 0.273, 1.0)]
>>> plan.step("dub") is None
True
"""


def clamp(value):
    """A fraction in 0..1 (garbage -> 0)."""
    try:
        value = float(value)
    except (TypeError, ValueError):
        return 0.0
    if value != value:  # NaN
        return 0.0
    return max(0.0, min(1.0, value))


def span(progress, start, end, label=""):
    """A `progress(fraction, desc)` for one step that fills [start, end] of `progress`; None when there is none.

    Uses `progress.phase()` when the reporter has it (the engine's monotonic Progress), else wraps any callable
    (Gradio's gr.Progress, a nested span). Calling the result with no desc shows `label`.
    """
    if progress is None:
        return None
    phase = getattr(progress, "phase", None)
    if callable(phase):
        return phase(start, end, label)

    def report(fraction, desc=""):
        progress(start + (end - start) * clamp(fraction), desc=desc or label)

    return report


class Plan:
    """Splits 0..1 between named steps by weight; steps with weight 0 (not run) take no room."""

    def __init__(self, progress, weights, start=0.0, end=1.0):
        self.progress = progress
        todo = [(name, float(w)) for name, w in weights if w and w > 0]
        total = sum(w for _, w in todo) or 1.0
        self.slices = {}
        at = start
        for name, w in todo:
            nxt = at + (end - start) * w / total
            self.slices[name] = (at, nxt)
            at = nxt

    def step(self, name, label=""):
        """The step's reporter (starts it at its slice's beginning with `label`); None if the step is not planned."""
        if self.progress is None or name not in self.slices:
            return None
        start, end = self.slices[name]
        report = span(self.progress, start, end, label)
        report(0.0, desc=label)
        return report
