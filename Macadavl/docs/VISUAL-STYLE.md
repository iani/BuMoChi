# Visual style: "Studio Console"

Rules for every pixel this project ships: the React frontend, the pitch deck in
`deck/`, screenshots, README badges, issue templates. Agents and humans follow
the same rules. If something here conflicts with taste, the rule wins; change
the rule in a PR, do not ignore it.

## 1. Why this document exists

LLM coding agents converge on one look. Ask ten different products for "a
modern UI" and you get the same answer back: Inter, a violet-to-indigo (or
violet-to-pink) gradient hero, Tailwind `blue-500`, glassmorphism cards with a
glow, three `rounded-2xl` feature cards with icons, a sun/moon toggle in the
nav. Designers now call this the *Purple UI problem* / *AI slop signature*,
and users recognise it within seconds.

Sources consulted (Sept 2026):

- Superdesign, *Why AI Design Looks Generic* -- names the cause
  "distributional convergence": models regress to the statistical centre of
  2020-2023 SaaS landing pages.
- Dripatch, *The Purple UI Problem* -- shared component libraries and identical
  design-token defaults (shadcn/Tailwind) explain the sameness.
- Laith Junaidy, *Why AI always reaches for the purple gradient* -- role-by-role
  swap table (accent under 80% saturation, flat neutral hero, solid ink
  headlines, hairline borders instead of glow, off-black/off-white).
- Sailop, *Tailwind Blue, Purple Gradient, 3 Cards* -- traces `#3b82f6`,
  `#8b5cf6` and `from-purple-500 to-pink-500` from Tailwind defaults through
  shadcn to v0/Lovable/Bolt, and lists twelve escape palettes (Industrial,
  Art Deco Gilded, Forest Deep, Monochrome HUD...).
- Lab Twelve, *Why AI-Generated Websites All Look the Same* -- fix = a written
  "design constitution" with banned patterns, enforced mechanically in CI.

The consensus fix is not "avoid purple", it is: **anchor on a real brand
metaphor, spend colour on meaning instead of decoration, keep neutrals slightly
warm, and write the nos down.** This file is our constitution.

## 2. Brand metaphor

**Analog studio hardware.** Matte black consoles, brass knobs, cream paper
track sheets, VU meters that go sage -> amber -> red. It is honest about what
the product is (an audio workbench), it is warm rather than sci-fi, and no
model reaches for it by default.

Not: neon, cyberpunk, "AI brain", glowing orbs, holographic gradients, robots.

## 3. Tokens

Use these names verbatim. Never write raw hex in components; import the tokens.

**Light (paper) is the default** for the deck: it projects well in bright rooms
and reads best on cheap projectors. The dark (console) variant is for dim rooms
and screen sharing. Both use the same hues; only ink and paper swap.

| Token       | Light (default) | Dark            | Role                                              |
| ----------- | --------------- | --------------- | ------------------------------------------------- |
| `--bg`      | `#F4EFE4`       | `#16140F`       | page base (paper / warm off-black)                |
| `--bg-lift` | `#FBF8F1`       | `#24201A`       | raised surfaces, cards, frames                    |
| `--rule`    | `#D8CFBF`       | `#3A342A`       | hairline borders and dividers                     |
| `--ink`     | `#1E1A14`       | `#F1EBDD`       | headings, primary text                            |
| `--muted`   | `#6B6252`       | `#A69C88`       | body copy, labels, axes                           |
| `--a1`      | `#A63A22`       | `#C8472B`       | **the** brand accent: primary action, record, live |
| `--a2`      | `#6F5510`       | `#C9A227`       | brass: figures, eyebrows, list markers, focus ring, slide tab |
| `--a3`      | `#3E7D72`       | `#7FB3A8`       | data series A / meter low / code                  |
| `--a4`      | `#A8781E`       | `#D9A441`       | data series B / meter high                        |
| `--radius`  | `6px`           | `6px`           | max corner radius for cards, inputs, frames       |

Semantic colours are *reserved*, never reused for decoration:

| Semantic  | Light     | Dark      |
| --------- | --------- | --------- |
| success   | `--a3`    | `--a3`    |
| warning   | `--a4`    | `--a4`    |
| danger    | `--a1`    | `--a1`    |
| info      | `--muted` | `--muted` |

Contrast (measured): `--ink` on `--bg` 15:1, `--muted` 6.8:1 dark / 5.2:1
light, `--a2` 7.6:1 dark / 6.1:1 light, `--a3` 7.8:1 dark. `--a1` on dark
`--bg` is 3.9:1, so it is for large text (headline emphasis) and UI
components (buttons, indicators) only, never body copy. Check any new pair
before adding it.

