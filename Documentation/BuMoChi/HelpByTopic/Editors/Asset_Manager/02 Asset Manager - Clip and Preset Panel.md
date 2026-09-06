# Clip and Preset panel of the Asset Manager

> **Implementation comment (2026-09-04): terminology revised.** A **clip** is the full recorded source data. A **preset** is a named, non-destructive description of how that clip is played. It stores the frame range, playback speed, loop behavior, bone selection, and playback target(s), plus the sonification and frame-modification code described in document 02. A preset never changes the clip. The implementation will use the name `BmcClipPreset`.

> **Revised interface decision:** Distinct data concepts do not require separate workflow steps. The principal configuration GUI is the **Asset Manager**. It embeds Clip browsing, recording, and Preset editing so that a Preset created there is immediately assigned to the Scene already being edited. The **Sequence Editor** remains separate because it edits a timeline. The existing `Bmc.clipEditor` may remain as a lightweight Clip-inspection and troubleshooting utility; it is not the required route for composing a Scene.

## Purpose

Long motion clips cannot be edited reliably by guessing frame numbers or repeatedly changing arguments in code. BuMoChi needs a simple visual browser in which the user can play a clip, see the current position on a timeline, seek to any point, mark useful beginning and end boundaries, audition that range repeatedly, and save it under a meaningful name.

The Asset Manager should include a non-destructive Clip and Preset panel. It does not alter or copy the source Clip. At minimum, a Preset stores a named reference to an inclusive range of frames in the source Clip and its playback and processing parameters. It may initially be saved without a Scene. When a Scene is already selected, saving the Preset assigns it to that Scene without a separate assignment step.

## Relationship to Sequences and Scenes

Every Preset used in a performance plays in one BuMoChi Scene. A newly prepared Preset may remain unassigned until the user starts constructing a Scene or Sequence. Its eventual Scene identifies one Godot project and one Godot `.tscn` scene resource, and defines the figures, avatars, objects, and routes that are valid playback targets.

The Asset Manager browses saved Sequences and expands each Sequence to show its Scenes. Selecting `Sequence → Scene` opens that Scene as the current editing context. Any Preset added in the Clip and Preset panel is assigned to this current Scene automatically. The Sequence is a browsing context; the Preset stores a stable Scene reference rather than becoming owned by that Sequence. If the same Scene is used by several Sequences, its Presets remain available in all of them.

A Preset cannot simply be reassigned to a different Scene, because its targets may be specific to the original Scene. To reuse the same playback settings elsewhere, the user selects **Clone preset**, supplies a new name, selects the destination Scene, and validates or changes its targets. The clone refers to the same immutable source Clip and initially copies the range, speed, looping, bones, sonification code, and modification code.

## Proposed entry points

Open the Asset Manager and retain its current Sequence and Scene selection:

```supercollider
Bmc.assetManager;
```

Open a particular Scene from a Sequence:

```supercollider
Bmc.assetManager(\performanceA, \opening);
```

The embedded preview should use a dedicated player name such as `\assetManager`, so it does not unexpectedly reconfigure the default player or another performance playback. `Bmc.clipEditor` remains an optional direct entry point for inspecting Clips and testing Presets without providing the complete Scene-design workflow.

> **Implementation draft (2026-09-05):** `Bmc.assetManager` groups project, Godot Scene, target identity, launch, and listener-status controls in its upper area. The lower area has three equal-purpose columns: existing Clips, existing Presets, and the body parts controlled by the selected Preset. **Add to Scene** creates an in-memory, Scene-specific copy of the selected Preset using the currently selected body parts and avatar target. **Play** prepares that named target with its inspected VMC port and starts playback; **Stop** stops the Asset Manager's Preset players. The source Preset is not changed. These assignments remain provisional until Scene persistence is implemented.

The interface uses self-describing two-state buttons: **Open Scene / Close Scene**, **Animate from Camera / Stop Camera Animation**, and **Record clip / Stop recording**. **Open Scene** launches the selected Godot Scene; **Close Scene** closes the currently launched Godot Scene window, if one is running. Camera animation targets the currently selected Scene avatar. Stopping it mutes that camera source only after raw input publication, so the independent **Camera data on** indicator and Clip recording continue to work. Recording requires a new Clip name; stopping it saves the Clip and refreshes the Clip list. Godot-running, VMC-listening, and camera-data checkboxes are status indicators rather than action controls.

A read-only integer box immediately following **Record clip / Stop recording** displays the selected Clip's frame count. During recording it changes to the number of frames captured so far and refreshes approximately every 0.25 seconds. When recording stops, the newly saved Clip remains selected and the box shows its final frame count.

## Minimum useful editor window

The initial editor should contain:

1. The source clip name, frame count, and total duration.
2. Transport buttons: **Play/Pause**, **Stop**, and **Play selection**.
3. A **Loop selection** toggle.
4. A playback-speed control, initially offering at least `0.25`, `0.5`, `1`, and `2`.
5. A timeline spanning the complete source clip.
6. A visible playhead showing the current playback frame and time.
7. Visible in and out markers delimiting the preset's selected range.
8. Numeric displays for current frame/time, in frame/time, out frame/time, and selected duration.
9. **Set in** and **Set out** buttons that use the current playhead position.
10. The Asset Manager's Sequence and Scene selectors, showing the current editing context.
11. A clear display of the current Scene's Godot project and `.tscn` resource.
12. A Preset-name field and **Add preset**, **Save preset**, and **Clone preset** buttons.

