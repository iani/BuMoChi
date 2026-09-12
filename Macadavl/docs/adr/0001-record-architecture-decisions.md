# ADR-0001: Record architecture decisions

- **Status:** accepted
- **Date:** 2026-09-11
- **Deciders:** openhackbot
- **Consulted:** —

## Context

This is a time-boxed hackathon build, and most of the work is done by
autonomous agent sessions (see `README.md`, "The cascade"). Decisions get made
fast — in a spec, a PR description or a session transcript — and then
forgotten, which is fine until someone asks "why didn't you just…" in the Q&A
and the reasoning is gone. Agents also need the record: a worker session that
starts cold must be able to find out why the repo is shaped the way it is.

## Options considered

### 1. Short ADRs in `docs/adr/` — CHOSEN

One markdown file per significant decision, using `docs/adr/ADR-TEMPLATE.md`.

- **Good:** Takes five minutes. Doubles as presentation material.
- **Bad:** Needs the discipline to actually write them.

### 2. No written record — rejected

- **Good:** Zero overhead.
- **Bad:** Reasoning evaporates within a day.
- **Why not:** The rejected-options list is exactly what gets probed in
  questions. Reconstructing it under pressure is worse than writing it down.

### 3. A full design document — rejected

- **Good:** Thorough.
- **Bad:** Costs hours that the build needs.
- **Why not:** Wrong weight for a two-day project.

## Decision

Keep short ADRs in `docs/adr/`, numbered sequentially (`NNNN-<slug>.md`).
Write one for each decision a reasonable person might challenge. Agents and
humans alike may author them; a TPM session writing a spec that makes such a
decision should add the ADR in the same PR.

## Consequences

- The "how it works" and Q&A prep are mostly written for you.
- Requires stopping to write at the moment of decision, which feels like a
  detour and is not.
