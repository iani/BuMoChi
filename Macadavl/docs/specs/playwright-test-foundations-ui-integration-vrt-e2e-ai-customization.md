# SPEC — Playwright test foundations (UI integration, VRT, E2E) + AI customization

EPIC: [#4](https://github.com/openhackbot/ai-and-music-2026/issues/4)

## Overview

Add Playwright to `frontend/` as **three distinct browser-test layers**, plus committed,
file-based AI customization so that every agent (Devin, Copilot, Cursor, Claude) writes the same
kind of test in the same place.

| Layer | Dir | Backend | Assertions |
| --- | --- | --- | --- |
| UI integration | `frontend/tests/ui/*.spec.ts` | mocked with `page.route('**/api/**', …)` | user-visible behaviour (roles/labels/text) |
| Visual regression (VRT) — subtype of UI integration | `frontend/tests/vrt/*.spec.ts` | mocked (same harness) | `toHaveScreenshot()` against committed PNG baselines |
| End-to-end (E2E) | `frontend/tests/e2e/*.spec.ts` | **real** FastAPI via `webServer` | real HTTP through the Vite `/api` proxy |

Pinned tooling (do not change without updating both places):

- `@playwright/test` **exact** `1.62.1` (newest stable published ≥ 7 days before this spec;
  published 2026-07-30). No caret.
- Docker image `mcr.microsoft.com/playwright:v1.62.1-noble` — tag derived from
  `package.json` by a helper script so it can never drift.
- chromium only, single viewport `1280x720`, no sharding, no cross-browser matrix.

Vitest keeps owning unit tests (`src/**/*.test.ts(x)`); Playwright specs must be excluded from it
via `test.exclude: [...configDefaults.exclude, 'tests/**']` in `frontend/vite.config.ts`.

## User stories

1. As an agent implementing a user-visible frontend change, I run `npm run test:ui` and get a
   browser test of the real component tree with a mocked, type-checked backend.
2. As an agent making a visual change, I run `npm run test:vrt:update` (Docker) and commit
   deterministic PNG baselines that also render identically in CI.
3. As a reviewer, I trust `npm run test:e2e` because it boots the real FastAPI app and the real
   Vite proxy — no mocks.
4. As any AI tool opening this repo, I read `AGENTS.md` → `.agents/skills/playwright-testing/SKILL.md`
   and know which layer to write, which locators to use, and how to refresh baselines.
5. As a maintainer, CI runs UI+VRT in the pinned Docker container and E2E on `ubuntu-latest`, and
   uploads `playwright-report/` + `test-results/` on every run.

## Frontend design

### `frontend/playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT_WEB = 5173
const PORT_API = 8000

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }]],
  snapshotPathTemplate:
    'tests/vrt/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: `http://localhost:${PORT_WEB}`,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'ui',  testDir: './tests/ui' },
    { name: 'vrt', testDir: './tests/vrt' },
    { name: 'e2e', testDir: './tests/e2e' },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${PORT_WEB} --strictPort`,
      url: `http://localhost:${PORT_WEB}`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
    },
    // added by the E2E task
    {
      command: `. .venv/bin/activate && uvicorn app.main:app --port ${PORT_API}`,
      cwd: '../backend',
      url: `http://localhost:${PORT_API}/api/health`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
    },
  ],
})
```

Notes:
- Task 1 lands the config with the Vite `webServer` entry and the `ui` project (+ empty-but-real
  `vrt`/`e2e` project entries only once their dirs exist — a project whose `testDir` does not
  exist must not break `npm run test:ui`; prefer adding each project in the task that creates its
  directory).
- The backend `webServer` entry is added by the E2E task (task 3), because starting uvicorn must
  not be required by the UI/VRT layers. It must be tolerant of a missing venv only insofar as the
  E2E CI job creates one; local users are documented.

### `frontend/tests/fixtures.ts`

Exports a `test` extended with two fixtures plus re-exports `expect`:

```ts
import { test as base, expect } from '@playwright/test'
import type { HealthResponse } from '../src/types/api'

export interface MockApi {
  /** Fulfil GET /api/health with a typed payload (default {status:'ok',version:'0.0.0-test'}). */
  health: (body?: HealthResponse, status?: number) => Promise<void>
  /** Fulfil an arbitrary /api/** route with typed JSON. */
  json: <T>(urlGlob: string, body: T, status?: number) => Promise<void>
  /** Fail every unmatched /api/** request so tests can never hit a real backend. */
  blockRest: () => Promise<void>
}

