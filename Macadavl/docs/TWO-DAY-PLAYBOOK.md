# The two-day playbook

For the shape of project where you get a challenge, invent something, build it
end to end, and present — in about two days. Adapted from the hackdeck kit; the
deck tooling it refers to lives in `deck/`.

The governing idea: **de-risk the deliverable first, build second.** The most
common way these end badly is not a weak idea. It is a strong idea with a demo
that would not start and a deck that would not export.

In this repo most of the building is done by the agent cascade
(`README.md`, "The cascade"): you write an EPIC, comment `/devin architect`, and
the TPM session specs it, splits it into task issues and dispatches workers.
Your job is to pick the right EPICs, keep the deliverable safe, and merge.

---

## Day 1, morning — decide and de-risk

1. **Run the deck setup before anything else.**

   ```bash
   cd deck && npm run setup
   ```

   This installs the deck toolchain, fetches a Chromium build, and proves the
   PDF export works end to end. Do it now, while it is cheap to fix. Finding a
   broken export at 5pm on Day 2 is the classic way to lose the deliverable.

2. **Pick the idea, then write the ADR.** Copy `docs/adr/ADR-TEMPLATE.md` into
   `docs/adr/000N-<slug>.md`. Two or three options, what you chose, why not
   the others. Fifteen minutes. It becomes your "how it works" slide and your
   Q&A prep.

3. **Write the closing sentence of your talk now.** If you cannot, the idea is
   not sharp enough yet. Fix that before writing an EPIC.

4. **Fan the work out with the cascade.** Open one GitHub issue per feature
   using the EPIC template and comment `/devin architect` (optionally with an
   inline spec after the colon). Keep EPICs small enough that a spec fits on a
   page — the TPM will produce one task issue per atomic change, and each
   worker opens one PR. Several EPICs can run in parallel.

5. **If your build calls an AI API**, skim your provider's current docs for
   model IDs, streaming and pricing. Do not rely on memory — model names and
   defaults move fast, and a wrong ID is a confusing 404 rather than a clear
   error. Then read `docs/SECURITY-CHECKLIST.md` §1 and put the key behind a
   FastAPI route from the very first call. Retrofitting that is annoying;
   starting with it costs nothing.

## Day 1, afternoon — build the spine

6. **Make the riskiest part work first.** Usually the external call or the
   audio pipeline. Get one real result rendering on screen before you build
   anything around it. If it streams, the demo feels alive; if it blocks, it
   looks hung.

7. **Build exactly the one path you will demo.** No settings screen, no
   sign-up, no empty states you will not show. Everything else is a slide.

8. **Decide your palette once** and put it in `deck/src/theme.css`. Use the same
   values in the app. One visual system across app and deck reads as
   deliberate; two read as unfinished.

9. **Merge as PRs go green.** Devin Review runs on every PR; workers push fixes
   until it is clean. Watch for `BLOCKED: human-attention` — the Discord pager
   fires when an agent is genuinely stuck, and the fix is usually one comment.

## Day 2, morning — make it demo-safe

10. **One end-to-end test of the happy path.** Freeze animations, pin the clock,
    seed deterministic data, and **mock the model call** in the UI layer
    (`docs/adr/0002-three-layer-playwright-testing.md`). A demo that depends on
    a live API at presentation time can fail for reasons that have nothing to
    do with your work.

11. **Have an offline fallback.** A recorded run or fixtured responses behind a
    flag. Conference wifi is a real risk and this costs twenty minutes.

12. **Tidy once:** delete dead code, fix the README so a stranger can run it,
    check `docs/SECURITY-CHECKLIST.md` end to end.

13. **Capture screenshots** of every screen you will show. These go straight
    into the deck via `.shot`.

## Day 2, afternoon — the deck

14. **Edit `deck/src/deck.html`** — or ask an agent to, using
    `.agents/skills/generate-deck/SKILL.md`. The skeleton already follows a
    structure that works: problem → why this approach → demo → what you saw →
    how it works → signal → next. See `deck/README.md`.

15. **Build it and look at the PDF**, not just the browser:

    ```bash
    cd deck && npm run deck
    ```

16. **Keep the HTML as your live backup.** It is self-contained and needs no
    network, so it works when the projector, the wifi or your laptop misbehave.

17. **Rehearse once, out loud, timed.** You will cut two slides. That is the
    point.

---

## Things that reliably go wrong

| Risk | Cost of prevention |
|---|---|
| Export broken, discovered late | 5 min on Day 1 (`cd deck && npm run setup`) |
| Demo depends on live API | 20 min to mock it |
| API key in the client bundle | 0 min if done first, hours to rotate later |
| Slide content scrolls and is cut from the PDF | Obey the 100vh rule |
| No answer to "why not the simpler thing?" | 15 min writing the ADR |
| An EPIC too big for one spec, workers collide | Split it before `/devin architect` |
| Ran 4 minutes over | One timed rehearsal |

## If you use an AI coding assistant

Worth doing before you write code rather than after:

- Read `AGENTS.md`. Every agent in this repo follows it: strict typing, TDD,
  no audio binaries, one issue per branch.
- Read up on the current model IDs and streaming API for whichever provider
  you are calling, rather than trusting recalled names.
- If your assistant ships guidance on data visualisation or on writing stable
  end-to-end tests, read it *before* the first chart and the first test. Both
  are areas where the default approach produces something that works on your
  machine and flakes everywhere else.
