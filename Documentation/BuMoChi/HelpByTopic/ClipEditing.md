# Clip Editing

## Purpose

Long motion clips cannot be edited reliably by guessing frame numbers or repeatedly changing arguments in code. BuMoChi needs a simple visual browser in which the user can play a clip, see the current position on a timeline, seek to any point, mark useful beginning and end boundaries, audition that range repeatedly, and save it under a meaningful name.

The first implementation should be a non-destructive excerpt editor. It does not alter or copy the source clip. It stores a named reference to an inclusive range of frames in the source clip. We can add destructive trimming or copied derivative clips later if a concrete need appears.

## Proposed entry points

Open the currently selected clip:

```supercollider
Bmc.editClip;
```

Open a named clip:

```supercollider
Bmc.editClip(\ishidomaru1);
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
7. Visible in and out markers delimiting the selected excerpt.
8. Numeric displays for current frame/time, in frame/time, out frame/time, and selected duration.
9. **Set in** and **Set out** buttons that use the current playhead position.
10. A name field and **Save excerpt** button.

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

Excerpt name: [ishidomaru_bird_gesture____] [Save excerpt]
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
- Closing the window stops and removes the editor's player but does not discard already saved excerpts.

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

## Named excerpt data

Introduce a small non-destructive data object, tentatively named `BmcClipExcerpt`:

```supercollider
BmcClipExcerpt(
    name: \ishidomaru_bird_gesture,
    sourceClip: \ishidomaru1,
    startFrame: 615,
    endFrame: 948
)
```

The frame indices are authoritative and inclusive. For human inspection, the saved representation should also include the corresponding start time, end time, and duration:

```supercollider
(
    format: \bmcClipExcerpt,
    formatVersion: 1,
    name: \ishidomaru_bird_gesture,
    sourceClip: \ishidomaru1,
    startFrame: 615,
    endFrame: 948,
    startTime: 10.261,
    endTime: 15.807,
    duration: 5.546
)
```

Start and end times should be derived from the source clip when saving, rather than treated as a second independently editable definition. This avoids disagreement between frames and times in clips with irregular timestamps.

The excerpt should also retain enough source identity to detect mistakes after a source clip has been replaced. At minimum this should include the source clip name, frame count, and duration at the time the excerpt was saved. A later version could add a stable clip identifier or content hash.

## Storage

Excerpt definitions should be saved as human-readable `.scd` data using `asCompileString`, following the approach already used by `BmcSession`. A suitable default location is:

```supercollider
Platform.userAppSupportDir +/+ "BuMoChi" +/+ "ClipExcerpts"
```

One file per excerpt is easiest to inspect, version, rename, and recover:

```text
ClipExcerpts/
    ishidomaru_bird_gesture.scd
    ishidomaru_climbs.scd
    mother_waits.scd
```

The exact directory should be reconciled with the existing `BmcClipLibrary` and session directories during implementation. The important initial rule is that excerpt definitions remain separate from immutable source-clip files.

Suggested API:

```supercollider
Bmc.saveExcerpt(
    \ishidomaru_bird_gesture,
    \ishidomaru1,
    startFrame: 615,
    endFrame: 948
);

Bmc.excerpt(\ishidomaru_bird_gesture);
Bmc.listExcerpts;
Bmc.showExcerpts;
Bmc.removeExcerpt(\ishidomaru_bird_gesture);
```

Removing an excerpt removes only its small definition. It never deletes or changes the source clip.

## Playing and composing with excerpts

A saved excerpt should be usable wherever a clip range can be played:

```supercollider
Bmc.playExcerpt(\ishidomaru_bird_gesture);
Bmc.playExcerpt(\ishidomaru_bird_gesture, loop: true, rate: 0.5);
```

Internally this resolves the source clip and calls the existing range-aware playback:

```supercollider
Bmc.playClip(
    \ishidomaru1,
    startFrame: 615,
    endFrame: 948
);
```

Scene and session definitions should eventually accept either a whole clip name or an excerpt name. The excerpt supplies the source and range; scene-specific settings such as rate, loop, anatomical selection, avatar, composition rule, and start time remain properties of the scene motion. This keeps editorial decisions separate from performance and composition decisions.

An excerpt should not permanently store playback speed or loop state. Those may be used temporarily while auditioning, but the saved excerpt represents a useful movement span. Different scenes can reuse the same span at different speeds, in loops, or for different anatomical regions.

## Validation and safety

Saving should enforce:

- the source clip exists and is loaded;
- `startFrame` and `endFrame` are valid integers;
- `0 <= startFrame <= endFrame < clip.size`;
- the excerpt name is non-empty and safe for use as a filename; and
- an existing excerpt is not overwritten without explicit confirmation.

Loading should report a clear warning if the named source clip is missing or if its stored frame count and duration no longer match. The definition should remain available for inspection even when it cannot currently be played.

## Suggested first implementation

The minimum feature that makes boundary selection humanly practical is:

1. Add immediate frame/time seeking and frame stepping to `BmcClipPlayer`.
2. Add `BmcClipExcerpt` and an in-memory excerpt library with `.scd` persistence.
3. Add `Bmc.editClip(name)` with transport controls, playhead, range selection, numeric frame/time displays, and save-by-name.
4. Add `Bmc.playExcerpt`, `Bmc.listExcerpts`, and `Bmc.showExcerpts`.
5. Test a short regular clip, a long clip, and an irregularly timed clip.
6. Test boundary selection while stopped, playing, paused, looping, and at non-unit speed.

Waveforms or motion-feature graphs may eventually be drawn below the timeline, but they are not required for the first usable editor. The immediate priority is accurate visual navigation, frame-level boundary marking, repeated audition, and reliable non-destructive storage.
