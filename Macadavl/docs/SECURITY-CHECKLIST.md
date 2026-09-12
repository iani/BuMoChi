# Security checklist for a fast build

Short, because a long checklist gets skipped. These are the things that
actually go wrong in a two-day project whose FastAPI backend may call a paid AI
API on behalf of a browser app — and whose code is mostly written by autonomous
agents, which copy whatever pattern they see first.

Adapted from the hackdeck kit for this repo's shape: React/Vite frontend in
`frontend/`, FastAPI backend in `backend/`, secrets in environment variables and
GitHub Actions secrets.

## 1. API keys must never reach the browser

A key in frontend code is in the shipped bundle, in devtools, and in anyone's
cache — and a leaked key on a metered API is a bill, not just an incident.

- [ ] Keys live in environment variables read by the **backend** only
      (`backend/app/config.py`). Locally that means a `backend/.env` that is
      **gitignored** (the root `.gitignore` already excludes `.env`). **Never
      commit `.env`.** In CI they are GitHub Actions secrets
      (Settings → Secrets and variables → Actions), e.g. `DISCORD_WEBHOOK_URL`.
- [ ] No client-exposed env prefix. Vite deliberately inlines anything prefixed
      `VITE_` into the bundle. Never give a secret that name.
- [ ] All model / paid-API calls go through a FastAPI route under `/api/*`. The
      browser calls *your* endpoint via the Vite proxy; your endpoint holds the key.
- [ ] Verify after building, not by reading code:

      cd frontend && npm run build && grep -rlE 'sk-[A-Za-z0-9_-]{20,}' dist/ && echo LEAK || echo clean

      Expect `clean`.

## 2. Do not log secrets

- [ ] Log *that* a call happened — route, latency, status, token counts.
      Never the key, never full request headers, never the webhook URL.
- [ ] No secrets in the URL or query string; they land in access logs and in
      uvicorn's request log.
- [ ] Redact before logging request bodies if they may contain user content or
      uploaded audio metadata.
- [ ] Agent sessions and CI logs are readable by the whole team: never
      `print()`/`echo` an env var to debug it.

## 3. Treat model output as untrusted input

- [ ] Never `dangerouslySetInnerHTML` a model response in React. Render it as
      text, or sanitise it.
- [ ] Never `eval` it (JS or Python), and never pass it to a shell, `ffmpeg`
      command line or file path unescaped.
- [ ] If the model picks a tool, preset, or file, validate the choice against an
      allowlist rather than trusting the name it returned.
- [ ] Validate every backend response with the Pydantic model in
      `backend/app/schemas.py` before returning it — the schema is the contract
      with `frontend/src/types/api.ts`.

## 4. Uploaded audio is untrusted input too

- [ ] Enforce a size limit and an allowlist of formats before handing a file to
      `librosa`/`pydub`/`ffmpeg`.
- [ ] Write temporary audio only to `backend/tmp/` (gitignored, per `AGENTS.md`)
      and delete it after processing. Never commit `.wav`/`.mp3`/`.midi`; the
      `no-audio-binaries` CI job enforces this.
- [ ] Never build an `ffmpeg` command from user-supplied strings.

## 5. Content Security Policy

Cheap to add, and it turns a rendering mistake into a blocked request instead
of a script execution.

- [ ] A CSP header (FastAPI middleware) or meta tag in `frontend/index.html` is set.
- [ ] `default-src 'self'`, then widen only where you must.
- [ ] No `unsafe-eval`. Avoid `unsafe-inline`; if Vite's dev server needs it,
      scope it to dev only.

## 6. Rate limiting and cost

- [ ] Any route that calls a paid API has a request cap per session or IP. A
      demo URL shared in a chat can be hammered.
- [ ] A hard spend limit is set in the provider dashboard.
- [ ] A timeout on every outbound call (`httpx.Timeout`), so a hung request
      cannot pile up.

## 7. Reproducible build

- [ ] Lockfiles are committed (`frontend/package-lock.json`, `deck/package-lock.json`;
      backend pins in `pyproject.toml`).
- [ ] No install step pulls from a branch, a URL, or `latest`. New dependencies
      are pinned to a version that is at least seven days old.
- [ ] A clean clone plus the documented install commands (`README.md`, Quick
      start) produces a working build. Test this before the demo, not during it.

## 8. Agents and automation

- [ ] The Discord pager (`.github/workflows/discord-pager.yml`) reads
      `DISCORD_WEBHOOK_URL` from Actions secrets only; the URL is never pasted
      into an issue, PR or prompt file.
- [ ] Agent prompts (`docs/agents/*.md`) and skills (`.agents/skills/**`) contain
      no credentials. Devin sessions receive secrets through the Devin secrets
      store, not through the repo.
- [ ] PRs opened by agents are reviewed (Devin Review + a human merge) before
      anything touching auth, env handling or outbound calls lands.

## 9. Before you share the repo

- [ ] `git log -p` scanned for a key committed and later "removed" — it is
      still in history. If you find one, **rotate it**; deleting the file is
      not enough.
- [ ] `.env`, credentials, and any recorded fixture containing real user data
      or real audio are untracked.
