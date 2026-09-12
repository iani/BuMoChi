"""Audio analysis helpers built on librosa.

All functions operate on in-memory arrays or on files under ``settings.tmp_dir``;
nothing here should ever write outside ``backend/tmp/``.
"""

from pathlib import Path

import librosa
import librosa.feature.rhythm
import numpy as np
from numpy.typing import NDArray


def load_mono(path: Path, sr: int | None = None) -> tuple[NDArray[np.float32], int]:
    """Load an audio file as a mono float32 signal (requires ffmpeg for non-WAV input)."""
    y, out_sr = librosa.load(path, sr=sr, mono=True)
    return y.astype(np.float32), int(out_sr)


def estimate_tempo(y: NDArray[np.float32], sr: int) -> float:
    """Return the dominant tempo in BPM."""
    tempo = librosa.feature.rhythm.tempo(y=y, sr=sr)
    return float(np.atleast_1d(tempo)[0])


def duration_seconds(y: NDArray[np.float32], sr: int) -> float:
    return float(len(y) / sr)