A rough layout is:

```text
Clip: ishidomaru1        1843 frames        30.716 s

[Play/Pause] [Stop] [Play selection] [Loop selection]  Speed [1.0]

0:00.000  |----------[======|==============]----------|  0:30.716
                         in  playhead       out

Current: frame 720 / 12.014 s
In:      frame 615 / 10.261 s       [Set in]
Out:     frame 948 / 15.807 s       [Set out]
Selection duration: 5.546 s

Preset name: [ishidomaru_bird_gesture____] [Save preset]

Sequence: [performance_a____]  Scene: [opening____]
Godot: boy_and_birds / res://scenes/opening.tscn
[Add preset] [Save preset] [Clone preset]
```

## Scene editing context

The top-level Asset Manager should use two linked lists or menus:

1. **Sequence** lists saved Sequence definitions found in `Bmc.sequenceDirectory`.
2. **Scene** lists the Scenes referenced by the selected Sequence, in Sequence order.

Selecting a Scene should display its BuMoChi Scene name, Godot project, `.tscn` resource, and available playback targets. The Clip and Preset panel then operates inside that context. Preset target controls should offer names from the current Scene rather than accepting arbitrary unvalidated names. A Scene used by multiple Sequences may appear beneath each of them but remains the same Scene.

If no Sequences exist, the editor should offer material-preparation mode for recording Clips and saving unassigned Presets. It should also explain that a Sequence and Scene must be created or selected before Scene configuration and target assignment can be completed. If a Sequence refers to a missing Scene, the Scene should remain visible but marked unavailable; assigning or playing a Preset in it must be refused with a useful message.

Changing the Scene selector while editing an existing Preset must not silently move that Preset. The user must use **Clone preset** to create a differently named Preset for the destination Scene.

The timeline can initially be implemented as a custom `UserView`. It should draw the full bar, shade the selected range, and draw the playhead above it. This is preferable to several unrelated sliders because it makes the relationship among the complete clip, selected range, and current playback position immediately visible. If custom mouse behavior takes too long to implement, a normal playhead `Slider` plus a `RangeSlider` for the in/out range is an acceptable first prototype.

## Timeline interaction

The essential interactions should be simple and discoverable:

- Clicking or dragging on the timeline moves the playhead and immediately previews that motion frame in Godot.
- **Set in** places the start marker at the current frame.
- **Set out** places the end marker at the current frame.
- The in and out marker handles may also be dragged directly.
- **Play selection** starts at the in marker and stops after sending the out frame.
- With **Loop selection** enabled, playback returns to the in marker after the out frame.
- **Stop** retains the selected boundaries and returns the playhead to the in marker.
- Closing the window stops and removes the editor's player but does not discard already saved presets.

Useful keyboard shortcuts can be added without replacing visible controls:

- Space: play or pause.
- `i`: set the in marker.
- `o`: set the out marker.
- Return: play the selected range.
- Escape: stop.
- Left/right arrow: step by one frame.
- Shift-left/shift-right: step by a larger amount, initially ten frames.

Frame stepping is indispensable near a boundary. Time-only seeking is not precise enough when a significant gesture begins between irregularly spaced motion-capture frames.

## Required player changes

`BmcClipPlayer` already has `currentIndex`, `startFrame`, `endFrame`, `rate`, `looping`, `seek`, and a `\frame` dependency notification. This provides most of the playback model, but the editor needs several refinements:

### Immediate preview

The current `seek(seconds)` changes `currentIndex` but does not send the newly selected frame immediately. Add methods such as:

```supercollider
player.seekFrame(frameIndex, preview: true);
player.seekTime(seconds, preview: true);
player.stepFrames(1);
```

With `preview: true`, the player should send the selected frame to its output and publish the same `\frame` notification used during playback. This lets the timeline and Godot update while playback is stopped.

### Seeking during playback

Seeking while the player's task is waiting must cancel that pending wait and reschedule playback from the new frame. Otherwise the visual playhead can move while the old playback schedule remains active. The player should have one internal scheduling path shared by play, seek-while-playing, looping, and restart.

### Position notification

The existing notification:

```supercollider
this.changed(\frame, currentIndex, clip.frameAt(currentIndex));
```

is sufficient to identify the frame. The editor can obtain its source time with `clip.timeAt(currentIndex)`. GUI updates triggered from `SystemClock` playback must be moved onto `AppClock` or wrapped in `.defer` before changing views.

### Efficient time-to-frame conversion

`seek(seconds)` currently scans the clip linearly. Timeline dragging could call it many times per second, so time-to-frame lookup should use a binary search over the clip timestamps. The result should be the newest recorded frame whose timestamp is not later than the requested time, matching the playback timing rules already documented for irregular recordings.

