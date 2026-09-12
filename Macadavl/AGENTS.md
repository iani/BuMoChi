# Agent Directives

**Project purpose**: AI & Music 2026 hackathon monorepo — a browser audio workbench (React + Tone.js)
backed by a FastAPI audio-analysis API, built largely by autonomous agents through an
EPIC → spec → task → worker-PR cascade.

**Tech stack**: React 19, TypeScript (strict), Vite, Zustand, Tone.js / Web Audio API;
Python 3.10+ FastAPI, Pydantic v2, librosa/pydub. Tests: Vitest + Testing Library (unit),
Playwright (UI integration / VRT / E2E), pytest (backend).

**AI customization format.** Only open, vendor-neutral formats that Devin reads natively:
this `AGENTS.md` (the [agents.md](https://agents.md) standard) and
[Agent Skills](https://agentskills.io) under [`.agents/skills/<name>/SKILL.md`](.agents/skills/).
Area rules are skills with on-demand nodes (`SKILL.md` = router, `references/*.md` = detail):

| Editing… | Load skill | Then the node |
| --- | --- | --- |
| `frontend/src/**` (non-test) | [`frontend-code`](.agents/skills/frontend-code/SKILL.md) | — |
| `backend/app/**` | [`backend-code`](.agents/skills/backend-code/SKILL.md) | — |
| any test, any layer | [`testing`](.agents/skills/testing/SKILL.md) | `references/{unit,ui,vrt,e2e,backend}.md` |

No `.claude/rules`, `.cursor/rules` or other vendor-scoped rule files: `CLAUDE.md` and
`.claude/skills` are symlinks to this file / `.agents/skills`, and
`.github/copilot-instructions.md` is a one-line pointer. Do not add vendor-only formats.

---

## 1. Non-negotiables

- **Strict typing.** Never `any`; never a type assertion (`as X`) — use a real type, `unknown`
  + a guard, or `satisfies`. `as const` is fine. Backend Pydantic models and frontend
  interfaces must match exactly (§4). The compiler and linter are the first reviewer: `tsc`
  runs with every strictness flag (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, …) and `oxlint --type-aware` runs the strict
  typescript-eslint rule set (`no-unsafe-*`, `no-floating-promises`, `strict-boolean-expressions`,
  `switch-exhaustiveness-check`, …). Fix the code, never the config.
- **Tests first.** Write a failing test before implementation. No PR until every local gate
  in §7 passes.
- **Tests are never skipped.** No `.skip` / `.fixme` / `.todo` / `xit`, no deleting or
  loosening a test to get green, no skipping a §7 gate. The only exception is a genuinely
  exceptional case with **explicit `@_lllum` approval** (§9): link the approving comment on the
  line (`// skip-approved: <url>`) and in the PR, and open a follow-up issue. Without that link
  `check-test-hygiene` fails.
- **Audio files.** Temporary audio goes to `backend/tmp/`. **Never** commit `.wav`, `.mp3`,
  `.midi`, `.ogg`, `.flac` … — `.gitignore` and CI (`no-audio-binaries`) enforce it.
- **Coordinator constraints.** A TPM/manager creates issues with the GH CLI but dispatches
  workers natively (Manage Devins). Prompts: [`docs/agents/`](docs/agents/).
- **No ghosting.** After 3 failed attempts or missing context: label the issue
  `BLOCKED: human-attention`, comment the exact error + what you tried + the human action
  needed, and halt (§9). Never spin.

---

## 2. Structure & architecture

```
frontend/
  src/<feature>/     one flat directory per concern (api/, audio/, store/, …); co-locate code + tests
  src/types/api.ts   mirror of backend/app/schemas.py
  src/test/setup.ts  Vitest global setup (console output fails the test)
  tests/fixtures.ts  shared Playwright fixtures (mockApi, audioStub)
  tests/ui/          UI integration (mocked backend)
  tests/vrt/         visual regression (subtype of UI integration; Docker-rendered baselines)
  tests/e2e/         end-to-end against the real FastAPI backend
  scripts/           repo tooling (check-test-hygiene.mjs, vrt-docker.mjs)
backend/
  app/routers/       one router per resource, mounted under /api
  app/schemas.py     Pydantic models (the API contract)
  app/audio/         analysis code; writes only to backend/tmp/
  tests/             pytest (httpx TestClient)
docs/specs/          one SPEC.md per EPIC (written by the TPM agent)
docs/agents/         TPM and worker prompts
docs/practices/      why the rules are what they are
```

**Naming.** Components `PascalCase.tsx`; hooks `useX.ts`; other TS `camelCase.ts`; a test
file mirrors its source name exactly (`client.ts` → `client.test.ts`). One module → one test
file; extra scenarios are extra `describe` blocks, never `*.integration.test.ts`. Python:
`snake_case` modules, `test_<module>.py`.

**Module boundaries.** `frontend/src` never imports from `frontend/tests` or vice versa.
Test-only helpers live in `frontend/tests/` (Playwright) or `frontend/src/test/` (Vitest).
Backend routers never touch the filesystem outside `settings.tmp_dir`.

---

## 3. Banned patterns

| Banned | Use instead | Enforced by |
| --- | --- | --- |
| `any` | a real type, or `unknown` + a guard | oxlint `no-explicit-any` |
| `value as Type` (`as const` excepted) | annotation, guard, `satisfies` | oxlint `consistent-type-assertions` |
| `fireEvent` in unit tests | `userEvent` | `check-test-hygiene` |
| `waitForTimeout` / sleeps in Playwright | auto-retrying `expect(locator)` | `check-test-hygiene` |
| `page.locator('.css')`, `page.locator('#id')`, XPath | `getByRole` → `getByLabel` → `getByText` → `getByTestId` | `check-test-hygiene` |
| `page.route` / `mockApi` in `tests/e2e/` | the real backend; `waitForResponse` | `check-test-hygiene` |
| `page.clock.*` in `tests/e2e/` | response waits | `check-test-hygiene` |
| `toHaveScreenshot` outside `tests/vrt/` | a VRT spec | `check-test-hygiene` |
| `test` from `@playwright/test` in `tests/ui/`, `tests/vrt/` | `test` from `../fixtures` | oxlint `no-restricted-imports` |
| `it.only` / `test.only` | — | oxlint `vitest/no-focused-tests`, Playwright `forbidOnly` |
| `.skip` / `.fixme` / `.todo` / `xit` | fix the test; else `// skip-approved: <url>` (§1) | `check-test-hygiene`, oxlint `vitest/no-disabled-tests` |
| Unawaited promise, `async` handler passed as `void` callback | `await` / `void fn()` / `.catch` | oxlint `no-floating-promises`, `no-misused-promises` |
| `if (value)` on a non-boolean, `x!` | explicit comparison, guard | oxlint `strict-boolean-expressions`, `no-non-null-assertion` |
| `export default` (except entry/config files) | named exports | oxlint `import/no-default-export` |
| Loosening a VRT threshold | fix the uncontrolled input | review (`pr-review` skill) |
| Committing audio binaries | `backend/tmp/` | `.gitignore`, CI |

When a rule fires and the exception is genuine, disable it on that line with a reason:
`// oxlint-disable-next-line <rule> -- <why>`.

---

## 4. Core patterns

- **Shared API contract.** `frontend/src/types/api.ts` ⇄ `backend/app/schemas.py`. Change
  both in the same PR, add a test on both sides, and validate at the boundary: the fetch
  client narrows `unknown` JSON with a type guard (golden: [`frontend/src/api/client.ts`](frontend/src/api/client.ts)).
- **State.** Zustand store per domain in `src/store/`; components subscribe with selectors
  (`useAudioStore((s) => s.bpm)`), never to the whole store. Pure store logic gets pure tests
  (golden: [`frontend/src/store/audioStore.ts`](frontend/src/store/audioStore.ts) +
  [`audioStore.test.ts`](frontend/src/store/audioStore.test.ts)).
- **Audio engine.** All Tone.js access goes through `src/audio/engine.ts`; UI never imports
  `tone` directly. Tests mock the engine module (Vitest) or stub `AudioContext` (Playwright).
- **Backend.** Thin routers, typed `response_model`, logic in `app/audio/`
  (golden: [`backend/app/routers/health.py`](backend/app/routers/health.py) +
  [`backend/tests/test_health.py`](backend/tests/test_health.py)).
- **Accessibility.** Semantic HTML first; every control has a label / accessible name; every
  interactive element is keyboard-operable. This is also what makes `getByRole` work.

---

## 5. Testing

Start from the [`testing`](.agents/skills/testing/SKILL.md) skill; it routes to one node per layer.

| Tier | Location | Backend | Key rule | Node |
| --- | --- | --- | --- | --- |
| Unit | `frontend/src/**/*.test.ts(x)` | mocked module | `userEvent`, console output fails | [`unit.md`](.agents/skills/testing/references/unit.md) |
| UI integration | `frontend/tests/ui/` | mocked (`mockApi`) | setup before `goto`; auto-retrying asserts | [`ui.md`](.agents/skills/testing/references/ui.md) |
| VRT | `frontend/tests/vrt/` | mocked | crop, mask, zero threshold, Docker baselines | [`vrt.md`](.agents/skills/testing/references/vrt.md) |
| E2E | `frontend/tests/e2e/` | **real** FastAPI | no mocks, no clock, wait on responses | [`e2e.md`](.agents/skills/testing/references/e2e.md) |
| Backend | `backend/tests/` | — | TestClient, tmp files under `backend/tmp/` | [`backend.md`](.agents/skills/testing/references/backend.md) |

Always: **GIVEN / WHEN / THEN** sections; names start with `should`; parameterise variations
(`it.each` / `forEach`); initialise state directly (`useAudioStore.setState`) instead of
clicking to a starting condition; assert on the DOM via roles/labels/text where the DOM is
the contract and on the store where state is the contract. Which tier: a user-visible change
ships a UI test; a visual change also refreshes VRT baselines; a cross-stack change also
ships an E2E test. Never test backend logic through the browser — use pytest.

---

## 6. Comments

None by default; names explain *what*. Add one line only when the *why* is non-obvious.
Never describe the previous implementation or the diff.

---

## 7. Definition of done

Run **all** of these and paste nothing into the PR that they did not actually produce:

```bash
# frontend
cd frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build
npm run test:ui                      # when frontend/tests exists on your branch
npm run test:e2e                     # cross-stack changes (needs backend/.venv)
npm run test:vrt                     # visual changes; refresh baselines with npm run test:vrt:update (Docker)
# backend
cd backend && . .venv/bin/activate && ruff check . && ruff format --check . && mypy app && pytest
```

- Check `package.json` / `pyproject.toml` for scripts before inventing a command.
- **Never pipe a validation command into `head`/`tail`/`grep`** — you inherit the pager's
  exit code and a failing check reports success.
- Scope formatting to files you changed; never repo-wide format writes.
- Rename with `git mv`; no re-export shims.
- If anything fails: fix, re-run, then report. Report faithfully — failing output verbatim,
  skipped steps named.

Environment: Node ≥ 22 (`frontend/.nvmrc`), Python ≥ 3.10, `ffmpeg` + `libsndfile1`
(`sudo apt-get install -y ffmpeg libsndfile1`). Vite proxies `/api/*` → `http://localhost:8000`.

---

## 8. Branch / PR conventions

- Branch `feat/issue-<id>`; one issue → one branch → one PR. PR body contains `Closes #<id>`.
- Small, atomic PRs; mechanical changes (renames) separate from behavioural ones.
- **Commits.** Split a PR into distinct, self-contained commits whenever the change is
  separable (e.g. `test: …` → `feat: …` → `chore: …`, or per module); each commit builds and
  passes its own tests so `git bisect` lands on one idea. Conventional Commits subjects
  (`type(scope): imperative summary`, ≤72 chars); body says *why*.
- **Follow-ups are fixups.** Review feedback, CI fixes and typos go in as
  `git commit --fixup=<sha>` (or `--squash=<sha>`) on top of the commit they correct — never
  as a new `fix review comments` commit, never by amending a pushed commit. Before merge, the
  author runs `git rebase -i --autosquash <base>` (with `--force-with-lease`) so the PR is back
  to its distinct commits.
- **Merge = rebase only.** The repo allows *Rebase and merge* exclusively (no merge commits,
  no squash-merge button): every commit on the branch lands on `main` as-is, so the branch must
  already be autosquashed to its distinct commits — no `fixup!`/`squash!`/`wip` subjects may
  reach `main`. Update a branch with `git rebase origin/<base>`, never `git merge`. `main`
  history must stay linear, clean and bisectable.
- CI green before review. The `commit-hygiene` job fails on `fixup!`/`squash!`/`wip` subjects,
  non-Conventional subjects and merge commits — red while fixups are pending, green once
  autosquashed; that is the merge signal. Never force-push a reviewed PR except for the
  autosquash / rebase above, and say so in a comment.
- Use the [`pr-description`](.agents/skills/pr-description/SKILL.md) skill for the body and
  [`pr-review`](.agents/skills/pr-review/SKILL.md) before requesting review.
- Investigations: [`investigate-bug`](.agents/skills/investigate-bug/SKILL.md);
  intermittent tests: [`flaky-test-triage`](.agents/skills/flaky-test-triage/SKILL.md);
  pitch deck / slides / PDF export: [`generate-deck`](.agents/skills/generate-deck/SKILL.md)
  (`deck/`, lands with PR #14). Architecture decisions go in `docs/adr/` (template there).

---

## 9. Escalation protocol

1. `gh issue edit <id> --add-label "BLOCKED: human-attention"` (or `gh pr edit`).
2. Comment, addressed to **`@_lllum`**: the exact error, what you tried, the specific human
   action needed.
3. Stop. `.github/workflows/discord-pager.yml` pages Discord (`@here`) for that exact label only.

**The human is `@_lllum`.** Any time you need approval, a secret, a network/permission request,
a merge, or a decision — in an issue/PR comment or a session message — the ask must be
**visibly marked** so it cannot be missed in a wall of text. Always use this exact shape, as
the first line of the comment/message:

```
⚠️ HUMAN NEEDED — @_lllum: <one-line ask>
<what you tried / why> · <exact action needed> · <link>
```

and **ping Discord first**: if the `DISCORD_WEBHOOK_URL` secret is available to your session,
`POST {"content": "@here ⚠️ HUMAN NEEDED: <one-line ask> <link>"}` to it before asking in the
session (`@here` is the only mention a webhook can notify with; `@_lllum` is for addressing, not
notifying). Never wait silently for a human who has not been addressed. Pass this rule on to
every child/worker session you spawn.

---

## 10. Clarification & communication

- Ask when two readings of a request lead to materially different work; otherwise decide,
  and state the assumption in the PR/issue.
- Report faithfully: failing tests with output, skipped steps by name. Never claim
  verification you did not run.

## 11. Instructions self-healing

When these instructions prescribe A but the codebase consistently does B, flag the
discrepancy (issue comment or PR note) and propose an update — do not silently work
around it. Ambiguous or outdated instruction → raise it immediately.