export const test = base.extend<{ mockApi: MockApi; audioStub: void }>({
  audioStub: [async ({ page }, use) => { /* page.addInitScript stubbing AudioContext */ }, { auto: true }],
  mockApi: async ({ page }, use) => { /* page.route('**/api/**', …) helpers */ },
})

export { expect }
```

- `audioStub` is `auto: true` and runs `page.addInitScript` **before** any navigation. It defines
  `window.AudioContext` / `window.webkitAudioContext` as a minimal stub whose nodes are no-ops
  (`createOscillator`, `createGain`, `createAnalyser`, `resume`, `close`, `currentTime`,
  `destination`, `state: 'running'`) so Tone.js can be constructed headlessly with no audio device.
- All fixture payloads are typed with the shared interfaces from `frontend/src/types/api.ts`.
  `any` is forbidden (AGENTS.md).
- `frontend/tests/seed.spec.ts` — the Playwright *agents* seed file (planner/generator convention):
  a single trivial `test('seed', …)` that navigates to `/` and asserts the `h1`, used by the test
  agents as a starting point. It lives in `tests/ui` (or is matched by the `ui` project) so it runs
  with the UI layer.

### Locator rules (enforced by the skill, reviewed in PRs)

- `getByRole` > `getByLabel` > `getByText` > `getByTestId`. **No CSS or XPath selectors.**
- Assert user-visible state only (text, roles, values), never Zustand internals.
- Existing hooks available today: `<h1>Audio Workbench</h1>`, `getByTestId('transport')`
  (`Transport: stopped|playing|paused`), `getByLabel('bpm')` (number input), buttons
  `Play` / `Stop`.

### VRT determinism checklist

- `toHaveScreenshot({ animations: 'disabled', caret: 'hide', mask: [...], stylePath })`.
- `use: { reducedMotion: 'reduce' }` on the `vrt` project, fixed `1280x720` viewport.
- `frontend/tests/vrt/screenshot.css` hides volatile elements (e.g. the version string in the
  health badge, focus rings).
- Baselines are generated **only** in `mcr.microsoft.com/playwright:v1.62.1-noble` via
  `npm run test:vrt:update`; `scripts/vrt-docker.mjs` reads the exact `@playwright/test` version
  from `package.json` and interpolates the image tag.
- PNG baselines under `frontend/tests/vrt/__screenshots__/**` **are** committed (they are not audio
  files, so the `no-audio-binaries` gate stays green). Keep them to one viewport / chromium only.

### Frontend production-code touch-ups (minimal)

Only what locators need: a health badge rendered from `fetchHealth()` in `App.tsx` with
`data-testid="health"` showing `API: ok` / `API: unreachable`, plus aria-labels already present.
No other product behaviour changes.

### npm scripts

```json
"test:ui": "playwright test --project=ui",
"test:vrt": "playwright test --project=vrt",
"test:vrt:update": "node scripts/vrt-docker.mjs",
"test:e2e": "playwright test --project=e2e",
"test:pw": "playwright test",
"test:pw:report": "playwright show-report"
```

`npm test` stays Vitest-only.

## Backend design

No new endpoints, no new Pydantic models, no audio processing changes. The E2E layer consumes the
existing router:

- `GET /api/health` → `HealthResponse{ status: Literal["ok"], version: str }`
  (`backend/app/routers/health.py`).
- E2E boots it with `uvicorn app.main:app --port 8000` from `backend/`, using the repo's documented
  venv (`pip install -e ".[dev]"`); system packages `ffmpeg` + `libsndfile1` are installed in the
  E2E CI job exactly as in the existing `backend` job.

## Shared types

| TS interface (`frontend/src/types/api.ts`) | Pydantic model (`backend/app/schemas.py`) | Fields |
| --- | --- | --- |
| `HealthResponse` | `HealthResponse` | `status: 'ok'` ⇄ `Literal["ok"]`, `version: string` ⇄ `str` |

No contract change in this EPIC — Playwright fixtures must import these interfaces rather than
re-declaring shapes.

## CI

`.github/workflows/ci.yml` gains two jobs (existing `frontend`, `backend`, `no-audio-binaries`
jobs unchanged):

```yaml
  ui-and-vrt:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.62.1-noble
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: frontend/.nvmrc, cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
      - run: npx playwright test --project=ui --project=vrt
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-ui-vrt
          path: |
            frontend/playwright-report/
            frontend/test-results/
          retention-days: 7

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4 (as above)
      - uses: actions/setup-python@v5 with python-version "3.12"
      - run: sudo apt-get update && sudo apt-get install -y ffmpeg libsndfile1
      - run: python -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"   # in backend/
      - run: npm ci                                                                    # in frontend/
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=e2e
      - upload-artifact (if: always(), retention-days: 7) for playwright-report/ + test-results/
```

The VRT job must run in the container so its renders match the committed baselines; the E2E job
must NOT (it needs its own Python setup), hence the separate `playwright install`.

## Test plan

### UI integration (`tests/ui/`)

- `bpm.spec.ts` — with `mockApi.health()` mocked: typing `500` in `getByLabel('bpm')` clamps the
  visible value to `300`; typing `1` clamps to `20`; `getByTestId('transport')` reads
  `Transport: stopped` initially and `Transport: playing` after `Play` (audio stubbed), and
  `Transport: stopped` after `Stop`.
- `health.spec.ts` — `mockApi.health({status:'ok',version:'1.2.3'})` → badge shows `API: ok`;
  `mockApi.health(undefined, 500)` → badge shows `API: unreachable`.
- `seed.spec.ts` — navigates `/`, asserts `getByRole('heading', { name: 'Audio Workbench' })`.

### VRT (`tests/vrt/`)

- `initial-screen.spec.ts` — mocked health, full-page
  `await expect(page).toHaveScreenshot('initial-screen.png', { animations:'disabled', caret:'hide', fullPage:true, stylePath: './tests/vrt/screenshot.css' })`.

### E2E (`tests/e2e/`)

- `health.spec.ts` — no route mocking: `page.goto('/')`, badge shows `API: ok`; and
  `request.get('/api/health')` returns 200 with `{status:'ok'}` (version asserted as a non-empty
  string) through the Vite proxy.
- `transport.spec.ts` — BPM input set to `140` keeps `140`; `Play` flips the transport label to
  `Transport: playing` against the real stack.

### Unchanged gates

`npm run typecheck`, `npm run lint`, `npm test` (Vitest — must not pick up `tests/**`),
`npm run build`, backend `pytest`/`ruff`/`mypy`, and `no-audio-binaries` all stay green.

## AI customization

- `.agents/skills/playwright-testing/SKILL.md` — frontmatter `name`, `description`; body: layer
  decision table, fixtures API (`mockApi`, `audioStub`), locator rules, VRT determinism checklist,
  Docker baseline update command, debugging (`--trace on`, `npx playwright show-report`).
- `.agents/skills/spec-to-pr-worker/SKILL.md` — condensed TDD + quality-gate procedure from
  `docs/agents/worker-prompt.md`.
- `AGENTS.md` — short **Browser tests** section pointing at the skill and stating the rule: every
  user-visible frontend change ships a UI integration test; visual changes update VRT baselines via
  Docker; cross-stack changes add/extend an E2E test.
- `.github/copilot-instructions.md` — thin pointer to `AGENTS.md` + the skill. No vendor-scoped
  rule files (`.cursor/rules`, `.claude/rules`): path-scoped guidance is an Agent Skill with
  on-demand `references/` nodes (AGENTS.md, "AI customization format").
- `npx playwright init-agents --loop=claude` output committed as emitted by the CLI. If the pinned
  CLI version does not provide the command, note it in the PR and commit the equivalent
  planner/generator/healer definitions manually.

## Task breakdown

1. **Playwright harness + fixtures + UI integration layer + CI job** (no deps) — pins
   `@playwright/test@1.62.1`, `playwright.config.ts` (`ui` project + Vite `webServer`),
   `tests/fixtures.ts`, `tests/ui/*.spec.ts`, `seed.spec.ts`, health badge touch-up, npm scripts,
   Vitest `exclude`, `ui` CI job + artifacts.
2. **VRT layer + Docker baseline workflow** (depends on 1) — `vrt` project, `screenshot.css`,
   `scripts/vrt-docker.mjs`, `tests/vrt/initial-screen.spec.ts`, committed baseline, CI job
   extended to `--project=vrt` in the pinned container.
3. **E2E layer + backend webServer + CI job** (depends on 1) — `e2e` project, backend `webServer`
   entry, `tests/e2e/*.spec.ts`, `e2e` CI job with Python + ffmpeg/libsndfile1 + artifacts.
4. **AI customization files** (depends on 1) — skills, AGENTS.md section, copilot/cursor pointers,
   `init-agents` output.

## Out of scope

- New product features beyond the `data-testid`/aria/health-badge touch-ups above.
- Cross-browser matrix, sharding, mobile viewports.
- Third-party sites in tests; component testing (`@playwright/experimental-ct-react`).
- Any change to the shared API contract or audio processing.