## Named preset data

> **Implementation comment:** The original range-only proposal has been revised below. A `BmcClipPreset` contains the complete manner of playback specified in document 02. The source clip remains the complete immutable recording.

Introduce a non-destructive playback data object named `BmcClipPreset`:

```supercollider
BmcClipPreset(
    name: \ishidomaru_bird_gesture,
    sourceClip: \ishidomaru1,
    scene: (project: \boyAndBirds, name: \opening),
    startFrame: 615,
    endFrame: 948,
    loop: true,
    speed: 1.0,
    bones: \all,
    targets: [\Ishidomaru]
)
```

The frame indices are authoritative and inclusive. For human inspection, the saved representation should also include the corresponding start time, end time, and duration:

```supercollider
(
    format: \bmcClipPreset,
    formatVersion: 1,
    name: \ishidomaru_bird_gesture,
    sourceClip: \ishidomaru1,
    scene: (project: \boyAndBirds, name: \opening),
    startFrame: 615,
    endFrame: 948,
    startTime: 10.261,
    endTime: 15.807,
    duration: 5.546,
    loop: true,
    speed: 1.0,
    bones: \all,
    targets: [\Ishidomaru],
    sonificationCode: nil,
    modificationCode: nil
)
```

Start and end times should be derived from the source clip when saving, rather than treated as a second independently editable definition. This avoids disagreement between frames and times in clips with irregular timestamps.

The preset should also retain enough source identity to detect mistakes after a source clip has been replaced. At minimum this should include the source clip name, frame count, and duration at the time the preset was saved. A later version could add a stable clip identifier or content hash.

## Storage

Preset definitions should be saved as human-readable `.scd` data using `asCompileString`, following the approach already used by `BmcScene`. They should live with the data belonging to their source clip beneath `BuMoChi_Data/Clips`.

```supercollider
BuMoChi_Data/Clips/ishidomaru1/Presets
```

One file per preset is easiest to inspect, version, rename, and recover:

```text
Presets/
    ishidomaru_bird_gesture.scd
    ishidomaru_climbs.scd
    mother_waits.scd
```

The exact clip-folder migration should be reconciled with the existing flat `BmcClipLibrary` during implementation. The important rule is that preset definitions remain separate from the immutable full recording, while staying associated with its clip.

Suggested API:

```supercollider
Bmc.savePreset(
    \ishidomaru_bird_gesture,
    \ishidomaru1,
    startFrame: 615,
    endFrame: 948
);

Bmc.preset(\ishidomaru1, \ishidomaru_bird_gesture);
Bmc.listPresets(\ishidomaru1);
Bmc.showPresets(\ishidomaru1);
Bmc.removePreset(\ishidomaru1, \ishidomaru_bird_gesture);
```

Removing a preset removes only its playback definition. It never deletes or changes the source clip.

## Playing and composing with presets

A saved preset should be usable wherever a clip can be played:

```supercollider
Bmc.playPreset(\ishidomaru1, \ishidomaru_bird_gesture);
```

Internally this resolves the source clip and calls the existing range-aware playback:

```supercollider
Bmc.playClip(
    \ishidomaru1,
    startFrame: 615,
    endFrame: 948
);
```

Scene definitions should eventually accept a clip together with a preset name. The preset supplies the source range, speed, loop behavior, bone selection, targets, and processing code. A scene may explicitly override these values for one performance without modifying the stored preset.

## Validation and safety

Saving should enforce:

- the source clip exists and is loaded;
- `startFrame` and `endFrame` are valid integers;
- `0 <= startFrame <= endFrame < clip.size`;
- the preset name is non-empty and safe for use as a filename;
- when a Scene is assigned, it exists and belongs to the indicated Godot project;
- when a Scene is assigned, every playback target exists in that Scene; and
- an existing preset is not overwritten without explicit confirmation.

Loading should report a clear warning if the named source clip is missing or if its stored frame count and duration no longer match. The definition should remain available for inspection even when it cannot currently be played.

## Suggested first implementation

The minimum feature that makes boundary selection humanly practical is:

1. Add immediate frame/time seeking and frame stepping to `BmcClipPlayer`.
2. Add `BmcClipPreset` and an in-memory preset library with `.scd` persistence.
3. Define Sequence persistence and the Scene references needed by the `Sequence → Scene` browser.
4. Add the Clip and Preset panel to `Bmc.assetManager(sequenceName, sceneName)`, with transport controls, automatic assignment to the current Scene, cloning, playhead, range selection, numeric frame/time displays, and save-by-name.
5. Add `Bmc.playPreset`, `Bmc.listPresets`, and `Bmc.showPresets`.
6. Test a short regular Clip, a long Clip, and an irregularly timed Clip.
7. Test boundary selection while stopped, playing, paused, looping, and at non-unit speed.
8. Test Scene assignment, missing Scenes, invalid targets, and cloning to another Scene.

Waveforms or motion-feature graphs may eventually be drawn below the timeline, but they are not required for the first usable editor. The immediate priority is accurate visual navigation, frame-level boundary marking, repeated audition, and reliable non-destructive storage.
