import numpy as np

from app.audio.analysis import duration_seconds, estimate_tempo


def _click_track(bpm: float, seconds: float, sr: int = 22050) -> np.ndarray:
    y = np.zeros(int(seconds * sr), dtype=np.float32)
    step = int(sr * 60 / bpm)
    y[::step] = 1.0
    return y


def test_duration_seconds() -> None:
    sr = 22050
    assert duration_seconds(np.zeros(sr * 3, dtype=np.float32), sr) == 3.0


def test_estimate_tempo_on_click_track() -> None:
    sr = 22050
    bpm = estimate_tempo(_click_track(120, 10, sr), sr)
    assert 110 < bpm < 130
