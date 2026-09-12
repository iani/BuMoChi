# Test plans

Test plans written by the **planner** phase of the
[`playwright-mcp-agents`](../../.agents/skills/playwright-mcp-agents/SKILL.md) skill live here,
one Markdown file per area (`<area>.md`). They are the input for the **generator** phase, which
turns each plan item into one spec under `frontend/tests/<layer>/`.

## Flow

```
planner   explore http://localhost:5173 with the Playwright MCP browser tools
          → frontend/specs/<area>.md           (this directory)
generator one plan item → one spec
          → frontend/tests/ui|vrt|e2e/<name>.spec.ts, seed: tests/ui/seed.spec.ts
healer    a spec fails, cause unclear → reproduce in the browser, fix the uncontrolled input
          → the failing spec (never a sleep, retry or looser threshold)
```

Every generated spec follows the [`testing`](../../.agents/skills/testing/SKILL.md) skill:
`import { test, expect } from '../fixtures'`, `should …` names, GIVEN / WHEN / THEN, accessible
locators, mocks before `page.goto`, no mocks in `tests/e2e/`. Run `npm run lint` before committing.

## Plan format

Each item states its **layer** (decides the target folder), the **seed** to start from, the
steps and the expected result. Example — [`transport-console.md`](transport-console.md) is the
plan the existing `tests/ui/bpm.spec.ts`, `tests/vrt/*.spec.ts` and `tests/e2e/transport.spec.ts`
implement, so you can diff plan ↔ spec to see how one maps onto the other.
