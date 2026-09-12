# deck — the AI & Music 2026 pitch deck

A browser-native slide deck with reliable PDF export. No account, no service, no
design tool: two dependencies, one command, and a deck that works offline.
Adapted from the `hackdeck` kit.

This is a standalone npm workspace; it is not part of `frontend/` or `backend/`
and nothing in CI depends on it.

## Quickstart

```bash
cd deck
npm run setup        # installs deps + Chromium, then proves the export works (out/setup-check.pdf)
npm run deck:open    # live preview — arrow keys to navigate
npm run deck         # build out/deck.pdf
```

Run `npm run setup` on day one even if you will not touch the deck until day
two. It fails loudly now rather than quietly later.

`out/`, `node_modules/` and every `*.pdf` are gitignored. **Never commit the
generated PDF or the PNG spot-checks.**

## What's in here

```
package.json         scripts: setup, deck, deck:open (puppeteer + pdf-lib, exact pins)
scripts/setup.sh     one-time setup; handles two environment traps (see below)
src/deck.html        the 8-slide deck — edit this
src/theme.css        colour + type — swap 8 values to rebrand entirely
src/slides.css       layout primitives and type scale; rarely needs editing
src/export-pdf.mjs   HTML → PDF, no configuration
```

Related docs elsewhere in the repo:

- `.agents/skills/generate-deck/SKILL.md` — the agent procedure for regenerating
  the deck from `docs/specs/`, `docs/adr/` and merged PRs.
- `docs/TWO-DAY-PLAYBOOK.md` — hour-by-hour plan for a two-day build.
- `docs/SECURITY-CHECKLIST.md` — short, for a build that calls a paid AI API.
- `docs/adr/` — decision records; rejected options belong there, not in slides.

## The one contract

**Every element with `class="slide"` becomes one page of the PDF.** That is the
only thing `src/export-pdf.mjs` requires of your markup. Write ordinary HTML and
CSS; the exporter isolates each slide, screenshots it, and assembles the frames.

Because pages are rasterised, whatever the browser renders is what you get —
custom fonts, CSS filters, transforms, pseudo-elements. Nothing is
re-implemented in a PDF engine, so nothing drifts.

## The one rule

**Every slide must fit inside 100vh. Never scroll inside a slide.** The exporter
captures one viewport per slide, so anything below the fold is simply gone. A
deck that scrolls also looks broken on a projector. Slides are cheap; cramming
is not. If content overflows, split it into another slide.

## Build

```bash
npm run deck                      # -> out/deck.pdf       (light / paper theme, default)
npm run deck:dark                 # -> out/deck-dark.pdf  (dark / console theme)
npm run deck:open                 # live preview, arrow keys to navigate

# Bigger raster, custom output path:
node src/export-pdf.mjs src/deck.html out/talk.pdf --width 1920 --height 1080
```

Flags: `--width` (1152), `--height` (648), `--scale` (2), `--quality` (92),
`--theme light|dark` (default: whatever `<body>` carries, i.e. light).

Default 1152×648 at scale 2 rasterises to 2304×1296 — sharp on a projector
without an unshareably large file.

## Primitives

All defined in `src/slides.css`, all demonstrated in `src/deck.html`.

| Class | Use |
|---|---|
| `.slide` | A page. Add `.center` to centre, `.split` for two columns. |
| `.eyebrow` | Small uppercase label above a heading. |
| `.grad` | Emphasised word(s) inside a heading, rendered in the solid `--a1` accent (the name is historic; it is no longer a gradient fill). |
| `.lead` / `.note` | Emphasised intro copy / small de-emphasised aside. |
| `.kpis` + `.kpi` | A row of big figures with captions. |
| `.bars` + `<i>` | A CSS-only bar series. Set `height` inline as a percent. |
| `.cards` + `.card` | A row of bordered boxes. |
| `.shot` | A framed product screenshot. Use these generously. |

## Presenter chrome is stripped automatically

The exporter hides `.deck-nav`, `.deck-progress`, `.deck-counter` and
`.deck-hint` before capturing, so live-only UI never lands in the PDF. Add
navigation, a progress bar or a slide counter freely.

It also neutralises entrance animations (anything with a class containing
`reveal` or `fade`, or a `data-animate` attribute) and disables
`IntersectionObserver`, so scroll-triggered content cannot stay hidden in the
export.

## Changing the look

Edit `src/theme.css` only. Nine colour values (per theme), a radius and three
font stacks drive everything:

```css
--bg  --bg-lift        /* surfaces */
--ink --muted          /* text */
--a1  --a2             /* emphasis accents: signal red, brass */
--a3  --a4             /* data series A / B: sage, amber (flat, never a gradient) */
--rule                 /* hairline borders */
--radius               /* corner radius cap */
--font-display --font-sans --font-mono
```

The default is the project-wide **"Studio Console"** palette defined in
[`docs/VISUAL-STYLE.md`](../docs/VISUAL-STYLE.md): warm paper surfaces,
off-black ink, one signal-red accent, brass figures and a sage/amber pair for
data. Flat colour only — there are no gradients anywhere in the deck. It is
chosen deliberately to avoid the violet/indigo-gradient look AI tooling
defaults to.

**Light is the default** because most hackathon demos happen on a projector in
a lit room, where dark slides wash out. The dark "console" variant is for dim
rooms and screen sharing: add `class="dark"` to `<body>` for the live preview,
or pass `--theme dark` to the exporter (`npm run deck:dark`). Check every slide
in both themes. The font stack is system-only, so the deck renders identically
offline.

**Changing colours:** change `docs/VISUAL-STYLE.md` and `theme.css` in the same
PR, run the banned-pattern grep from that doc, and check every text/background
pairing for contrast before you commit.

**Fonts:** if you swap in a webfont, either self-host it or inline it as a
base64 `@font-face` data URI — a CDN font that fails to load mid-talk will
silently reflow your whole deck.

## Structure that works

1. **Title** — one sentence you want repeated back to you.
2. **Problem** — who hurts, how often, what it costs.
3. **Why this approach** — why the obvious cheaper thing does not work.
4. **Demo** — switch away from the deck.
5. **What you just saw** — real screenshots, not claims.
6. **How it works** — one diagram, five boxes maximum.
7. **Signal** — the two or three numbers you actually have. Use `<TBD>` until
   you have them; never invent a figure.
8. **Next** — close on ambition, then stop talking.

Keep rejected options out of the deck and in your ADR (`docs/adr/`). They are
what a panel probes in questions, and having them written down is the
difference between a confident answer and a shrug.

## Two environment traps `scripts/setup.sh` handles for you

1. **Version-manager shims broken in non-interactive shells.** With some
   `nvm`/`fnm` setups, `node` resolves to a lazy-loading stub that errors
   (`_load_nvm: command not found`, then `maximum nested function level
   reached`) instead of running. `setup.sh` probes candidates and picks a
   `node` that actually executes.

2. **npm 11+ skips Puppeteer's Chromium download.** Newer npm refuses package
   lifecycle scripts by default, so `npm install puppeteer` reports success
   while the browser is never fetched — and the export then fails at launch.
   Setup runs `puppeteer browsers install chrome` explicitly.

## Requirements

- Node 20 or newer (the repo standard is Node 22, see `frontend/.nvmrc`)
- macOS or Linux (Windows via WSL)
- ~400 MB for the Chromium build