Typography: headings use a condensed grotesk stack
(`"Avenir Next Condensed", "Helvetica Neue Condensed", "Arial Narrow", ...`),
body uses the system sans, code uses the system mono. No Inter, no Roboto, no
DM Sans, no webfont downloads (the deck must render offline in puppeteer).

Canonical implementation: `deck/src/theme.css`. The frontend should expose
the same variables from its root stylesheet (`:root { --bg: ... }`) and map any
component-library theme onto them, so a token change in one place moves both
surfaces.

## 4. Composition rules

1. **One accent per screen.** `--a1` appears once as the thing you should look
   at (primary button, live indicator, the emphasised word in a headline).
   Everything else is ink, muted, and brass.
2. **Value does the work, not chroma.** Hierarchy comes from size, weight and
   spacing. Backgrounds are flat `--bg`. **No gradients anywhere**: not on
   backgrounds, not on bars, not clipped to text. Two data series get two flat
   colours (`--a3`, `--a4`), not a ramp.
3. **Hairlines over glow.** Cards and frames get a 1px `--rule` border on a
   flat `--bg-lift` fill and optionally one quiet shadow. No coloured drop shadows, no blur/frosted glass.
4. **Radius cap 6px** (`--radius`). Pills only for genuinely round things
   (status dots, transport buttons).
5. **Real content over icons.** Show a waveform, a spectrogram, a screenshot,
   a number with a unit. No emoji as icons, no stock "AI" imagery.
6. **Numbers are tabular** (`font-variant-numeric: tabular-nums`) and always
   carry a unit or a label.
7. **Copy is specific.** Name the job (e.g. "Trim silence, keep the downbeat").
   Banned words: supercharge, unlock, seamless, elevate, harness, transform
   your, 10x, next-gen, revolutionary.
8. **Light (paper) by default**, dark variant via `body.dark`. Appearance lives
   in settings, not as a sun/moon toggle in the nav. Every slide and screen
   must be checked in both themes before shipping.
9. **One signature element.** The deck's is the short brass tab
   (`.eyebrow::before`) in the top-left of every slide. The frontend should pick
   exactly one equivalent (e.g. a brass rule under the transport bar), not five.

## 5. Banned patterns (grep-able)

Reject in review, whatever the surface:

| Pattern                                                            | Why                          |
| ------------------------------------------------------------------ | ---------------------------- |
| any violet/indigo/fuchsia accent (`#8b5cf6`, `#6366f1`, `#a855f7`, `purple-*`, `indigo-*`, `violet-*`, `fuchsia-*`) | the AI signature colour |
| Tailwind default blue as primary (`#3b82f6`, `#2563eb`, `blue-500/600`) | same                    |
| any `linear-gradient` / `radial-gradient` / `conic-gradient`, `bg-gradient-to-*`, gradient-clipped text (`background-clip: text`) | decoration doing meaning's job |
| glassmorphism (`backdrop-filter: blur`) outside modals, coloured `box-shadow` glow | fake depth              |
| `rounded-xl` / `rounded-2xl` / radius > 6px on cards               | radius cap                   |
| pure `#000` or `#FFF` as surface or text                           | use the warm neutrals        |
| emoji as icons or bullets, "brain"/"robot"/"sparkle" hero art       | stock AI imagery             |
| `slate-*` neutral scale                                            | shadcn default fingerprint   |
| Inter / Roboto / DM Sans                                           | default typeface             |
| raw hex in `.tsx` / `.html` outside `theme.css` / root tokens      | tokens only                  |

A one-liner that catches most of it on the frontend and deck:

```bash
git grep -nE '#(8b5cf6|6366f1|a855f7|3b82f6|2563eb)|(purple|indigo|violet|fuchsia|slate)-[0-9]{2,3}|(linear|radial|conic)-gradient\(|bg-gradient-to|background-clip:\s*text|backdrop-filter|rounded-(xl|2xl|3xl)' -- frontend/src deck/src
```

An empty result is the expected state.

## 6. Where the rules live

- `docs/VISUAL-STYLE.md` -- this file, the source of truth.
- `.agents/skills/visual-style/SKILL.md` -- the Agent Skill agents load for any visual
  work (Devin reads `AGENTS.md` + `.agents/skills/`, not rule files); it points here.
- `deck/src/theme.css` -- canonical token values for the deck.
- `.agents/skills/generate-deck/SKILL.md` -- deck skill; its hard gate includes
  this palette.
- Frontend root stylesheet -- should mirror the tokens (owned by the frontend
  workstream; keep the names identical).

Changing a colour means changing it here and in `theme.css` in the same PR.
