# Deployment

Free, no credit card, no CI secrets. Two providers, each connected to this repo via GitHub login:

| Part | Where | Trigger | URL |
| --- | --- | --- | --- |
| Frontend (`frontend/`) | Cloudflare Pages | push to `main` → production; every PR → preview | `https://ai-and-music-2026.pages.dev`, previews `https://<hash>.ai-and-music-2026.pages.dev` |
| Backend (`backend/`) | Render free web service (Docker) | push to `main` | `https://ai-and-music-2026-api.onrender.com` |

PR previews are **frontend-only**: they run against the production backend (free tiers have no
backend previews). A PR that changes the API contract is therefore only fully verifiable in
E2E (`npm run test:e2e`) until it is merged.

## How the pieces connect

- `frontend/.env.production` sets `VITE_API_URL` → the Render URL. `vite build` inlines it; the
  dev server keeps the same-origin `/api` proxy (`resolveApiBase` in `src/api/client.ts`).
- `render.yaml` builds `backend/Dockerfile` (Python 3.12 + `ffmpeg` + `libsndfile1`) and sets
  `AUDIO_CORS_ORIGINS` (production Pages origin) and `AUDIO_CORS_ORIGIN_REGEX` (every
  `*.ai-and-music-2026.pages.dev` preview) — see `backend/app/config.py`.
- Render free instances sleep after 15 min idle; the first request then takes ~30–60 s. The
  frontend shows the API as unreachable until it wakes.

## One-time setup (owner, ~5 minutes)

### Render (backend)

1. <https://dashboard.render.com> → sign in with GitHub → **New → Blueprint**.
2. Pick `openhackbot/ai-and-music-2026` (grant the Render GitHub app access to it if asked).
3. Render reads `render.yaml`; confirm the service `ai-and-music-2026-api` → **Apply**.
4. When the first deploy is live, open `https://ai-and-music-2026-api.onrender.com/api/health`
   → `{"status":"ok","version":"…"}`.

If Render assigned a different hostname (name taken), update `VITE_API_URL` in
`frontend/.env.production` in a PR.

### Cloudflare Pages (frontend + PR previews)

1. <https://dash.cloudflare.com> → sign in / sign up → **Workers & Pages → Create → Pages →
   Connect to Git** → pick the repo (grant the Cloudflare Pages GitHub app access).
2. Build settings:
   - Project name: `ai-and-music-2026` (this is the `*.pages.dev` subdomain the CORS regex expects)
   - Production branch: `main`
   - Framework preset: **React (Vite)** (build command `npm run build`, output `dist`)
   - Root directory: `frontend` (Node 22 is picked up from `frontend/.nvmrc`)
3. **Save and Deploy**. Preview deployments are on by default for all non-production branches;
   the Cloudflare Pages GitHub app comments the preview URL on every PR and posts a
   `Cloudflare Pages` commit status.

If you named the project differently, change both `AUDIO_CORS_ORIGINS` and
`AUDIO_CORS_ORIGIN_REGEX` in `render.yaml` to match (Render re-syncs the Blueprint on push).

## Managing the deployments from a Devin session

Both providers are already connected (Render service `srv-dai0ao67bikc73e1a000`, Cloudflare account
`4c8377daea38c98e701e7a92745fbcf3`, Pages project `ai-and-music-2026`). Repo-scoped Devin secrets
`RENDER_API_KEY` and `CLOUDFLARE_API_TOKEN` (Account · Cloudflare Pages / Workers Scripts /
Workers Builds · Edit) give sessions API access — bind them via
`secret:repo:openhackbot/ai-and-music-2026:<NAME>`; never print them.

Only the **Pages** project may be connected to the repo. A Cloudflare **Workers** project (the
default in the dashboard's "Create" flow) has no `wrangler` config to build here and adds a red
`Workers Builds: …` check to every PR — delete it:
`DELETE …/accounts/<id>/workers/scripts/<name>?force=true`.

```bash
# Render: deploys, logs, env vars
curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services/srv-dai0ao67bikc73e1a000/deploys?limit=5
# Cloudflare Pages: project + deployments; POST with -F branch=<name> retriggers a build
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts/4c8377daea38c98e701e7a92745fbcf3/pages/projects/ai-and-music-2026/deployments
```

## Verify

- Production: open `https://ai-and-music-2026.pages.dev` → the page shows `API: ok`.
- Preview: open any PR → Cloudflare comment → preview URL → same check. The browser console
  must show no CORS error against `…onrender.com`.

## Local parity

```bash
docker build -t ai-music-api backend && docker run --rm -p 8000:8000 ai-music-api
curl localhost:8000/api/health
```
