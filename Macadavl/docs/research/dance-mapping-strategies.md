# Musicification of dance movement — literature review and five mapping strategies

*Research report for `openhackbot/ai-and-music-2026` (no code changes). Grounded in the actual contracts in `frontend/src/features/types.ts`, `frontend/src/features/extractor.ts`, `frontend/src/mapping/types.ts` and `frontend/src/mapping/directMapping.ts`.*

## 0. Assumptions about the pipeline (stated, not asked)

- The real `FeatureFrame` fields are `t, present, confidence, leftHandHeight, rightHandHeight, handHeight, armSpread, torsoLean, positionX, positionY, stanceWidth, energy, upperEnergy, lowerEnergy, sharpness, stillness, symmetry`. There is **no** `jerk`, `verticality` or `tempoEstimate`; where needed they are derived inside the stateful `Mapping` (`map` is called in frame order, `reset()` exists).
- Features are already EMA-smoothed (`alpha = 0.35`, ≈ 60–70 ms at 30 fps) and squashed with `1 − e^(−x)` into `[0,1]`; `torsoLean` and `symmetry` are in `[−1,1]`. Every strategy treats `present === false` as "hold params, ramp `intensity` to 0 over ~300 ms, no events".
- A strategy adds at most one EMA/hysteresis stage (< 70 ms), keeping total latency under ~100 ms. Baseline `direct-v0` (`intensity = 0.15 + 0.85·energy`, `pitch = handHeight`, hit on `sharpness > 0.55` / 180 ms cooldown, freeze/release hysteresis 0.85/0.40) is the reference.

---

## 1. Primer — what makes a movement→sound mapping *feel* expressive

**Mapping is where expression lives.** Hunt, Wanderley and Paradis showed that with identical sensors and synthesizer, changing only the mapping changes how engaging a system feels, and that mappings demanding the user's energy beat one-knob-per-parameter ones ([Hunt, Wanderley & Paradis 2003](https://doi.org/10.1076/jnmr.32.4.429.18853); [NIME 2002 version](https://www.nime.org/proceedings/2002/nime2002_088.pdf)). Rovan, Wanderley, Dubnov and Depalle introduced the vocabulary still used: **one-to-one**, **divergent (one-to-many)** and **convergent (many-to-one)** mappings, arguing that convergent/many-to-many mappings are the ones that behave like acoustic instruments ([Rovan et al. 1997](http://recherche.ircam.fr/equipes/analyse-synthese/wanderle/Gestes/Externe/Mapp/kansei_final.html)).

