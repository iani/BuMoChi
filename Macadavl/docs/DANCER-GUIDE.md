# Dancer's guide — dancing with the Dance Stage

You dance; a camera watches; the music follows *you*. This page tells you what the system
can hear in your body, how to set it up, and what each of the six "mappings" (musical
personalities) rewards — so you can pick one and play with it, not fight it.

Open: <https://ai-and-music-2026.pages.dev/#/dance> (Chrome or Safari, laptop or phone).

Want your own musical personality? [Build your own mapping profile](MAPPING-PROFILES.md)
(one page). Want to design the sounds themselves? [SuperCollider lab](SUPERCOLLIDER.md).

---

## 1. Setup in 60 seconds

1. **Stand the camera still** at hip-to-chest height, 2–4 m away, landscape. Your whole body
   — head to feet — must stay in the frame, including when you reach up or step sideways.
   One dancer only; a second person in view confuses the tracker.
2. **Light from the front**, plain background if you can. Avoid strong backlight (a window
   behind you).
3. **Sound on.** Headphones or a speaker near the laptop; the browser needs a click to start
   audio, which is why nothing plays until you press *Start*.
4. In the page: *Source* → **Camera · live MediaPipe**; *Camera* → **Back / main camera** on a
   phone, the only option on most laptops; *Mapping* → pick one from §4 (start with
   **Kinesphere**).
5. Press **Start**. Within a couple of seconds you see your skeleton drawn over the camera
   image and the *Pipeline* line says `running` with a rising frame count. If it says
   `unreachable` or the skeleton is missing, see §6.
6. Dance. Change the *Mapping* dropdown at any time — the music switches instantly without
   stopping. Press **Record** to save a `.webm` video (stage + sound) and a `.json` timeline of
   everything the system measured; **Stop** ends the session.

> Everything runs in your browser. No video or audio ever leaves your device.

---

## 2. What the system hears in your body

The camera gives 33 body points ~30 times per second. From them the stage computes a small
set of **features**, each a number between 0 and 1 (lean and symmetry go from −1 to +1). They
are shown live in the *Feature readout* panel under the stage — watch them while you move to
learn your own instrument.

| Feature | 0 means | 1 means | How to drive it |
| --- | --- | --- | --- |
| **energy** | frozen | whole body flying | overall speed of hands, elbows, knees, feet |
| **upper** / **lower** | arms / legs still | arms / legs fast | isolate: arms only vs. footwork only |
| **sharpness** | flowing, constant speed | sudden stop-and-go | a pop, a whip, a stamp; a sudden freeze after a burst |
| **stillness** | moving | held pose | stop completely for a moment to trigger a freeze; any clear move releases it |
| **hands** | hands at the hips or below | hands above the head | height of your *higher* hand |
| **spread** | hands together | arms fully open | distance between your wrists |
| **lean** | −1 lean left … +1 lean right | | tilt your shoulders |
| **stance** | feet together | wide stance | distance between ankles |
| **symmetry** | −1 left side moves … +1 right side moves | 0 = both equally | move one side only |
| **confidence** | tracker lost you | fully seen | stay in frame, front-lit |

Two things the tracker can *not* see: **depth** (steps towards / away from the camera read
as size changes, not travel) and **fingers / face**. Big, clear shapes read best; tiny
gestures are below its resolution.

---

## 3. What the music can do

A mapping turns those features into seven **sound controls** and a handful of **events**.
You will hear:

