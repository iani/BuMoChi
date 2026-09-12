# SuperCollider sound lab

Design the sound in your own SuperCollider (IDE, `sclang`, `scsynth` — nothing wrapped) while the
Dance Stage (`#/dance`) tracks the dancer and streams the seven control parameters plus events over
OSC. Two dancers are supported: `A` and `B`.

## Dancer part — make sound in 5 minutes

1. **Install SuperCollider** (free): <https://supercollider.github.io/downloads>. Open the IDE.
2. **Open `sc/dance-lab.scd`** from this repo. Click inside the big `( … )` block and press
   **Cmd/Ctrl+Enter**. Wait for `dance-lab: listening on 57120` in the post window.
3. **Run the bridge** in a terminal (once per session):
   `cd tools/sc-bridge && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && python bridge.py`
4. On **`#/dance`** choose **Engine → SuperCollider (local OSC bridge)** and press **Start**. Dance.

**What arrives in SC** — `/dance/A/params` = 7 numbers, all 0..1, ~30–60× per second:
`intensity brightness pitch width pan density space`; `/dance/A/event` = a word + a strength
(`hit`, `accent`, `sweep`, `freeze`, `release`); `/dance/A/stop` when you press Stop.
`receive.scd` keeps the latest values in `~dancerA` (`~dancerA.intensity`, …).

**Write your own mapping** in **`sc/profile-template.scd`** — the marked block: "when intensity > …
play …", "pitch → note in the scale", "hit → kick". It already sounds out of the box. Change a
number, press Cmd/Ctrl+Enter, hear it — no restart needed. The 8 starter sounds are in
`sc/synths.scd`; tweak the values marked `<- tweak`.

**Try sounds without dancing** — open `sc/explorer.scd` (Cmd/Ctrl+Enter): sliders for the 7
params, buttons for the 5 events, same hooks as the live stream. Or record once on `#/dance`
(**Record** downloads a JSON timeline) and play it back as often as you like, no camera or bridge
needed: `python tools/sc-bridge/replay.py my-timeline.json`.

**Two dancers** = `A` and `B` (`/dance/B/…`, `~dancerB`, `~onParamsB`…). B starts as a copy of A's
profile; give B its own sound at the bottom of `profile-template.scd`.

## Developer part — ports, contract, tools

### How the bytes flow

```
browser #/dance  ──JSON over WebSocket──▶  tools/sc-bridge/bridge.py  ──OSC over UDP──▶  sclang
engine "osc"         ws://127.0.0.1:57130        (Python, local only)     udp 127.0.0.1:57120
```

A browser cannot send UDP, so `frontend/src/audio/oscEngine.ts` (`createOscDanceEngine`) sends one
JSON text frame per message — `{"address": "/dance/A/params", "args": [ …7 floats… ]}` — to the
local bridge, which turns it into one OSC message for sclang (57120 is sclang's default
`NetAddr.langPort`). Params are rate-limited in the browser to **≤ 60 msg/s** (extra frames are
dropped, never queued); events are always forwarded.

| Port | Who listens | Flag |
| --- | --- | --- |
| `57130` (TCP, WebSocket) | `bridge.py` | `--ws-port` (browser side: `createOscDanceEngine({ url })`) |
| `57120` (UDP, OSC) | `sclang` | `--osc-port` (both `bridge.py` and `replay.py`) |

### Message contract

`<D>` is `A` or `B`. All numbers are OSC floats (`f`), strings are `s`.

| Address | Args (type tags) | Meaning |
| --- | --- | --- |
| `/dance/<D>/params` | 7 × float `,fffffff` — in this order: `intensity`, `brightness`, `pitch`, `width`, `pan`, `density`, `space` | Latest control frame, all nominal `0..1`. `intensity` overall energy · `brightness` verticality / openness (filter cutoff) · `pitch` height (note) · `width` arm / stance spread (stereo width) · `pan` left–right position (0 = left, 1 = right) · `density` movement busyness (note rate) · `space` distance / stillness (reverb) |
| `/dance/<D>/event` | `kind` string, `strength` float `,sf` | One message per discrete event. `kind` ∈ `hit`, `accent`, `sweep`, `freeze`, `release`; `strength` `0..1` |
| `/dance/<D>/stop` | none `,` | Sent once when the dancer presses Stop — release voices, clear state |

The frontend side of this contract lives in `frontend/src/audio/oscEngine.ts` (`OSC_PARAM_ORDER`)
and `frontend/src/mapping/types.ts` (`ControlFrame`); the receiving side is `sc/receive.scd`
(`OSCdef`s that fill `~dancerA` / `~dancerB` and call the `~onParams<D>` / `~onEvent<D>` /
`~onStop<D>` hooks defined in `sc/profile-template.scd`).

### Run the bridge

```bash
cd tools/sc-bridge
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python bridge.py                       # ws://127.0.0.1:57130 → udp://127.0.0.1:57120
python bridge.py --ws-port 57131 --osc-port 57121   # if you moved either side
```

It logs one line when a browser connects and one when it disconnects (with forwarded / dropped
counts) — never per message. Then on `#/dance` choose **Engine → SuperCollider (local OSC bridge)**
and press **Start**. If the bridge is not running, Start ends in the `error` state with the
connection message.

### Replay a recorded timeline (no camera, no bridge)

Record once on `#/dance` (the **Record** button downloads `dance-timeline-….json`), then iterate on
sounds as often as you like:

```bash
cd tools/sc-bridge && . .venv/bin/activate
python replay.py ~/Downloads/dance-timeline-2026-….json            # real time, dancer A
python replay.py timeline.json --speed 2.0 --dancer B              # twice as fast, as dancer B
```

`replay.py` reads `entries[].control` of the exported timeline, waits the recorded `control.t`
deltas between frames (divided by `--speed`), sends the same `/dance/<D>/params` and
`/dance/<D>/event` messages the browser would — straight to UDP 57120 — and ends with
`/dance/<D>/stop`.

### Tests

```bash
cd tools/sc-bridge && . .venv/bin/activate
pip install -r requirements.txt pytest ruff mypy
ruff check . && ruff format --check . && mypy . && pytest
```

`test_bridge.py` checks JSON → OSC conversion including type tags and malformed-input handling;
`test_replay.py` checks timeline parsing, message order and timing. The tooling is intentionally
not part of the frontend / backend CI jobs nor of the Render service — it runs on the dancer's
laptop only.

### Headless check of the SC starter (no audio device needed)

```bash
sudo apt-get install -y supercollider-language supercollider-server   # Debian/Ubuntu
sclang -D sc/test/headless-check.scd &                                # loads synths + receive + profile, waits
cd tools/sc-bridge && . .venv/bin/activate
python replay.py ../../sc/test/fixture-timeline.json --speed 4        # 3 frames, 2 events, stop
```

`headless-check.scd` prints the received `~dancerA` values, the hook call counts and `check: PASS`
(exit 0) or `check: FAIL` (exit 1). It never boots `scsynth`, so it proves parsing, `OSCdef`
receipt and hook wiring — not sound. To exercise the SynthDefs on a machine without a sound card,
start `jackd -r -d dummy` first and run `sclang -D sc/dance-lab.scd`.