**Three families of mapping.** (1) **Direct / parameter-mapping**: each data stream drives an acoustic parameter continuously; the Sonification Handbook lists the classic targets (pitch, loudness, brightness, tempo, spatial position) and warns about polarity and scaling ([Grond & Berger](https://sonification.de/handbook/chapters/chapter15/)). Dubus and Bresin's review of 179 publications found pitch the most-used dimension and kinematic quantities most often mapped to spatial or pitch dimensions ([Dubus & Bresin 2013](https://doi.org/10.1371/journal.pone.0082491)). (2) **State-based / layered**: EyesWeb extracts low-level cues (Quantity of Motion, Contraction Index, motion/pause segmentation), classifies expressive states (fluent/rigid, light/heavy, four emotions), and lets output depend on rules over state and performance history ([Camurri, Mazzarino & Volpe 2004](https://doi.org/10.1007/978-3-540-24598-8_42); [Camurri et al. 2000](https://doi.org/10.1162/014892600559182)). (3) **Learned / mapping-by-demonstration**: IRCAM's gesture follower aligns live movement to recorded templates with HMMs, outputting *progression* and *likelihood* continuously ([Bevilacqua et al. 2010](https://doi.org/10.1007/978-3-642-12553-9_7)); Françoise's mapping-by-demonstration learns the motion→sound regression (GMR/HMR) from a few performed examples ([Françoise et al. 2014](https://hal.science/hal-01061335); [Françoise & Bevilacqua 2018](https://doi.org/10.1145/3211826)). Learned mappings are the most personal but need training data.

**Energy/arousal is the strongest and most robust cue.** In Camurri, Lagerlöf and Volpe's dance study, spectators recognised four emotions above chance, and the cues separating them were mainly *Quantity of Motion* and *Contraction Index* — high QoM for anger/joy, low QoM and contraction for grief/fear ([Camurri, Lagerlöf & Volpe 2003](https://doi.org/10.1016/s1071-5819(03)00050-8)). A compact set of upper-body dynamic features supports an arousal/valence description of affective gesture ([Glowinski et al. 2011](https://doi.org/10.1109/t-affc.2011.7)). On the music side, Juslin and Laukka's review of 104 performance and 41 vocal studies found a shared emotion-specific code: **anger** → fast tempo, high loudness, sharp attacks, bright spectrum; **happiness** → fast, moderate–high loudness, bright, rising contours; **sadness** → slow, soft, soft attacks, low spectral energy, legato; **tenderness** → slow, soft, legato, dull timbre; **fear** → fast, soft, large dynamics variability, staccato ([Juslin & Laukka 2003](https://doi.org/10.1037/0033-2909.129.5.770); cue-utilisation study: [Juslin 2000](https://doi.org/10.1037/0096-1523.26.6.1797); overview in the [Handbook of Music and Emotion](https://www.oupcanada.com/catalog/9780199604968.html)). Russell's circumplex gives the two axes to organise this: arousal (activation) and valence (pleasure) ([Russell 1980](https://doi.org/10.1037/h0077714)).

**Smoothness ↔ valence, sharpness ↔ anger/fear.** Wallbott found body-movement quality cues (jerkiness vs. smoothness, expansiveness, movement activity) separate emotion categories in actors ([Wallbott 1998](https://doi.org/10.1002/(SICI)1099-0992(1998110)28:6%3C879::AID-EJSP901%3E3.0.CO;2-W)). Musically, this corresponds to attack sharpness and articulation (staccato/legato) and to timbral roughness — all in the Juslin cue table.

**Periodicity/groove.** People spontaneously entrain to periodic stimuli and produce periodic movement ([Repp & Su 2013](https://doi.org/10.3758/s13423-012-0371-2); [Phillips-Silver, Aktipis & Bryant 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC3137907/)). In free dance, different body parts carry different metric levels: arm/hand oscillations tend to sit at the tactus (beat) level, torso and lateral weight shifts at bar-level periods ([Toiviainen, Luck & Thompson 2010](https://doi.org/10.1525/mp.2010.28.1.59); [PDF](https://users.jyu.fi/~ptoiviai/pdf/Toiviainen_et_al_MP2010.pdf)); the spatial trajectory of dance gestures itself encodes meter ([Naveda & Leman 2010](https://doi.org/10.1525/mp.2010.28.1.93)). Higher pulse clarity increases head/hand/foot movement ([Burger et al. 2013](https://doi.org/10.3389/fpsyg.2013.00183)). So a **beat derived from the dancer's own oscillation** is well supported.

**Space/register.** Cross-modal studies show a strong vertical-space ↔ pitch mapping (rising pitch = rising body/hands) and loudness ↔ approach/expansion ([Eitan & Granot 2006](https://doi.org/10.1525/mp.2006.23.3.221)); Caramiaux et al. found listeners' spontaneous gestures track the *dynamic profile* of causal sounds and the *trajectory* of abstract ones ([Caramiaux et al. 2014](https://baptistecaramiaux.com/assets/pdf/caramiaux_mapping_2014.pdf)). Camurri's Contraction Index (personal-space use, related to Laban's kinesphere) is the canonical "expansion" cue ([Camurri, Mazzarino & Volpe 2004](https://doi.org/10.1007/978-3-540-24598-8_42)).

**Chunks and micro-motion.** Music-related movement is perceived in *chunks* of roughly 0.5–5 s ([Godøy, Jensenius & Nymoen 2010](https://doi.org/10.3813/aaa.918323)); Godøy's "gestural-sonorous objects" are the sound-side equivalent ([Godøy 2006](https://doi.org/10.1017/s1355771806001439)). Leman frames the body as mediator between sound energy and meaning — the loop sonification closes ([Leman 2007](https://doi.org/10.7551/mitpress/7476.001.0001); [Godøy & Leman 2010](https://www.routledge.com/Musical-Gestures-Sound-Movement-and-Meaning/Godoy-Leman/p/book/9780415998871)). Even *standstill* is musically usable via micro-motion ([Jensenius, sonic microinteraction](https://doi.org/10.4324/9781315621364-47); [Sverm](https://www.uio.no/ritmo/english/projects/completed-projects/sverm/index.html)). Effenberg's work shows real-time sonification of kinematics improves perception and reproduction of movement — dancers *do* hear themselves in it ([Effenberg 2005](https://doi.org/10.1109/mmul.2005.31); [Effenberg et al. 2016](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2016.00219/full); dance: [Großhauser et al. 2012](https://pub.uni-bielefeld.de/record/2528002); descriptor review: [Larboulette & Gibet 2015](https://doi.org/10.1145/2790994.2790998)).

**Laban Effort → musical parameter.** Laban Movement Analysis describes *how* a movement is done via four Effort factors, each a continuum ([LMA overview](https://en.wikipedia.org/wiki/Laban_movement_analysis)). Françoise, Fdili Alaoui, Schiphorst and Bevilacqua sonified Effort factors from Certified Movement Analysts' vocalisations and derived design guidelines from a dancer workshop ([Françoise et al. 2014, DIS](https://doi.org/10.1145/2598510.2598582); [PDF](https://saralaoui.com/wp-content/uploads/2015/08/DIS2014-francoiseetal.pdf)); Fdili Alaoui et al. show movement *qualities* as an interaction modality enhance exploratory, expressive interaction ([Fdili Alaoui et al. 2012](https://doi.org/10.1145/2317956.2318071)). The correspondences that recur across that work and the Juslin cue table:

| Effort factor | Movement pole | Musical correlate | Our feature |
| --- | --- | --- | --- |
| **Time** | Sudden ↔ Sustained | attack sharpness, staccato/legato, note density | `sharpness`, `energy` slope |
| **Weight** | Strong ↔ Light | loudness, low-register weight, distortion/roughness | `lowerEnergy`, `positionY`, `stanceWidth` |
| **Space** | Direct ↔ Indirect | narrow/focused timbre vs. wide, detuned, chorused spread | `symmetry`, `armSpread`, path curvature |
| **Flow** | Bound ↔ Free | sustain/release, reverb decay, vibrato/legato | `stillness`, `sharpness` variance, energy smoothness |

---

## 2. Five mapping strategies

### Strategy 1 — "Effort Voice": direct Laban-Effort mapping

**Core idea.** Compute four continuous Effort estimates (Time, Weight, Space, Flow) from the frame, then use *convergent* mapping so that each Effort colours several sound parameters at once, like Françoise et al.'s vocalisation-based Effort sonification. The dancer's *quality* (not position) is what they hear.

**Grounding.** LMA Effort as *how* a movement is performed ([Françoise et al. 2014](https://doi.org/10.1145/2598510.2598582)); movement qualities as interaction modality ([Fdili Alaoui et al. 2012](https://doi.org/10.1145/2317956.2318071)); EyesWeb's fluency/impulsiveness/directness descriptors ([Camurri et al. 2004](https://doi.org/10.1007/978-3-540-24598-8_42)); many-to-many mappings feel more instrument-like ([Rovan et al. 1997](http://recherche.ircam.fr/equipes/analyse-synthese/wanderle/Gestes/Externe/Mapp/kansei_final.html); [Hunt et al. 2003](https://doi.org/10.1076/jnmr.32.4.429.18853)).

**Derived state (per frame, inside the Mapping):**

- `time = sharpness` (Sudden → 1). Add `timeVar = EMA(|sharpness − sharpnessEMA|, α=0.1)` as the Flow proxy: high variance of acceleration = Bound/jerky.
- `weight = clamp01(0.5·lowerEnergy + 0.3·(1 − positionY) + 0.2·stanceWidth)` (assumes `positionY` grows downward in image coordinates so low hips = Strong; flip if not).
- `space = clamp01(0.6·(1 − |symmetry|) + 0.4·armSpread)` — symmetric, wide = Indirect/scanning; one-sided, narrow = Direct.
- `flow = clamp01(1 − 2·timeVar) · (1 − stillness·0.5)` → 1 = Free.

**Mapping table:**

| Effort / feature | ControlParam / event | Formula |
| --- | --- | --- |
| Weight, energy | `intensity` | `present ? 0.1 + 0.6·energy + 0.3·weight : →0` |
| Time (+Weight) | `brightness` | `0.15 + 0.55·time + 0.3·weight` (Sudden+Strong = bright/anger cues) |
| Weight | `pitch` | `0.35 + 0.45·(1 − weight) + 0.2·handHeight` (Strong = low register) |
| Space | `width` | `0.2 + 0.8·space` |
| Space | `pan` | `0.5 + 0.35·torsoLean + 0.15·symmetry` |
| Time | `density` | `0.15 + 0.85·EMA(time, α=0.2)` |
| Flow | `space` (reverb) | `0.15 + 0.65·flow + 0.2·stillness` |
| Time | `hit` | `sharpness > 0.55` rising edge, cooldown 180 ms, `strength = sharpness` (keep baseline) |
| Weight × Time | `accent` | `hit && weight > 0.6` → `accent(strength = weight)` |
| Flow → Bound | `freeze` / `release` | `stillness` hysteresis 0.85 / 0.40 (baseline) **or** `flow < 0.2` for > 400 ms → `freeze`, `flow > 0.5` → `release` |

Smoothing: `α = 0.2` on `weight`, `space`, `flow` (≈150 ms) to avoid chatter; `time` left raw for attack fidelity.

**What the dancer hears/feels.** Stamping, low, strong movement gets a heavy, bright, accented sound; floating light gestures rise into a soft high register with long reverb; jerky bound movement dries and thins the sound. The *quality* is audible even when the dancer stays in place.

**Failure modes.** `positionY` depends on framing, so Weight drifts if the dancer approaches the camera (mitigate: normalise `positionY` against a 10 s EMA). `symmetry` is noisy when a wrist is occluded (`confidence` gate). Four continuous Efforts on seven params can feel "mushy" without discrete events — keep the `hit/accent` layer.

**24 h feasibility (Tone.js only).** High. Arithmetic on existing fields; `brightness` → filter cutoff, `space` → `Tone.Reverb` wet, `accent` → a louder `MembraneSynth` layer.

---

### Strategy 2 — "Mood Rooms": arousal–valence quadrant with hysteresis

**Core idea.** Estimate arousal from energy/sharpness and valence from smoothness/expansion, place the dancer in Russell's circumplex, and switch between four musical *scenes* (chord/scale, articulation, density) only when the estimate leaves a hysteresis band. Inside a scene the params still track continuously, so it is a state-based *plus* direct mapping.

**Grounding.** Russell's two-dimensional affect space ([Russell 1980](https://doi.org/10.1037/h0077714)); arousal/valence description of affective gesture from dynamic features ([Glowinski et al. 2011](https://doi.org/10.1109/t-affc.2011.7)); QoM/contraction separate joy/anger from grief/fear ([Camurri et al. 2003](https://doi.org/10.1016/s1071-5819(03)00050-8)); jerky vs. smooth/expansive body cues ([Wallbott 1998](https://doi.org/10.1002/(SICI)1099-0992(1998110)28:6%3C879::AID-EJSP901%3E3.0.CO;2-W)); emotion-specific acoustic cues to render each quadrant ([Juslin & Laukka 2003](https://doi.org/10.1037/0033-2909.129.5.770)); EyesWeb's layered "decision rules over context and history" ([Camurri et al. 2004](https://doi.org/10.1007/978-3-540-24598-8_42)).

**State estimate (α = 0.08 ≈ 400 ms, a "chunk" scale per [Godøy et al. 2010](https://doi.org/10.3813/aaa.918323)):**

- `arousal = EMA(0.6·energy + 0.4·sharpness)`
- `valence = EMA(0.5·(1 − jerkiness) + 0.3·armSpread + 0.2·handHeight)` where `jerkiness = EMA(|Δsharpness|/Δt·k, α=0.3)`, `k` chosen so typical values fall in [0,1] (calibrate on 10 s of warm-up).
- Quadrant with hysteresis: switch axis sign only when `|arousal − 0.5| > 0.12` **and** `|valence − 0.5| > 0.12` for ≥ 600 ms (≈ 18 frames); otherwise stay. Emit `sweep(strength = distance moved)` on each quadrant change so transitions are audible.

**Mapping table:**

| Quadrant (arousal, valence) | Juslin cue set | Scene params (the Mapping outputs these as offsets) |
| --- | --- | --- |
| high / positive ("joy") | fast, bright, rising, moderate-loud | `brightness +0.3`, `density 0.6–1.0`, `pitch` bias +0.2, `space 0.2` |
| high / negative ("anger/fear") | loud, sharp attacks, high spectral energy, staccato | `intensity +0.2`, `brightness +0.4`, `density 0.5–0.9`, `width 0.3` (narrow), `space 0.1` |
| low / negative ("sadness") | slow, soft, legato, low register | `intensity −0.2`, `pitch` bias −0.25, `density 0.1–0.3`, `space 0.8` |
| low / positive ("tenderness") | slow, soft, legato, dull timbre | `brightness −0.3`, `density 0.2–0.4`, `width 0.9`, `space 0.6` |

Continuous inside a scene: `intensity = 0.1 + 0.8·energy + offset`, `pitch = clamp01(handHeight + bias)`, `pan = 0.5 + 0.5·torsoLean`, `width = base + 0.4·armSpread`. Events: baseline `hit`; `freeze/release` as baseline.

**What the dancer hears/feels.** Calm smooth movement pulls the music into a warm, spacious mode; bursting into fast angular movement snaps it into a bright, driving, staccato scene. The system *reads their mood* rather than their limbs, and hysteresis makes a scene hold long enough to dance inside it.

**Failure modes.** Valence from pose is weakly supported — arousal cues are far more reliable; expect mis-reads (sad-but-wide = "tender"). Too little hysteresis ping-pongs, too much feels unresponsive. Align scene changes to the next bar to avoid arbitrary cuts.

**24 h feasibility.** Medium-high. Four scene presets (scale table, envelope, filter) in the engine; Tone.js `PolySynth` + `Filter` + `Reverb` suffice. The scene only changes param offsets, so `ControlFrame` is unchanged.

---

### Strategy 3 — "Own Pulse": rhythmic entrainment from periodic motion

**Core idea.** Detect the dancer's dominant oscillation period from hand height and hip sway, lock an internal phase oscillator to it, and quantise `hit`/`accent` events and `density` to that self-generated beat. The music's tempo *is* the dancer's tempo, so groove emerges from entrainment rather than from a fixed click.

**Grounding.** Sensorimotor synchronisation and entrainment ([Repp & Su 2013](https://doi.org/10.3758/s13423-012-0371-2); [Phillips-Silver et al. 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC3137907/)); arms carry tactus-level periodicity, torso bar-level ([Toiviainen et al. 2010](https://doi.org/10.1525/mp.2010.28.1.59)); meter encoded in gesture space ([Naveda & Leman 2010](https://doi.org/10.1525/mp.2010.28.1.93)); pulse clarity ↔ movement ([Burger et al. 2013](https://doi.org/10.3389/fpsyg.2013.00183)); Effenberg's kinematic sonification of rhythmic sport movement ([Effenberg 2005](https://doi.org/10.1109/mmul.2005.31)).

**Period estimate (stateful):** keep a 4 s ring buffer (120 frames) of `handHeight` and of `positionX`; every 250 ms compute autocorrelation for lags 300–1200 ms (50–200 BPM). Take the lag with max normalised autocorrelation `r`; **pulse clarity** `pc = clamp01((r − 0.3)/0.5)`. Accept a new period only if `pc > 0.4` and it differs < 15 % from the current, else EMA (`α=0.3`) toward it; if `pc < 0.25` for > 3 s, free-run the last period (a "memory" of the groove). Phase: zero-crossings of `handHeight − EMA(handHeight)` (upward) re-align phase with a PLL gain 0.25 per beat.

**Mapping table:**

| Feature / derived | ControlParam / event | Formula |
| --- | --- | --- |
| period (hand) | engine tempo (via `density` + event timing) | `density = clamp01(0.2 + 0.8·pc)`; hits emitted only on quantised beat slots (nearest 1/2 beat) |
| `sharpness` | `hit` | if `sharpness > 0.45` within ±80 ms of a beat slot → `hit(strength = sharpness)`; else defer to slot (max 60 ms) or drop |
| beat 1 of a 4-beat bar (from `positionX` lag ≈ 2–4× hand lag) | `accent` | `accent(strength = 0.5 + 0.5·lowerEnergy)` |
| `energy` | `intensity` | `0.15 + 0.85·energy` (baseline) |
| `pc` | `brightness` | `0.2 + 0.6·pc + 0.2·upperEnergy` (clearer pulse = brighter) |
| `handHeight` | `pitch` | baseline, but quantised to the scale on beat slots |
| `armSpread`, `torsoLean` | `width`, `pan` | baseline |
| `stillness` | `space`, `freeze/release` | baseline; on `freeze` hold the period and let a pad ring |
| period change > 15 % accepted | `sweep` | `sweep(strength = |Δperiod|/period)` |

**What the dancer hears/feels.** Swinging arms produce percussion that lands *with* them; slowing slows the beat; stopping keeps their last tempo so they can re-enter on it. The most legible "I am the metronome" experience, with groove and no backing track.

**Failure modes.** Autocorrelation needs ≥ 2 periods, so tempo lags 1–2 s (state it in the UI). Non-periodic floor work gives low `pc` — the free-run fallback must degrade to sparse hits, not sound broken. Half/double-tempo errors: constrain to 50–200 BPM and prefer the lag nearest the previous. Hit deferral eats latency — cap at 60 ms and never quantise `intensity`.

**24 h feasibility.** Medium. Autocorrelation on 120 samples every 250 ms is trivial; Tone.js `Transport.bpm.rampTo(bpm, 0.5)` + `Transport.scheduleRepeat`. A first version can skip the PLL and just set BPM.

---

### Strategy 4 — "Kinesphere": spatial mapping of use of space

**Core idea.** Treat the camera frame as a stage and the dancer's kinesphere (reach envelope) as the timbral field: where you are pans and filters the sound, how much of your kinesphere you occupy sets width and register, and travelling through space leaves a spatial reverb trail. It is a one-to-many mapping of *position/expansion* with deliberately literal, audience-legible polarities.

**Grounding.** Contraction Index / personal-space (Laban kinesphere) as an expressive cue ([Camurri et al. 2004](https://doi.org/10.1007/978-3-540-24598-8_42)); spatial dimensions of sound are the most common target for kinematic data ([Dubus & Bresin 2013](https://doi.org/10.1371/journal.pone.0082491)); vertical space ↔ pitch, approach ↔ loudness ([Eitan & Granot 2006](https://doi.org/10.1525/mp.2006.23.3.221)); trajectory-tracking gestures for abstract sounds ([Caramiaux et al. 2014](https://baptistecaramiaux.com/assets/pdf/caramiaux_mapping_2014.pdf)); topological gesture space ([Naveda & Leman 2010](https://doi.org/10.1525/mp.2010.28.1.93)).

**Derived:** `expansion = clamp01(0.5·armSpread + 0.3·stanceWidth + 0.2·handHeight)` (inverse of Contraction Index); `travel = EMA(|ΔpositionX| + |ΔpositionY|, α=0.15)·k`; `reach = |leftHandHeight − rightHandHeight|`; long-term stage centre `cx = EMA(positionX, α=0.005)` (≈ 7 s) so panning is relative to where the dancer *usually* is.

**Mapping table:**

| Feature | ControlParam / event | Formula |
| --- | --- | --- |
| `positionX` (relative) | `pan` | `clamp01(0.5 + 1.5·(positionX − cx))` — stage left/right, slew-limited to 0.05/frame |
| `torsoLean` | `pan` (fine) | `+ 0.15·torsoLean` |
| `expansion` | `width` | `0.1 + 0.9·expansion` (contracted = mono point source) |
| `handHeight` + `positionY` | `pitch` | `clamp01(0.7·handHeight + 0.3·(1 − positionY))` |
| `expansion` | `brightness` | `0.25 + 0.5·expansion + 0.25·upperEnergy` |
| `travel` | `space` | `0.15 + 0.6·travel + 0.25·stillness` (moving through space leaves a trail; standing still also blooms) |
| `energy` | `intensity` | `0.1 + 0.9·energy` |
| `lowerEnergy` | `density` | baseline |
| `armSpread` crossing 0.75 upward (hysteresis 0.75 / 0.55) | `sweep` | `sweep(strength = armSpread)` — opening the arms |
| `reach > 0.5` rising edge | `accent` | one hand high, one low → `accent(strength = reach)` |
| `stillness` | `freeze/release` | baseline |

Smoothing: `pan` slew-limited (not EMA) so fast crossings still read; `width` EMA `α=0.25`.

**What the dancer hears/feels.** Crossing the stage sweeps the sound across the speakers; opening the body opens and brightens the image; curling up collapses it to a small dark dry point; running leaves a wash. The most immediately readable mapping because polarities follow cross-modal intuitions.

**Failure modes.** Camera-relative is *not* room position — turning sideways changes `armSpread` without changing the kinesphere. Depth is unavailable from 2-D `positionY`. Occluded arms drop `armSpread` to ~0 → sudden mono collapse; gate on `confidence > 0.5` and hold.

**24 h feasibility.** High. Tone.js `Panner`, `StereoWidener`, `Filter`, `Reverb`; stereo only, true ambisonics out of scope.

---

### Strategy 5 — "Signature": session memory and self-echo

**Core idea.** Accumulate a per-session profile of the dancer (running mean/variance of each feature, a small codebook of their recurrent posture–energy states, and a ring buffer of their recent `ControlFrame`s), then (a) express *deviation from their own norm* rather than absolute values and (b) replay their own past phrases as an echo layer when they repeat a state. This is a lightweight, deterministic stand-in for mapping-by-demonstration: the dancer teaches the system by dancing.

**Grounding.** Mapping-by-demonstration: users perform while listening and the system learns the coupling ([Françoise et al. 2014](https://hal.science/hal-01061335); [Françoise & Bevilacqua 2018](https://doi.org/10.1145/3211826)); gesture follower outputs continuous *progression/likelihood* against recorded templates ([Bevilacqua et al. 2010](https://doi.org/10.1007/978-3-642-12553-9_7)); Camurri's layered model explicitly includes "the history of the performance" ([Camurri et al. 2004](https://doi.org/10.1007/978-3-540-24598-8_42)); Leman's mediation loop where the body becomes the meaning-carrier ([Leman 2007](https://doi.org/10.7551/mitpress/7476.001.0001)); Godøy's chunks/gestural-sonorous objects motivate 0.5–5 s echo units ([Godøy et al. 2010](https://doi.org/10.3813/aaa.918323); [Godøy 2006](https://doi.org/10.1017/s1355771806001439)); evidence that sonified feedback of one's own kinematics is recognised and used ([Effenberg et al. 2016](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2016.00219/full)); IRCAM's "sonic microinteraction" and standstill work for the still-body echo ([Jensenius](https://doi.org/10.4324/9781315621364-47)).

**Profile state:** for each of `energy, sharpness, armSpread, handHeight, stillness, symmetry`: Welford running mean `μ` and variance `σ²` (start with priors `μ=0.4, σ=0.2`, weight 60 frames). Z-score `z = (x − μ)/max(σ, 0.05)`; normalised `n = clamp01(0.5 + z/4)`. Codebook: k = 6 centroids over `[energy, armSpread, handHeight, lowerEnergy]`, online k-means updated every 500 ms, each centroid storing the last 2 s of `ControlFrame`s it produced (a "phrase"). Recognition: nearest centroid at distance `d`; **repeat** = same centroid held ≥ 1.5 s with `d < 0.15` after having visited ≥ 2 other centroids.

**Mapping table:**

| Feature / derived | ControlParam / event | Formula |
| --- | --- | --- |
| `n(energy)` | `intensity` | `0.15 + 0.85·n(energy)` — *louder than your usual* is what gets loud |
| `n(sharpness)`, `n(upperEnergy)` | `brightness` | `0.2 + 0.5·n(sharpness) + 0.3·upperEnergy` |
| `n(handHeight)` | `pitch` | `n(handHeight)` (a short dancer's max reach still hits the top of the register) |
| `n(armSpread)` | `width` | `0.2 + 0.8·n(armSpread)` |
| `torsoLean`, `symmetry` | `pan` | `0.5 + 0.35·torsoLean + 0.15·symmetry` |
| session time / variety | `density` | `0.15 + 0.5·lowerEnergy + 0.35·(centroids visited / k)` — the piece thickens as the dancer reveals more of their vocabulary |
| repeat detected | `space` | `+0.3` while the echo layer plays (echo lives in reverb) |
| `stillness` | `space`, `freeze/release` | baseline; on `freeze`, replay the stored phrase of the *nearest* centroid at −12 dB (the dancer hears themselves while still) |
| `hit` | `hit` | `sharpness > μ_sharp + 1.5·σ_sharp` (personal threshold, floor 0.35), cooldown 180 ms |
| new centroid created (novel state) | `sweep` | `sweep(strength = d)` |
| repeat detected | `accent` | `accent(strength = 1 − d)` |

Priors decay: use only the running stats after 60 valid frames; reset via `reset()`.

**What the dancer hears/feels.** For ~20 s the system "listens" and sounds like the baseline; then dynamics reflect *their* range — a small mover's small gestures become expressive rather than quiet. Returning to a motif, a ghost of what they played before answers; freezing, they hear an echo of themselves. The strongest "hearing yourself" narrative, and deterministic given the frame sequence.

**Failure modes.** Cold start (announce it as "learning you"). Z-scoring flattens a uniformly high-energy dancer — mix `0.7·n + 0.3·raw`. Online k-means drifts; cap centroid step (`η = 0.05`) and freeze the codebook after 90 s. Echo can clash harmonically — replay only percussive/pad layers, or force the same scale.

**24 h feasibility.** Medium. Welford stats + 6-centroid k-means ≈ 150 lines; echo = stored `ControlFrame`s fed to a second engine voice (`PolySynth` + `FeedbackDelay`). A true GMR/HMR model (Françoise's XMM) is *not* attempted — this is the deterministic approximation.

---

## 3. Comparison

| Strategy | Expressiveness (dancer) | Legibility (audience) | Robustness to pose noise | Implementation effort (24 h) |
| --- | --- | --- | --- | --- |
| 1 Effort Voice | High — qualities, not positions | Medium — audience hears "heavy/light, sharp/soft" but not why | Medium — `symmetry`/`positionY` sensitive; smoothing helps | Low (arithmetic on existing fields) |
| 2 Mood Rooms | Medium-high — reads mood, holds a scene | High — scene changes are obvious | High — 400 ms EMA + 600 ms hysteresis suppress jitter | Medium (4 presets in engine) |
| 3 Own Pulse | High for rhythmic dancers, low for floor work | Very high — "the beat is her arms" | Medium — needs periodic signal; falls back gracefully | Medium (autocorrelation + Transport sync) |
| 4 Kinesphere | Medium — literal, can feel like a controller | Very high — pan/width follow the body | Medium-low — occlusion collapses `armSpread`; needs confidence gate | Low |
| 5 Signature | Very high (personal, memory) | Low-medium — needs narration/visuals to be understood | High — statistics average out noise | Medium-high (stats + codebook + echo voice) |

Pose-noise note: MediaPipe jitter is worst on wrists/ankles, so any strategy leaning on `armSpread`, `stanceWidth`, `symmetry` needs the `confidence` gate and ≥ 100 ms smoothing; `energy`/`stillness` are already smoothed by the extractor and are the safest inputs, which is why they carry `intensity` in every strategy.

---

## 4. Recommended order for a 2-minute live demo

Start legible, escalate to personal; switch mappings on the extractor's own `freeze` events so changes land on stillness.

1. **0:00–0:25 — Kinesphere (4).** The dancer enters and crosses the stage; pan and width follow. Instantly readable: "the sound is me".
2. **0:25–0:55 — Own Pulse (3).** She swings; the beat locks to her arms, then slows with her. Biggest audience "wow" and the first *musical* coupling. Keep Kinesphere's pan as a residual for a seamless join.
3. **0:55–1:25 — Effort Voice (1).** Contrast stamping/strong vs. floating/light, sudden vs. sustained. Shows *quality* mapping — the core of the review; show Laban terms on the visuals.
4. **1:25–1:50 — Mood Rooms (2).** Two clear mood shifts (calm-smooth → agitated-angular) trigger scene changes with `sweep`s. Only two transitions are needed, so jitter is not a risk.
5. **1:50–2:00 — Signature (5) coda.** The profile has accumulated silently since 0:00. She returns to her opening motif and freezes; the system answers with the echo of her own first phrase.

If only three fit in 24 h: **4 → 3 → 1**. Run Signature in *shadow mode* from the start of any build so the coda is available as soon as the echo voice works.

*All links were checked on 2026-09-12 (DOIs verified against Crossref; some publisher pages show a bot-check to scripts but open in a browser).*
