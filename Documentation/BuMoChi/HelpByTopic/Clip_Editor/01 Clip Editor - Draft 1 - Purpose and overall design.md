# Clip Editing

> **Implementation comment (2026-09-04): terminology revised.** A **clip** is the full recorded source data. A **preset** is a named, non-destructive description of how that clip is played. It stores the frame range, playback speed, loop behavior, bone selection, and playback target(s), plus the sonification and frame-modification code described in document 02. A preset never changes the clip. The implementation will use the name `BmcClipPreset`.

## Purpose

Long motion clips cannot be edited reliably by guessing frame numbers or repeatedly changing arguments in code. BuMoChi needs a simple visual browser in which the user can play a clip, see the current position on a timeline, seek to any point, mark useful beginning and end boundaries, audition that range repeatedly, and save it under a meaningful name.

The first implementation should be a non-destructive preset editor. It does not alter or copy the source clip. At minimum, a preset stores a named reference to an inclusive range of frames in the source clip; it may also store the playback and processing parameters specified in document 02. We can add destructive trimming or copied derivative clips later if a concrete need appears.

## Proposed entry points

Open the currently selected clip:

```supercollider
Bmc.clipEditor;
```

Open a named clip:

```supercollider
Bmc.clipEditor(\ishidomaru1);
```

The existing clip-list window could later gain an **Edit selected** button that calls the same method. The editor should use a dedicated player name such as `\clipEditor`, so it does not unexpectedly reconfigure the default player or another playback used in a scene.

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
10. A name field and **Save preset** button.

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
```

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

Preset definitions should be saved as human-readable `.scd` data using `asCompileString`, following the approach already used by `BmcSession`. They should live with the data belonging to their source clip beneath `BuMoChi_Data/Clips`.

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

Scene and session definitions should eventually accept a clip together with a preset name. The preset supplies the source range, speed, loop behavior, bone selection, targets, and processing code. A scene may explicitly override these values for one performance without modifying the stored preset.

## Validation and safety

Saving should enforce:

- the source clip exists and is loaded;
- `startFrame` and `endFrame` are valid integers;
- `0 <= startFrame <= endFrame < clip.size`;
- the preset name is non-empty and safe for use as a filename; and
- an existing preset is not overwritten without explicit confirmation.

Loading should report a clear warning if the named source clip is missing or if its stored frame count and duration no longer match. The definition should remain available for inspection even when it cannot currently be played.

## Suggested first implementation

The minimum feature that makes boundary selection humanly practical is:

1. Add immediate frame/time seeking and frame stepping to `BmcClipPlayer`.
2. Add `BmcClipPreset` and an in-memory preset library with `.scd` persistence.
3. Add `Bmc.clipEditor(name)` with transport controls, playhead, range selection, numeric frame/time displays, and save-by-name.
4. Add `Bmc.playPreset`, `Bmc.listPresets`, and `Bmc.showPresets`.
5. Test a short regular clip, a long clip, and an irregularly timed clip.
6. Test boundary selection while stopped, playing, paused, looping, and at non-unit speed.

Waveforms or motion-feature graphs may eventually be drawn below the timeline, but they are not required for the first usable editor. The immediate priority is accurate visual navigation, frame-level boundary marking, repeated audition, and reliable non-destructive storage.
