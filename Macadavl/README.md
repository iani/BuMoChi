# AI & Music 2026 — Autonomous Spec-to-PR Cascade

Hackathon monorepo wired for the **"Zero Human Middle"** workflow: humans write an EPIC issue and
merge the final PRs; Devin agents do everything in between (spec, task breakdown, implementation,
tests, review, escalation).

## Live demo

- **Dance Stage** (camera → pose → features → mapping → sound): <https://ai-and-music-2026.pages.dev/#/dance>
  — read the [dancer's guide](docs/DANCER-GUIDE.md) first (setup, what the system hears, one profile per mapping, duet mode).
  Build your own musical personality: [mapping profiles](docs/MAPPING-PROFILES.md).
  Know SuperCollider? Drive your own sounds live from the same stage: [SuperCollider sound lab](docs/SUPERCOLLIDER.md) (`sc/dance-lab.scd` + one bridge command).
- Audio workbench: <https://ai-and-music-2026.pages.dev>
- Backend API: <https://ai-and-music-2026-api.onrender.com/api/health> (Render free tier: first request after idle takes ~30–60 s)
- Every PR gets a Cloudflare preview URL as a bot comment (frontend only, against the production API).

```
frontend/   React 19 + TypeScript (strict) + Vite + Zustand + Tone.js — tests with Vitest
backend/    FastAPI + Pydantic v2 + librosa/pydub — tests with pytest, ruff, mypy --strict
docs/specs/ SPEC.md per EPIC, written by the TPM agent
docs/agents/ Prompts for the TPM coordinator and worker sessions
.github/    CI, Discord escalation pager, EPIC issue template, PR template
AGENTS.md   Directives every agent must follow
LICENSE     Proprietary — all rights reserved (see THIRD_PARTY_NOTICES.md for streamed demo footage and deps)
```

## Quick start

System deps for the backend: **`ffmpeg`** and **`libsndfile1`**
(`sudo apt-get install -y ffmpeg libsndfile1`). Node >= 22, Python >= 3.10.

```bash
# backend
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000       # http://localhost:8000/api/health

# frontend (separate shell)
cd frontend && npm ci && npm run dev              # http://localhost:5173 (proxies /api -> :8000)
```

Quality gates: `frontend`: `npm run typecheck && npm run lint && npm test && npm run build`;
`backend`: `pytest && ruff check . && ruff format --check . && mypy app`.

## Platform map — every component, its working example, its flow

Each row is a component of the platform, one concrete example already in the repo you can copy
from, and the document that describes the flow to follow.

| Component | Example | Flow |
| --- | --- | --- |
| EPIC → spec → tasks → PRs (cascade) | EPIC [#4](https://github.com/openhackbot/ai-and-music-2026/issues/4) → [`docs/specs/playwright-…md`](docs/specs/playwright-test-foundations-ui-integration-vrt-e2e-ai-customization.md) → tasks #5–#8 → PRs #9–#12 | [The cascade](#the-cascade), [`docs/agents/tpm-prompt.md`](docs/agents/tpm-prompt.md) |
| Worker: issue → TDD → gates → PR | PR [#9](https://github.com/openhackbot/ai-and-music-2026/pull/9) (`feat/issue-5`) | [`docs/agents/worker-prompt.md`](docs/agents/worker-prompt.md), skill [`spec-to-pr-worker`](.agents/skills/spec-to-pr-worker/SKILL.md) |
| Unit tests (Vitest) | [`frontend/src/App.test.tsx`](frontend/src/App.test.tsx), [`audioStore.test.ts`](frontend/src/store/audioStore.test.ts) | [`testing`](.agents/skills/testing/SKILL.md) → [`unit.md`](.agents/skills/testing/references/unit.md) |
| UI integration (Playwright, mocked API) | [`frontend/tests/ui/bpm.spec.ts`](frontend/tests/ui/bpm.spec.ts), [`fixtures.ts`](frontend/tests/fixtures.ts) | → [`ui.md`](.agents/skills/testing/references/ui.md) |
| VRT (Docker baselines, light + dark) | [`frontend/tests/vrt/initial-screen.spec.ts`](frontend/tests/vrt/initial-screen.spec.ts), [`dark-theme.spec.ts`](frontend/tests/vrt/dark-theme.spec.ts) | → [`vrt.md`](.agents/skills/testing/references/vrt.md), [ADR-0002](docs/adr/0002-three-layer-playwright-testing.md) |
| E2E (real FastAPI) | [`frontend/tests/e2e/transport.spec.ts`](frontend/tests/e2e/transport.spec.ts) | → [`e2e.md`](.agents/skills/testing/references/e2e.md) |
| Backend tests (pytest) | [`backend/tests/test_health.py`](backend/tests/test_health.py), [`test_cors.py`](backend/tests/test_cors.py) | → [`backend.md`](.agents/skills/testing/references/backend.md) |
| Test plan → spec (Playwright MCP planner/generator/healer) | [`frontend/specs/transport-console.md`](frontend/specs/transport-console.md) ↔ the specs above | [`frontend/specs/README.md`](frontend/specs/README.md), skill [`playwright-mcp-agents`](.agents/skills/playwright-mcp-agents/SKILL.md) |
| Dance → music pipeline (`#/dance`) | [`frontend/src/dance/DanceStage.tsx`](frontend/src/dance/DanceStage.tsx): source (`pose/`) → features (`features/`) → mapping (`mapping/`, the open seam) → engine (`audio/danceEngine.ts`) → visuals (`visuals/`) + recording (`recording/`); fixtures in [`frontend/public/fixtures/pose/`](frontend/public/fixtures/pose/) from [`tools/pose/extract_landmarks.py`](tools/pose/extract_landmarks.py) | [prod `#/dance`](https://ai-and-music-2026.pages.dev/#/dance), [dancer's guide](docs/DANCER-GUIDE.md), [`tests/ui/dance-stage.spec.ts`](frontend/tests/ui/dance-stage.spec.ts) |
| SuperCollider sound lab (`#/dance` → OSC) | engine [`audio/oscEngine.ts`](frontend/src/audio/oscEngine.ts) → [`tools/sc-bridge/bridge.py`](tools/sc-bridge/bridge.py) (WebSocket 57130 → UDP 57120) → sclang; [`replay.py`](tools/sc-bridge/replay.py) replays a recorded timeline without a camera | [`docs/SUPERCOLLIDER.md`](docs/SUPERCOLLIDER.md) (dancer 5-minute setup; ports, `/dance/<A\|B>/params` contract); starter project [`sc/dance-lab.scd`](sc/dance-lab.scd) (synths, `OSCdef`s, `profile-template.scd`, `explorer.scd` GUI) |
| Frontend code (React, Zustand, engine boundary, typed client) | [`frontend/src/App.tsx`](frontend/src/App.tsx), [`api/client.ts`](frontend/src/api/client.ts), [`audio/engine.ts`](frontend/src/audio/engine.ts) | skill [`frontend-code`](.agents/skills/frontend-code/SKILL.md) |
| Backend code (router + schema contract) | [`backend/app/routers/health.py`](backend/app/routers/health.py) ⇄ [`schemas.py`](backend/app/schemas.py) ⇄ [`types/api.ts`](frontend/src/types/api.ts) | skill [`backend-code`](.agents/skills/backend-code/SKILL.md) |
| Visual design ("Studio Console") | [`frontend/src/index.css`](frontend/src/index.css) tokens = [`deck/src/theme.css`](deck/src/theme.css); VRT PNGs show both themes | [`docs/VISUAL-STYLE.md`](docs/VISUAL-STYLE.md), skill [`visual-style`](.agents/skills/visual-style/SKILL.md) |
| Pitch deck → PDF | [`deck/src/deck.html`](deck/src/deck.html) (`cd deck && npm run setup && npm run deck`) | [`deck/README.md`](deck/README.md), skill [`generate-deck`](.agents/skills/generate-deck/SKILL.md) |
| Architecture decisions | [ADR-0002](docs/adr/0002-three-layer-playwright-testing.md) | [`docs/adr/ADR-TEMPLATE.md`](docs/adr/ADR-TEMPLATE.md), [ADR-0001](docs/adr/0001-record-architecture-decisions.md) |
| Security | `no-audio-binaries` CI job, `VITE_` never holds secrets, keys only in `backend/app/config.py` | [`docs/SECURITY-CHECKLIST.md`](docs/SECURITY-CHECKLIST.md) |
| Deploy + PR previews | prod [ai-and-music-2026.pages.dev](https://ai-and-music-2026.pages.dev) → [`/api/health`](https://ai-and-music-2026-api.onrender.com/api/health); Cloudflare preview comment on PR [#17](https://github.com/openhackbot/ai-and-music-2026/pull/17) | [`docs/DEPLOY.md`](docs/DEPLOY.md), [`render.yaml`](render.yaml) |
| Quality gates & CI | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`frontend`, `playwright-ui-vrt`, `e2e`, `backend`, `commit-hygiene`, `no-audio-binaries`) | [`AGENTS.md` §7](AGENTS.md) |
| Code review | Devin Review (enabled per repo in the Devin dashboard; evidence = its comment on a PR); checklist in [`pr-review`](.agents/skills/pr-review/SKILL.md) | [`AGENTS.md` §8](AGENTS.md), skill [`pr-description`](.agents/skills/pr-description/SKILL.md) |
| Human escalation (Discord pager) | Label `BLOCKED: human-attention` on issue #2 fired [`discord-pager.yml`](.github/workflows/discord-pager.yml) (`@here`, HTTP 204) | [`AGENTS.md` §9](AGENTS.md) |
| Bug / flake investigation | — (no incident yet) | skills [`investigate-bug`](.agents/skills/investigate-bug/SKILL.md), [`flaky-test-triage`](.agents/skills/flaky-test-triage/SKILL.md) |
| Hackathon schedule | — | [`docs/TWO-DAY-PLAYBOOK.md`](docs/TWO-DAY-PLAYBOOK.md) |

## Working conventions for agents and humans

[`AGENTS.md`](AGENTS.md) is the single source of truth (`CLAUDE.md` symlinks to it;
`.github/copilot-instructions.md` only points at it). All other AI customization is
[Agent Skills](https://agentskills.io) in [`.agents/skills/`](.agents/skills/) — the open format
Devin (and Claude Code, Cursor, Codex, Copilot) load natively; `.claude/skills` symlinks there.
Area rules are skills with on-demand nodes: `frontend-code`, `backend-code`, and `testing`
(router → `references/{unit,ui,vrt,e2e,backend}.md`). No vendor-only rule files. Conventions are enforced
mechanically where possible: `tsconfig.*.json` (all strictness flags), `frontend/.oxlintrc.json`
(`oxlint --type-aware`: correctness/suspicious/perf categories + the strict typescript-eslint
set — `no-unsafe-*`, `no-floating-promises`, `strict-boolean-expressions`; no `any`, no `as`,
no focused/skipped tests, Tone.js only in `src/audio/engine.ts`),
`frontend/scripts/check-test-hygiene.mjs` (test naming, `userEvent`, no `waitForTimeout`, no mocks
in E2E, screenshots only in VRT, skipped tests only with `// skip-approved: <url>`) and
`frontend/src/test/setup.ts` (any `console.warn/error` fails the unit test).
Decision records: `docs/adr/`; pitch deck + PDF export: `deck/` (`generate-deck` skill) — both from PR #14.

### Browser tests (Playwright)

- `npm run test:ui` — UI integration tests (`frontend/tests/ui/`, mocked backend). No Docker needed.
- `npm run test:vrt` — visual regression tests (`frontend/tests/vrt/`) against committed PNG
  baselines. **Docker is required for VRT only**: fonts/antialiasing differ between hosts, so
  baselines are generated and compared inside `mcr.microsoft.com/playwright:v<version>-noble`
  (the tag is derived from the `@playwright/test` version in `frontend/package.json`).
  After a visual change run `npm run test:vrt:update` (wraps `scripts/vrt-docker.mjs`) and commit
  the regenerated `tests/vrt/__screenshots__/**` PNGs. Keep baselines to chromium / one viewport.

## The cascade

| Phase | Who | What |
| --- | --- | --- |
| 1 Inception | Human + TPM | Open an issue with the **EPIC** template, comment `/devin architect`. The TPM session asks a questionnaire if needed, then commits `docs/specs/<epic>.md`. |
| 2 Planning | TPM | Creates one GitHub issue per atomic task (labels `task`, `epic:N`) and dispatches a worker session per issue via Manage Devins. |
| 3 Implementation | Workers | Branch `feat/issue-<id>`, TDD, all gates green, PR with `Closes #<id>`. |
| 4 Review | Devin Review | Reviews each PR automatically; workers push fixes until clean. Humans merge. |
| 5 Exceptions | Any agent | Label `BLOCKED: human-attention` + comment opening with `⚠️ HUMAN NEEDED — @_lllum:` → Discord `@here` ping. |

Prompts: [`docs/agents/tpm-prompt.md`](docs/agents/tpm-prompt.md),
[`docs/agents/worker-prompt.md`](docs/agents/worker-prompt.md).

## One-time setup (repository owner)

1. **Devin GitHub App** — installed on this repo (grants Devin read/write + PR review).
2. **Devin Review** — enable in the Devin dashboard → Settings → Review (`/settings/review`) so
   every PR is reviewed automatically; optionally turn on *Post GitHub CI checks* and
   *Auto-fix review findings*. This is an owner-only dashboard setting: Devin sessions cannot
   read or toggle it; the only evidence it is on is a Devin Review comment appearing on a PR.
   Enabled for this repo on 2026-09-11 — PRs opened or pushed before that carry no review.
3. **Automation "TPM Coordinator"** — in the Devin dashboard → Automations. Trigger: GitHub
   *Issue comment*, condition `comment.body starts_with "/devin architect"`, repository
   `openhackbot/ai-and-music-2026`; action: *Start session* with the prompt in
   `docs/agents/tpm-prompt.md`; enable *bypass approval* for child sessions so the TPM can spawn
   workers unattended. (Created by the setup session; verify it is enabled.)
4. **Discord pager** — add a repository secret `DISCORD_WEBHOOK_URL` (Settings → Secrets and
   variables → Actions) containing a Discord channel webhook URL. The label
   `BLOCKED: human-attention` must exist (it does). The message opens with `@here` (verified to
   notify; a plain `@_lllum` in webhook text does not — verified twice). Every human ask an
   agent makes, in GitHub or in its session, opens with the visible marker
   `⚠️ HUMAN NEEDED — @_lllum: <ask>` (AGENTS.md §9). To target one person instead, set the
   repository *variable* `DISCORD_MENTION` to `<@numeric-user-id>`. Note: GitHub cannot filter
   `labeled` events by label name at the trigger level, so every label event shows a (skipped)
   run in the Actions tab — only the exact blocker label sends a message.
5. **Branch protection (optional)** — require the `CI` checks before merge on `main`.
6. **Deploy** — frontend on Cloudflare Pages (production from `main` + a preview URL per PR),
   backend on a Render free web service from [`render.yaml`](render.yaml). Click-through
   steps and URL wiring: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Verifying the pipeline

Create an issue `EPIC: Test Audio Pipeline`, comment
`/devin architect: Create a simple FastAPI endpoint that returns a 200 OK and an empty dummy json payload.`
and watch: spec commit → task issue(s) → worker session → PR → Devin Review. Close the dummy PR
and issues afterwards.

## License

Proprietary — **all rights reserved**. See [LICENSE](LICENSE); no use, copying, redistribution,
derivative work or AI-training use is permitted without written permission. Third-party footage and
packages keep their own licences ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
