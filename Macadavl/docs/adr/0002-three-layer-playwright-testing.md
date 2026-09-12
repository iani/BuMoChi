# ADR-0002: Three-layer Playwright browser testing (UI integration, VRT, E2E)

- **Status:** accepted
- **Date:** 2026-09-11
- **Deciders:** openhackbot
- **Consulted:** TPM agent spec
  `docs/specs/playwright-test-foundations-ui-integration-vrt-e2e-ai-customization.md` (EPIC #4)

## Context

The frontend (`frontend/`, React 19 + Vite + Zustand + Tone.js) is written almost
entirely by autonomous worker sessions. Vitest covers unit tests, but nothing
exercised the real component tree in a browser, nothing caught visual
regressions, and nothing proved the Vite `/api` proxy and the FastAPI backend
(`backend/`) actually talk to each other.

Constraints:

- Every agent (Devin, Copilot, Cursor, Claude) must write the same kind of test
  in the same place, so the layering has to be explicit and mechanical.
- Screenshot baselines must be deterministic across developer laptops and CI, or
  they become a source of flaky red builds that agents then "fix" by regenerating.
- The UI layers must not require Python or a running backend; the E2E layer must
  use the real one.
- Tooling is pinned: `@playwright/test` exact `1.62.1`, Docker image
  `mcr.microsoft.com/playwright:v1.62.1-noble` derived from `package.json` by a
  helper script.

## Options considered

### 1. Three distinct Playwright layers — CHOSEN

| Layer | Dir | Backend | Assertions |
| --- | --- | --- | --- |
| UI integration | `frontend/tests/ui/` | mocked via `page.route('**/api/**', …)` | user-visible behaviour (roles / labels / text) |
| VRT (subtype of UI integration) | `frontend/tests/vrt/` | mocked, same harness | `toHaveScreenshot()` against committed PNG baselines rendered **only** inside `mcr.microsoft.com/playwright:v<@playwright/test version>-noble` |
| E2E | `frontend/tests/e2e/` | **real** FastAPI started by the Playwright `webServer` entry; no route mocking | real HTTP through the Vite `/api` proxy |

One `playwright.config.ts` with three `projects`; shared typed fixtures
(`mockApi`, `audioStub`) so mocked payloads use the interfaces in
`frontend/src/types/api.ts`.

- **Good:** each layer has one job and one failure mode; CI runs UI+VRT in the
  pinned container and E2E on a plain runner with Python; agents can be told
  "user-visible change → `tests/ui`, visual change → `tests/vrt` + Docker
  baselines, cross-stack change → `tests/e2e`".
- **Bad:** three directories and three npm scripts to learn; VRT baseline
  updates need Docker locally.

### 2. A single mixed Playwright suite — rejected

One `tests/` directory where specs mock or do not mock the backend as they see fit.

- **Good:** fewest files; nothing to explain.
- **Bad:** a spec that half-mocks the API hides real integration failures; VRT
  screenshots taken in a mixed suite run on whatever machine happens to run it;
  the E2E backend requirement leaks into every test run.
- **Why not:** agents copy the nearest example. With no structural boundary the
  layers blur within a handful of PRs, and CI ends up either needing Python for
  everything or silently mocking everywhere.

### 3. Cypress — rejected

- **Good:** mature, good interactive runner.
- **Bad:** separate browser-launch model and fixture system from the Playwright
  agent tooling (planner/generator/healer) the spec relies on; weaker built-in
  screenshot comparison; adds a second test framework alongside Vitest.
- **Why not:** Playwright's `page.route`, `webServer`, `toHaveScreenshot` and the
  official Docker image cover all three layers with one dependency.

### 4. Host-rendered VRT baselines — rejected

Generate and compare screenshots on whatever machine runs the tests.

- **Good:** no Docker needed.
- **Bad:** font rendering, anti-aliasing and GPU differences between macOS, Linux
  and CI produce pixel diffs that have nothing to do with the code.
- **Why not:** flaky baselines get regenerated blindly by agents until VRT proves
  nothing. Rendering only inside the pinned `mcr.microsoft.com/playwright:v<version>-noble`
  image (tag interpolated from the exact `@playwright/test` version) makes local
  and CI renders byte-identical.

## Decision

Split browser tests into UI integration (mocked backend), VRT (mocked, Docker-only
baselines) and E2E (real FastAPI via `webServer`, no mocking), as three Playwright
projects with shared typed fixtures. The single most important reason: the
layering is enforced by directory and CI job, so autonomous agents cannot drift
between mocked and real backends by accident.

## Consequences

- Easier: telling an agent which test to write; trusting a green `test:e2e`;
  reproducible screenshots.
- Harder: updating VRT baselines requires Docker (`npm run test:vrt:update`);
  bumping `@playwright/test` means rebuilding baselines in the new image.
- Hard to reverse: committed PNG baselines and CI jobs assume the three-project
  layout.
- Revisit if: the pinned Docker image stops being published, VRT is rarely
  triggered and the Docker cost is not paying for itself, or component testing
  (`@playwright/experimental-ct-react`) matures enough to replace the UI layer.