- **Loudness** (intensity) — the whole mix; when you leave the frame it fades to silence.
- **Brightness** — a filter opening from dull to sparkling.
- **Register** (pitch) — low chords/notes ↔ high ones; the pad changes chord when you cross
  a register boundary (it holds each chord at least a moment, so it won't flutter).
- **Stereo width** and **pan** — narrow/mono ↔ wide; left ↔ right.
- **Density** — how many plucked 16th notes play per bar, from a sparse pulse to a full run
  (the base tempo is 112 BPM).
- **Space** — reverb, from a dry room to a hall.
- Events: **hit** (kick + snap, from a sharp move), **accent** (snap), **sweep** (filter
  swoosh upwards), **freeze** (everything drowns in reverb and dulls while you hold still),
  **release** (a big low kick and the filter opens again when you move out of a freeze).

The stage readout shows `intensity · pitch · density` and the last event, so you can check
that what you did was heard.

Know SuperCollider? Design your own sounds and mapping in your own SC, driven live by these
same controls — see the [SuperCollider sound lab](SUPERCOLLIDER.md) (5-minute setup at the top).

---

## 4. The six mappings — dancer profiles

Each mapping listens for something different. Pick the one that matches how you like to
move, or switch between them mid-dance to hear the same movement interpreted five ways.
One-line summaries also appear under the stage when a mapping is selected.

### Direct (placeholder) — *the raw instrument*
The simplest, most literal wiring: energy = loud, hands high = high notes, arms open = wide,
lean = pan, arm speed = bright, leg speed = dense, holding still = reverb.
**Try:** move one thing at a time and hear one thing change. Good for learning the features.

### Kinesphere · your use of space — *for travellers and reachers*
Listens to **where** you are and **how much room you take**. Your starting spot becomes
"centre": drift left or right and the sound pans with you (slowly — it slews, it doesn't
snap). Open the arms and widen the stance → wider and brighter. Hands and body height set
the register. Travelling across the stage fills the room with reverb and adds notes;
standing on one spot dries it out.
**Signature moves:** open your arms wide from closed → a *sweep*; reach a hand above your
head → an *accent*. Step across the whole frame and back.
**Reward:** covering ground, big shapes, high reaches. **Punishes:** small dancing on the spot.

### Own Pulse · beat from your swing — *for groovers*
Finds the **tempo in your own arm swing** and locks the drums to it. Swing an arm (or both)
up and down steadily for about three seconds at any pace between ~50 and ~200 swings per
minute; once it locks, the notes become denser and brighter, every fourth swing gets an
accent, and your sharp moves are quantised to your own half-beat (an early hit waits for
the next slot, so it never sounds off-grid). Change tempo clearly and it announces the new
one with a sweep.
**Signature moves:** a regular arm swing, bounce, or rock — anything periodic with the hands.
**Reward:** steady, repeated motion. **Punishes:** constant tempo changes or arms that never
move — without a swing it stays at its sparse floor.

### Effort Voice · Laban qualities — *for expressive / contemporary dancers*
Listens to the **quality** of movement rather than the shape (Laban's Effort factors):
- **Weight** — low, grounded, wide stances with busy legs → loud and low; light, high → soft
  and high.
- **Time** — sudden stop-and-go → bright, snappy attacks; sustained, even speed → soft.
- **Space** — asymmetric, one-sided, arms open → wide stereo; symmetric and closed → narrow.
- **Flow** — free, continuous motion → dry; bound, hesitant, tense motion → reverberant.
Strong (heavy) hits get an extra accent; holding still freezes the room.
**Try:** the same phrase performed *light & sustained* then *strong & sudden* — it should
sound like two different instruments.

### Mood Rooms · arousal × valence scenes — *for storytellers*
Reads two things — **arousal** (how energetic and sharp) and **valence** (how smooth, open,
lifted) — and places you in one of four musical *rooms*: **joy** (high energy, smooth & open),
**agitation** (high energy, jerky & closed), **sadness** (low energy, closed, low hands — slow,
dark, drowned in reverb), **tenderness** (low energy, open & smooth — soft, wide, warm). A room
only changes after you have clearly been in the new one for over half a second, and every
change is announced by a sweep, so you can build a narrative: sadness → tenderness → joy.
**Try:** curl up and move slowly, then unfold, open your arms and speed up.
**Punishes:** hovering in the middle — commit to a mood to move rooms.

### Signature · you vs. your own norm — *for improvisers, and for a finale*
Learns **your** personal range as you dance and plays how far you stray from *your* normal,
not the absolute size of a move. A small dancer's big moment sounds as big as a big dancer's.
It also remembers your recurring poses / movement states: showing a *new* kind of movement
sweeps in; returning to a state you already showed and holding it for 1.5 s answers with an
accent and an echoing room — your dance starts to quote itself. Grows denser the more
vocabulary you show (up to six states).
**Try:** dance normally for 20–30 s to teach it your baseline, then do something out of
character; then come back to a pose from earlier and hold it.
**Note:** the memory resets when you press Stop / Start or change mapping.

---

## 5. Suggested 2-minute arc (one dancer)

1. **Kinesphere** (20 s) — enter from the side, travel across, big opening reach.
2. **Own Pulse** (25 s) — settle into a swing, let the drums lock to you, then change tempo.
3. **Effort Voice** (25 s) — one phrase light/sustained, the same phrase strong/sudden.
4. **Mood Rooms** (25 s) — collapse into sadness, unfold to tenderness, break into joy.
5. **Signature** (25 s) — improvise, then quote your own earlier pose; freeze to end (the
   freeze drowns the sound in reverb; move once more for the release kick).

Switch mappings with the dropdown while running; a helper at the laptop can do it for you.

---

## 6. Dancing as a pair (duet mode)

*Dancers* → **Two dancers (A / B)**. The tracker now follows two people and each gets their
own mapping (two dropdowns: *dancer A*, *dancer B*), their own voice and their own skeleton
colour: **A is teal, B is gold**; the readouts under the stage are split the same way.

- **Who is A?** The person standing further **left in the picture** when you both first
  appear. After that you keep your seat even if you cross — the tracker follows each body by
  where it was a moment ago. If it swaps you (it can, when you cross while overlapping),
  press Stop → Start and re-enter left/right.
- **One sound space, two voices.** B's instruments play a fifth higher with a squarer tone,
  so you can hear who is who while still sounding like one piece. Pick contrasting mappings
  for contrast (Own Pulse + Effort Voice), the same mapping for a mirror duet.
- **Being lost.** If one of you leaves the frame, that voice fades and the other keeps
  playing; step back in and your seat is still yours for a couple of seconds.
- **Alone in duet mode.** The pose model sometimes imagines a second body in a busy
  background for a moment; B may flicker in briefly. Use *One dancer* when dancing solo.
- **Frame.** Stand 2–4 m from the camera with a clear gap between you; the two demo clips in
  duet mode play both dancers side by side so you can audition mapping pairs sitting down.
- **Recording** captures both of you: one mixed `.webm` and a timeline with both dancers'
  features and controls per frame.

---

## 7. When it doesn't react

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No skeleton, `confidence` near 0 | out of frame, backlit, too far | step back into frame, turn the light to your face, 2–4 m |
| Skeleton jitters / features flicker | low light or motion blur | more light; a plain wall behind you |
| No sound but status is `running` | browser audio not unlocked / muted | press Stop, then Start again after clicking the page; check volume |
| Pipeline `unreachable` on Start | camera permission denied | allow camera for the site in the browser bar, reload |
| Only the sparse pulse in *Own Pulse* | no periodic swing detected | swing an arm evenly for 3 s; don't change tempo yet |
| Sound stays dull and drowned | you are in a *freeze* | move — the release kick confirms it |
| Music fades to silence | tracker lost you | come back into frame; it returns within a second |

No camera? *Source* → **Clip · hip-hop whip** or **Clip · belly dance** plays a demo dancer
through the exact same pipeline, so you can audition all six mappings before you stand up.

---

## 8. Under the hood (one paragraph, for the curious)

Camera → MediaPipe Pose (33 landmarks) → feature extraction (the table in §2, smoothed and
normalised to your own body size) → the selected **mapping** (`frontend/src/mapping/`) →
seven sound controls + events → a Tone.js synth engine (pad chords, 16th-note plucks,
kick, snap, filter, stereo, reverb) and the on-screen visuals → optional recording. In duet
mode the pose model returns two people, a tracker keeps them in stable A/B seats, and the
whole chain after it runs twice, independently.
Latency from movement to sound is a few tens of milliseconds. The five researched mappings
and the literature behind them are described in
[`docs/research/dance-mapping-strategies.md`](research/dance-mapping-strategies.md).
