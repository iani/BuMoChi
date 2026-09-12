# SPEC — Test Audio Pipeline (EPIC #1)

## Overview

Smoke-test EPIC used to verify the Spec-to-PR cascade end to end (TPM → spec → task issue →
worker → PR → Devin Review). The deliverable is a single trivial FastAPI endpoint mounted under
`/api` that responds `200 OK` with an empty JSON object `{}`. No audio processing, no frontend
work, no new dependencies.

Inline spec from the triggering comment (takes precedence):
> Create a simple FastAPI endpoint that returns a 200 OK and an empty dummy json payload.
> Ensure the discord pager is not triggered.

"Discord pager not triggered" means: no issue or PR in this EPIC may receive the
`BLOCKED: human-attention` label unless a genuine blocker exists (see
`.github/workflows/discord-pager.yml`).

## User stories

- As a cascade operator, I can `GET /api/ping` and receive `200` with body `{}`, so I know the
  backend is deployed and routed correctly.
- As a maintainer, I can run `pytest` and see a test that asserts exactly that behaviour, so a
  regression fails CI.

## Frontend design

Out of scope for this EPIC. No components, no Zustand store slices, no Tone.js/WebAudio changes.
`frontend/src/types/api.ts` is **not** modified: see "Shared types" for the rationale.

## Backend design

### Endpoint

| Method | Path        | Status | Response body | Response model |
| ------ | ----------- | ------ | ------------- | -------------- |
| GET    | `/api/ping` | 200    | `{}`          | `PingResponse` |

- New router module `backend/app/routers/ping.py` exposing `router = APIRouter(tags=["ping"])`
  with a single `@router.get("/ping", response_model=PingResponse)` handler returning
  `PingResponse()`.
- Registered in `backend/app/main.py` via `app.include_router(ping.router, prefix="/api")`,
  alongside the existing `health` router. The `/api` prefix is applied at registration, exactly
  like `health`, so the router itself declares `/ping`.
- No query parameters, no request body, no authentication, no side effects. Handler is
  synchronous and fully typed (`def ping() -> PingResponse:`).

### Pydantic model

```python
class PingResponse(BaseModel):
    """Intentionally empty payload: serialises to {}."""
```

Exact fields: **none**. `PingResponse().model_dump()` is `{}`, so FastAPI serialises the response
as `{}`. Lives in `backend/app/schemas.py` next to `HealthResponse`.

### Audio processing

None. No ffmpeg, no libsndfile, no librosa/pydub usage, no writes to `backend/tmp/`.

## Shared types

| TS interface (`frontend/src/types/api.ts`) | Pydantic model (`backend/app/schemas.py`) | Fields |
| ------------------------------------------ | ----------------------------------------- | ------ |
| — (not added)                               | `PingResponse`                            | none   |

Rationale: the mirror rule in `AGENTS.md` applies to contracts crossing the frontend/backend
boundary. `/api/ping` is never called by the frontend (this EPIC is explicitly "no frontend
work"), and an empty TS interface (`export interface PingResponse {}`) is rejected by
`@typescript-eslint/no-empty-object-type`. Therefore no TS mirror is added. If a future task makes
the frontend call `/api/ping`, that task must add the mirror at that time.

## Test plan

### pytest (`backend/tests/test_ping.py`) — written first

1. `test_ping_returns_200_and_empty_object` — `client.get("/api/ping")` →
   `res.status_code == 200` and `res.json() == {}`.
2. `test_ping_response_model_is_empty` — `PingResponse().model_dump() == {}` (guards against a
   field being added silently).

Uses the existing `client` fixture in `backend/tests/conftest.py`. Both tests must be observed
failing (import/404) before the implementation is written, per the TDD rule in `AGENTS.md`.

### Vitest

None — no frontend change.

### Quality gates

`pytest`, `ruff check .`, `ruff format --check .`, `mypy app` all green; CI green on the PR.

## Task breakdown

| # | Task | Depends on |
| - | ---- | ---------- |
| 1 | Add `GET /api/ping` returning `200 {}` with pytest coverage | none |

One task only: the change is ~40 lines across three backend files and is independently testable.

## Out of scope

- Any frontend code, types or tests.
- Any audio processing, file upload, or `backend/tmp/` usage.
- Auth, rate limiting, observability, new dependencies.
- Changing or removing the existing `/api/health` endpoint.
- Applying `BLOCKED: human-attention` for anything short of a genuine blocker.
