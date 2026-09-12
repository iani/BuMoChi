# Build your own mapping profile

A **mapping profile** is the rule that turns *what your body does* into *what the music does*.
The stage measures your body; you decide what it means. This page is the whole recipe.

Read the [dancer's guide](DANCER-GUIDE.md) §2–3 first: the eleven features it lists are your
inputs, the seven sound controls and five events are your outputs. Nothing else exists.

---

## 1. Decide on paper (10 minutes)

Fill the two tables. Keep it to what you will actually *dance*; three strong links beat eleven weak ones.

**Continuous — one feature (or a blend) per control**

| Sound control | I drive it with… | Floor → ceiling | Why (what it should feel like) |
| --- | --- | --- | --- |
| intensity (loudness) | e.g. `energy` | 0.15 → 1 | never fully silent while I am in frame |
| brightness | | | |
| pitch (register) | | | |
| width | | | |
| pan | | | |
| density (notes per bar) | | | |
| space (reverb) | | | |

**Events — a moment in the body → a musical gesture**

| Event | Fires when… | Threshold | Cool-down |
| --- | --- | --- | --- |
| hit (kick + snap) | e.g. `sharpness` jumps | > 0.55 | 180 ms |
| accent (snap) | | | |
| sweep (filter swoosh) | | | |
| freeze (everything drowns) | e.g. `stillness` rises | > 0.85 | until release |
| release (low kick, opens) | e.g. `stillness` drops | < 0.40 | — |

Rules of thumb: features are 0–1 (lean / symmetry −1…+1), controls are 0–1. Give every
control a floor so the instrument never disappears. Every *on* threshold needs an *off*
threshold lower than it, or it flutters. One or two events are plenty.

---

## 2. Audition the sounds before you dance

- **In the browser**: *Source* → **Clip · hip-hop whip** or **Clip · belly dance**, then switch
  the six existing mappings while it runs. Watch the readout: `intensity · pitch · density` and
  the last event tell you what each control sounds like.
- **In SuperCollider** (for dancers who want to design the sounds too): the same seven controls
  and five events arrive as OSC messages, so you can build and audition your own synths, then
  decide the mapping — see [SUPERCOLLIDER.md](SUPERCOLLIDER.md). Its `sc/profile-template.scd` is
  this worksheet in code.

---

## 3. Turn the worksheet into a profile

A profile is one small TypeScript file in `frontend/src/mapping/`. Copy
[`directMapping.ts`](../frontend/src/mapping/directMapping.ts) (60 lines) and fill in your tables:

```ts
export const createMyProfile = (): Mapping => {
  let lastHitT = -Infinity        // state you need for cool-downs / on–off thresholds
  return {
    id: 'my-profile',
    label: 'My profile · one line dancers see in the dropdown',
    description: 'feature→control in words, so others can dance it too.',
    reset: () => { lastHitT = -Infinity },
    map: (f) => {
      const events: MusicEvent[] = []
      if (f.sharpness > 0.55 && f.t - lastHitT > 180) {          // your event rows
        lastHitT = f.t
        events.push({ kind: 'hit', strength: f.sharpness, t: f.t })
      }
      return {
        t: f.t,
        events,
        params: {                                                 // your control rows
          intensity: f.present ? 0.15 + 0.85 * f.energy : 0,
          brightness: 0.2 + 0.8 * f.upperEnergy,
          pitch: f.handHeight,
          width: 0.3 + 0.7 * f.armSpread,
          pan: 0.5 + 0.5 * f.torsoLean,
          density: 0.2 + 0.8 * f.lowerEnergy,
          space: 0.2 + 0.7 * f.stillness,
        },
      }
    },
  }
}
```

Register it in [`registry.ts`](../frontend/src/mapping/registry.ts) (`MAPPING_FACTORIES`) and
it appears in the *Mapping* dropdown — for one dancer, or for dancer A / B separately in duet mode.

Not a coder? Hand the filled worksheet to whoever runs the laptop; it ports 1:1 into the file
above. Every row of your table is one line of code.

---

## 4. Test, then iterate

1. Run it on a **clip** first — it should react without you moving.
2. Dance it once with **Record** on: you get `dance-timeline-*.json` (every feature and control
   frame) and a `.webm` with the sound.
3. Tune thresholds from the JSON rather than by feel: a hit that fired 40 times in a minute
   needs a higher threshold or longer cool-down. With SuperCollider, `replay.py` replays that
   JSON into your synths so you can tune for an hour without dancing again.
4. A mapping only counts as done when a *stranger* can read its `description` and make it react.
