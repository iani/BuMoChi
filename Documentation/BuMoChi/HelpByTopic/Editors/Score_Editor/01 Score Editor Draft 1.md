# Score Editor: purpose and initial design

## Purpose

The Score Editor arranges animation actions over time. Each Score is associated with one Godot project and may use one or more BuMoChi Scenes belonging to that project. Each BuMoChi Scene identifies the Godot `.tscn` scene resource that it controls.

The Score Editor does not edit Clips, Presets, or the internal configuration of a Scene. Those tasks belong to the Asset Editor. It selects existing Scene content and determines when it is activated, played, changed, or stopped.

## Initial workflow

1. Create or select a Score.
2. Select its associated Godot project.
3. Add existing BuMoChi Scenes associated with that project.
4. Place Scene-activation cues on the timeline.
5. Place Preset playback cues while their assigned Scenes are active.
6. Set cue start times and, where applicable, durations or stop times.
7. Preview, stop, seek, and save the Score.

If a needed Scene or Preset does not yet exist, the user may open it in the Asset Editor. Returning to the Score Editor should preserve the current Score and timeline position.

## Minimum cue types

The first implementation needs only:

- **Activate Scene**: make a BuMoChi Scene and its Godot scene resource active;
- **Play Preset**: start a Preset assigned to the active Scene; and
- **Stop Preset**: stop a playing Preset.

Later versions may add live-animation wiring, parameter changes, waits, external-event triggers, camera actions, audio actions, and other performance cues.

## Minimum useful window

The first Score Editor should contain:

1. A Score list with **New**, **Rename**, **Save**, and **Clone** actions.
2. The associated Godot project, displayed prominently.
3. An available-Scenes list containing only Scenes associated with that project.
4. A Preset list that follows the currently selected Scene.
5. A timeline with separate rows or lanes for Scene activation and Preset playback.
6. A cue inspector for start time, duration or stop behavior, and other cue-specific values.
7. Transport controls: **Play/Pause**, **Stop**, **Return to start**, and timeline seeking.
8. A visible playhead and current Score time.
9. A feedback/status line for validation and playback results.

A first layout may be:

```text
Score: performance_a       Godot project: boy_and_birds

Scenes              Presets in selected Scene
────────────        ─────────────────────────
opening             mother_enters
duet                 slow_walk
ending               bird_gesture

Timeline
────────────────────────────────────────────────────────────
Scene     | opening────────────| duet─────────| ending──────
Presets   | mother_enters      | slow_walk    | bird_gesture
          0                    20             35           50 s

[Return to start] [Play/Pause] [Stop]      Current: 12.40 s
```

## Validation rules

- A Score must identify exactly one Godot project.
- Every Scene used by the Score must be associated with that project.
- A Preset cue must refer to a Preset assigned to the Scene active at that time.
- A Scene must be activated before one of its Presets can play.
- Missing Scenes or Presets remain visible as broken references and must not be silently discarded.
- Moving a Scene cue must also validate all affected Preset cues.
- The behavior of playing Presets at a Scene transition must be explicit. The safe initial default is to stop Presets belonging to the outgoing Scene.

## Storage

Score definitions should be stored as human-readable `.scd` data beneath:

```text
BuMoChiAssets/Scores
```

Each Score should use one named file. It stores its Godot-project reference, Scene references, ordered timeline cues, and timing—not Clip data, Preset contents, or Godot node trees.

## Proposed entry points

```supercollider
Bmc.scoreEditor;
Bmc.scoreEditor(\performanceA);
```

These methods and the Score data class are specifications only and are not yet implemented.
