# Backend (FastAPI)

## System dependencies

The backend decodes and analyses audio and **requires these system packages**:

| Package       | Why                                                                 |
| ------------- | ------------------------------------------------------------------- |
| `ffmpeg`      | Decoding MP3/OGG/M4A etc. for `librosa.load` and `pydub`             |
| `libsndfile1` | Native WAV/FLAC/AIFF I/O used by `soundfile` (a `librosa` dependency) |

Debian/Ubuntu:

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg libsndfile1
```

macOS: `brew install ffmpeg libsndfile`.

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

`GET /api/health` -> `{"status": "ok", "version": "0.1.0"}`

The frontend E2E suite (`cd frontend && npm run test:e2e`) starts this backend itself via
`. .venv/bin/activate && uvicorn app.main:app --port 8000` from `backend/`, so the `.venv`
above must exist (or an already-running server on port 8000 is reused outside CI).

## Quality gates

```bash
pytest          # tests
ruff check .    # lint
ruff format --check .
mypy app        # strict typing
```

## Conventions

- Temporary audio artifacts go under `backend/tmp/` (git-ignored, created on startup).
- Never commit `.wav`, `.mp3`, `.midi`/`.mid` files.
- Every Pydantic model in `app/schemas.py` mirrors an interface in `frontend/src/types/api.ts`.
