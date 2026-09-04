# Bmc method reference

`Bmc` is the recommended entry point for ordinary BuMoChi work. The methods below delegate work to the appropriate supporting object.

> **Clip/preset terminology:** A clip is the complete recorded data. Range, speed, looping, selected bones, and target(s) describe how a clip is played. When saved together under a name, those playback choices form a preset; they never trim or otherwise modify the clip.

## System control

After the SuperCollider class library compiles, Bmc automatically listens for route-free Bunraku frames on input port `57130`. Its selected default avatar is `Ishidomaru`; completed frames for that identity are rewritten as `Ishidomaru`, assigned Godot VMC destination port `39539`, and forwarded to the local Bunraku decoder on port `39538`. Decoder forwarding is enabled. This ready state supports immediate live monitoring and `Bmc.record` without a separate initialization block when the encoder uses `--avatar "Ishidomaru"` and Godot listens on `39539`.

1.  `Bmc.start(port: 57130)`

    Starts or restarts the Bunraku Frame OSC receiver. The receiver starts automatically on `57130` after class-library compilation; call this method to restart it after `Bmc.stop` or to select another input port. The port must match both the local encoder output and `OscGroupClient.localRxPort`.

2.  `Bmc.stop`

    Stops clip playback, cancels an unfinished recording, and closes the BuMoChi OSC receiver. It does not stop XR Animator, Python, OSCGroups, or Godot.

3.  `Bmc.status`

    Posts and returns an event containing receiver, recording, playback, clip, and wire statistics. Useful keys include `running`, `port`, `received`, `rejected`, `dropped`, `recording`, `playing`, `currentClip`, and `clipCount`.

4.  `Bmc.help`

    Posts and returns a compact port-configuration summary for XR-Animator, `BunrakuOSCEncoder`, SuperCollider/Bmc, `BunrakuOSCDecoder`, and every avatar that currently has a Godot VMC output port.

    ``` supercollider
    Bmc.help;
    ```

    The paired encoder/SuperCollider input lines reflect the dispatcher's current port. The paired SuperCollider output/decoder input lines reflect `Bmc.decoderPort`. Avatar output pairs reflect the current `BmcAvatar.vmcPort` settings, so the text updates after runtime configuration changes.

5.  `Bmc.showDispatcherStatus(updateInterval: 0.25)`

    Opens the OSC/VMC input monitor window. A static field identifies the monitored OSC address and the dispatcher's configured UDP port. A dynamic field displays the latest `BmcDispatcher.status` dictionary and refreshes every `0.25` seconds by default. Supply another interval in seconds to change the refresh rate. Closing the window stops its update routine.

    ``` supercollider
    Bmc.showDispatcherStatus;      // refresh four times per second
    Bmc.showDispatcherStatus(1.0); // refresh once per second
    ```

6.  `Bmc.reset`

    Stops the current working environment, replaces the working clip library, avatars, recorder, player, dispatcher, and wires with fresh objects, restores the Ishidomaru/`39539` default route, and restarts the receiver on `57130`. Unsaved in-memory clips are lost, so use it deliberately.

7.  `Bmc.compositorRate_(fps)`, `Bmc.startCompositor`, and `Bmc.stopCompositor`

    Control the constant-rate avatar compositor. Its default rate is 60 fps. Source and clip-player updates write only to their caches; the compositor samples active avatars and emits at most one completed frame per avatar per tick. `Bmc.start` starts the compositor and `Bmc.stop` stops it. `Bmc.compositorRate` returns the current rate.

    SuperCollider's Command-period shortcut (`Cmd-.` on macOS or `Ctrl-.` on other platforms) stops ordinary Tasks and Routines. Bmc stops its clip players and removes their caches, then automatically recreates its compositor Routine without resetting camera routes, live camera caches, or avatar mappings. Thus the command period can silence synths and performance routines while default live camera control continues. An explicit `Bmc.stopCompositor` or `Bmc.stop` still disables this recovery.

    ``` supercollider
    Bmc.compositorRate_(60);
    Bmc.startCompositor;
    Bmc.stopCompositor;
    ```

## Avatars and output

1.  `Bmc.addAvatar(name, displayName)`

    Creates an avatar destination. Its name should match the avatar name carried by incoming frames when it is intended to receive that stream directly.

2.  `Bmc.avatar(name)`

    Returns a registered `BmcAvatar`. With no argument it returns the default avatar, `Ishidomaru`.

3.  `Bmc.selectAvatar(name)`

    Makes an avatar the destination for subsequent playback and completed-frame recording.

4.  `Bmc.output(destination)`

    Replaces the selected avatar's default local-decoder output function with a custom destination. This is an advanced escape hatch.

    ``` supercollider
    Bmc.output(NetAddr("127.0.0.1", 39538));
    ```

    A function may also be used as an output for inspection or custom processing.

5.  `Bmc.decoderPort_(port)`

    Sets the local decoder destination for all avatars using the default output. Default: `39538`.

6.  `Bmc.forwardDecoder_(flag)`

    Enables or disables forwarding to the local decoder. Default: `true`.

    These are Bmc's only class-wide network-output controls. Source distribution to OSCGroups belongs to [BunrakuOSCEncoder](HelpByTopic/HelperApplications/BunrakuOSCEncoder.md), not Bmc.

7.  `Bmc.sendCalibrationFrame(port)`

    Sends one approximate upright T-pose for the selected avatar to a local decoder input. If `port` is omitted, Bmc uses its currently configured decoder port, which defaults to `39538`. The routed frame separately embeds the selected avatar's Godot VMC destination, which defaults to `39539` for Ishidomaru.

    ``` supercollider
    Bmc.sendCalibrationFrame;       // decoder input 39538 by default
    Bmc.sendCalibrationFrame(39548); // explicitly use another decoder input
    ```

    This is a pipeline-connectivity test, not a calibrated reference pose for a particular VRM model.

8.  `Bmc.cameraSource_(sourceName)` and `Bmc.cameraSource`

    Select or return the exact incoming motion-source identity used by the camera convenience route. Set it explicitly in collaborative sessions; otherwise `Bmc.cameraTarget_` can infer the latest source received under the default Ishidomaru identity.

9.  `Bmc.cameraTarget_(avatarName)` and `Bmc.cameraTarget`

    Retarget the current camera source to a registered avatar without restarting the encoder or decoder. Retargeting removes the source cache from its previous avatar. Subsequent frames enter only the selected avatar's compositor and are emitted with that avatar's `vmcPort`.

    Immediately after recompilation, `Bmc.cameraTarget_(\Ishidomaru)` is valid before source discovery: Ishidomaru is the direct default target, so Bmc waits for its first incoming frame. Retargeting to another avatar still requires either a previously received Ishidomaru frame or an explicit `Bmc.cameraSource_(sourceName)`, preventing accidental selection of another collaborator's stream.

10. `Bmc.routeMotionSource(sourceName, avatarName)`

    Install or replace an exact source-specific route. This is the general operation underlying `cameraTarget_`.

11. `Bmc.removeMotionSourceRoute(sourceName)`

    Remove an explicit route and its current compositor cache. Later frames return to ordinary encoder-avatar-name dispatch.

12. `Bmc.motionSourceRoutes`

    Return a copy of the current source-to-avatar routing dictionary. See [Controlling avatars from a camera](HelpByTopic/ControllingAvatarsFromCamera.md) for the complete flow and examples.

## Recording

1.  `Bmc.record(name, avatar, source, capturePoint, metadata)`

    Begins a recording. Every argument is optional. SCD is the default recording format: when `Bmc.stopRecording` is called, the completed clip is retained in memory and automatically saved as `name.scd` in `BmcClipLibrary.defaultDirectory`.

    ``` supercollider
    Bmc.record;                         // record all incoming frames
    Bmc.record(\take1);                 // record all frames as \take1
    Bmc.record(\take1, "actor", "camA");
    ```

    `capturePoint` is `\rawFrame` by default. Use `\completedFrame` to record the selected avatar after reference-pose completion and live wiring.

2.  `Bmc.recordScd(name, avatar, source, capturePoint, metadata)`

    Explicit alias for the default `Bmc.record` behavior.

3.  `Bmc.recordBmc(name, avatar, source, capturePoint, metadata)`

    Begins a recording that will be saved in the legacy `.bmc` archive format when stopped. Use this only when that format is specifically required.

4.  `Bmc.stopRecording`

    Stops recording, returns a `BmcMocapClip`, adds it to the in-memory clip library, makes it the current clip, and saves it to disk in the format selected when recording began. Ordinary `Bmc.record` and `Bmc.recordScd` calls save `.scd`; `Bmc.recordBmc` saves `.bmc`. After saving, Bmc notifies its dependants with `Bmc.changed(\clipRecordingStopped, name, clip)`.

5.  `Bmc.cancelRecording`

    Stops recording and discards the frames collected in that take.

6.  `Bmc.isRecording`

    Returns `true` or `false`.

## Clip library

1.  `Bmc.clips`

    Returns the unified dictionary of all known named clips. Every value is a `BmcClip`. A clip discovered on disk but not yet loaded has a path and `frames == nil`; a loaded, recorded, or generated clip has non-nil frames.

2.  `Bmc.clip(name)`

    Returns a named clip. With `nil`, it returns the current clip. If the named clip was discovered on disk but has not been read, this method loads it on first access and retains the loaded object in `Bmc.clips`.

3.  `Bmc.selectClip(name)`

    Makes a named clip current and returns it.

4.  `Bmc.currentClip`

    Returns the currently selected clip.

5.  `Bmc.listClips`

    Posts every catalogued clip. Loaded clips show frame counts and durations; disk clips whose frames have not yet been read are marked `unloaded`. The current clip is marked with `*`.

6.  `Bmc.savedClips`

    Returns the unique names registered from `.scd` and `.bmc` files as a sorted array of symbols. The default directory is scanned automatically when `Bmc` initializes. This method does not load frame data. If both `take1.scd` and `take1.bmc` exist, `\take1` appears only once and `.scd` is preferred.

7.  `Bmc.listSavedClips`

    Posts the names of clips available on disk and returns the same array as `Bmc.savedClips`. If the directory does not exist or contains no supported clip files, it posts `Bmc: no clips saved on disk` and returns an empty array.

    ``` supercollider
    Bmc.listSavedClips;
    ```

8.  `Bmc.clipDirectory` / `Bmc.clipDirectory_(path)`

    Gets or sets the directory scanned for clips and used for default clip saves. Setting it standardizes the path and immediately refreshes the disk catalog; it does not load frame data. Loaded or generated clips already in the catalog are preserved.

    ``` supercollider
    Bmc.clipDirectory.postln;
    Bmc.clipDirectory_("~/MyBmcClips");
    ```

9.  `Bmc.postClipDirectory`

    Posts and returns the current default clip directory.

10. `Bmc.refreshSavedClips`

    Rescans `Bmc.clipDirectory`, registers new `.scd` and `.bmc` files as unloaded `BmcClip` objects, removes obsolete unloaded entries, preserves loaded or generated clips, and returns all catalog names. Use this after files are added or removed outside BuMoChi.

11. `Bmc.showClips`

    Opens the clip window and shows the unified clip catalog. Loaded clips show frame counts and durations; unloaded clips show `saved on disk`. The buttons above the list provide disk and playback operations:

    - `List saved` scans `BmcClipLibrary.defaultDirectory` for `.scd` and `.bmc` files and displays their names without loading their contents into memory.
    - `Play selected` loads the selected saved clip if necessary, then begins playback. A clip already in memory is played directly.

    Selecting a loaded row makes it the current clip. Saved clips remain unloaded until accessed or played.

12. `Bmc.renameClip(oldName, newName)`

    Renames a clip in the in-memory library.

13. `Bmc.removeClip(name)`

    Removes a clip from memory. This does not delete a separately saved file.

14. `Bmc.saveClip(name, path)` / `Bmc.save(name, path)`

    Writes a clip archive. If the path is omitted, BuMoChi uses a `BmcClips` directory inside `Platform.userAppSupportDir` and the `.bmc` extension.

15. `Bmc.loadClip(path, name)` / `Bmc.load(path, name)`

    Loads a saved `.bmc` or `.scd` clip; the extension selects the reader. If `name` is omitted, the filename becomes the clip name.

16. `Bmc.saveClipScd(name, path)`

    Explicitly saves or resaves an in-memory clip in the complete, human-readable timestamp/message format. When `path` is omitted, the file is saved as `name.scd` in the default `BmcClips` directory. Ordinary `Bmc.record` already performs this save automatically when `Bmc.stopRecording` is called; use `Bmc.saveClipScd` when an explicit path is required or an existing in-memory clip must be written again.

    ``` supercollider
    Bmc.record(\take1);
    // perform the motion
    Bmc.stopRecording;
    // take1.scd now exists in BmcClipLibrary.defaultDirectory
    ```

17. `Bmc.loadClipScd(path, name)`

    Loads a readable `.scd` clip explicitly. The first stored timestamp is normalized to zero while all frame intervals are preserved. Load only trusted `.scd` files because their message lines are interpreted as SuperCollider code.

    ``` supercollider
    Bmc.loadClipScd(
        BmcClipLibrary.defaultDirectory +/+ "take1.scd",
        \take1
    );
    ```

18. `Bmc.clipToScd(name)` / `Bmc.convertClipToScd(name)`

    Exports a recorded clip as a human-readable SuperCollider `.scd` file. The file is placed beside the clip's `.bmc` archive and uses the same base name; for example, `take1.bmc` becomes `take1.scd`. The returned value is the full path of the exported file.

    ``` supercollider
    ~scdPath = Bmc.clipToScd(\take1);
    ~scdPath.postln;
    ```

    If the named clip is not currently loaded, this method automatically looks for its `.bmc` file in `BmcClipLibrary.defaultDirectory` and loads it. Clips loaded or saved at a custom path are exported beside that remembered path.

    Each frame is written as an OscRecorder-style commented clip-relative timestamp followed by the message's sclang representation:

    ``` supercollider
    //:--[0.125]
    [ '/bunraku/vmc/frame', 1, 'Avatar', 'source', 2 ]
    ```

    The entire clip is stored in one `.scd` file; it is not divided into groups of 1,000 messages. Exporting again replaces an existing `.scd` file of the same name. The exported file can be restored with `Bmc.loadClip` or `Bmc.loadClipScd`.

## Playback

1.  `Bmc.play(name, loop, rate, startFrame, endFrame, playerName, avatarName, compositionRule, startTime)` / `Bmc.playClip(...)`

    Plays a named clip. With no name, it plays the current clip. Defaults are `loop: false`, `rate: 1.0`, `startFrame: 0`, the clip's last frame as `endFrame`, `\default` as `playerName`, the selected avatar as `avatarName`, `\overwrite` as `compositionRule`, and immediate playback as `startTime`. A rule may instead be a canonical body-part symbol or array of bone names. Start and end indices are inclusive. A new player name creates an independent player; reusing a name reconfigures only that player. Give several players the same future absolute `SystemClock` time to synchronize their playback.

    ``` supercollider
    Bmc.play(\take1);                  // whole clip once at recorded speed
    Bmc.play(\take1, true, 0.5);       // whole clip looping at half speed
    Bmc.play(\take1, false, 1.0, 20, 80); // frames 20 through 80 once
    Bmc.play(\take1, true, 0.5, 0, 80, \slowIntro);
    Bmc.play(\take1, false, 2.0, 81, 160, \fastEnding);
    Bmc.play(\take1, true, 1.0, 0, nil, \arms, \Ishidomaru, \arms);
    ~t = SystemClock.seconds + 0.2;
    Bmc.play(\take1, loop: true, playerName: \a, startTime: ~t);
    Bmc.play(\take1, loop: true, playerName: \b, startTime: ~t);
    ```

2.  `Bmc.player(name)`, `Bmc.players`, and `Bmc.playerNames`

    Return one named player, the player dictionary, or its names. `Bmc.player` with no argument returns `\default`, preserving the original API. The returned player can be controlled directly. `Bmc.removePlayer(name)` stops and removes a named player; the default player cannot be removed.

3.  `Bmc.freeze(playerName)` / `Bmc.pause(playerName)` and `Bmc.resume(playerName)`

    Freeze and resume playback at the current frame. Freezing retains the player's last cached frame and its composition authority, so it continues to hold or modify the avatar pose. `Bmc.pause` remains as a compatibility alias for `Bmc.freeze`.

4.  `Bmc.stopPlayback(playerName)`

    Stops playback and removes that player's frame cache from its target avatar's compositor stack. Underlying sources, such as XR Animator, become visible again at the next compositor tick. The `BmcClipPlayer` remains registered and retains its clip and settings, so it can be restarted later. Other players, the receiver, and other Bmc services continue running. Both an explicit stop and the natural end of non-looping playback notify Bmc dependants with `Bmc.changed(\clipPlaybackStopped, clipName, playerName, clip)`. For example, the two names might be `\ishidomaru, \default`.

5.  `Bmc.mutePlayback(playerName)` / `Bmc.unmutePlayback(playerName)`

    Muting removes the player's cache from its target avatar and suppresses further cache writes, but does not stop or pause its playback clock. The clip continues advancing invisibly while underlying sources such as XR Animator control the avatar. Unmuting permits the next emitted clip frame to recreate the player's cache at the top of the compositor stack. Muting persists across stop and restart until explicitly unmuted.

    ``` supercollider
    Bmc.play(\zoom_test, loop: true);
    Bmc.mutePlayback;    // XR Animator becomes visible; zoom_test keeps advancing
    Bmc.unmutePlayback;  // zoom_test returns at its current playback position
    ```

    The same operations are available on a player instance as `mute` and `unmute`; its state is reported by `isMuted`.

6.  `Bmc.restartPlayback(playerName)`

    Stops any current playback, removes its old cache, and starts the configured frame range again from `startFrame`. Its first new frame recreates the cache at the top of the target avatar's compositor stack.

7.  `Bmc.resetPlayback(playerName)`

    Stops playback, removes its compositor cache, and rewinds the player to `startFrame` without changing its clip, output, range, rate, or loop setting. This is intentionally separate from `Bmc.reset`, which rebuilds the entire Bmc environment.

8.  `Bmc.seek(seconds, playerName)`

    Moves the player's next frame position to the closest frame at or before the requested time.

9.  `Bmc.rate(value, playerName)`

    Sets playback speed. `1.0` is original timing, `0.5` is half speed, and `2.0` is double speed. The value must be greater than zero.

10. `Bmc.loop(flag, playerName)`

    Turns repeated playback on or off.

11. `Bmc.sonifyTake(clipName, sonifications, playerName, record, screenCapture, loop, rate, startFrame, endFrame)`

    Runs the synchronized take workflow for an existing clip. It optionally records server audio and screen video, archives the source clip in the take directory, plays degrees 0 through 4 twice as a countdown, begins clip playback with a final degree 7 cue, starts the supplied sonification after that cue, and cleans up at the clip's end. An existing source file is copied unchanged; an unsaved in-memory clip is serialized as a new `.scd` snapshot. `record` and `screenCapture` default to `false`. Recorded files and `.scd` metadata are grouped in one `clipName_YYMMDDHHMMSS` directory below the persistent `Bmc.videoRecordingFolder`. The loop, rate, and inclusive frame-range arguments configure playback and are stored in the take metadata. Use `Bmc.stopTake`, `Bmc.cancelTake`, and `Bmc.takeStatus` for control and inspection. See [Recording with sound](HelpByTopic/RecordingWithSound.md) and [Recording audio and video](HelpByTopic/RecordingAudioAndVideo.md).

12. `Bmc.videoRecordingFolder` / `Bmc.videoRecordingFolder_(path)` / `Bmc.chooseVideoRecordingFolder`

    Gets or changes the root directory for complete take folders. The setter accepts an internal or external-disk path; the chooser opens a folder dialog. The preference is stored as SuperCollider data in `Platform.userAppSupportDir/video_recording_folder.scd` and survives library recompilation and application restart. If an external disk is unavailable, recording fails clearly rather than falling back to the internal disk.

## Combining recordings

1.  `Bmc.combineClips(target, source, bones, result, startIndex)`

    Copies selected bones from one clip into another and stores the result as a new `BmcAnimationClip`.

    ``` supercollider
    Bmc.combineClips(
        \baseTake,
        \armTake,
        \leftArm,
        \combined
    );
    ```

    Built-in body groups include `\leftArm`, `\rightArm`, `\arms`, `\leftLeg`, `\rightLeg`, `\legs`, `\torso`, `\upperBody`, and `\all`. An array of exact bone names can also be supplied.

2.  `Bmc.combine(targetFrame, sourceFrame, bones)`

    Lower-level operation that copies selected bones between two individual Bunraku frames.

3.  `Bmc.rseq(targetSequence, sourceSequence, bones, startIndex)`

    Lower-level sequence operation that replaces selected bones over a range of frames.

4.  `Bmc.bone(frame, boneName)`

    Returns the seven transform values for one named bone in a frame.

## Live composition

Every avatar maintains a newest-first stack of cached frame sources. Sources are applied oldest-to-newest, so the last source added has final authority. Cache updates do not reorder the stack. With no composition rule, a source defaults to full-frame `\overwrite`.

1.  `Bmc.addFrameSource(name, source, target, sourceAvatar, mode, bones)`

    Adds a named cached source. Omitting both `mode` and `bones` selects `\overwrite`. Providing `bones` with no mode selects `\compose`.

    ``` supercollider
    ~remote = Bmc.addFrameSource(\remote, "remote-xr", \composite, "actor");
    ~hands = Bmc.addFrameSource(
        \hands, "hand-tracker", \composite, "actor", bones: \arms
    );
    ```

    `Bmc.frameSources` returns explicitly registered sources and `Bmc.removeFrameSource(source)` removes one. `Bmc.avatar(name).sources` exposes that avatar's complete newest-first stack, including automatically created live and clip-player caches.

2.  `Bmc.wire(source, bones, target, sourceAvatar, priority)`

    Creates a persistent live routing rule. For example:

    ``` supercollider
    ~armWire = Bmc.wire(
        "camera-a",
        \leftArm,
        \composite,
        "performer-a"
    );
    ```

    Compatibility API for a cached partial-body `\compose` source. Matching left-arm transforms are copied into the `\composite` avatar. Stack insertion order now determines precedence; the legacy `priority` value remains readable but does not reorder the stack.

3.  `Bmc.unwire(wire)`

    Removes one wire object.

4.  `Bmc.listWires`

    Posts and returns the active wires.

5.  `Bmc.clearWires`

    Removes every live wire from every Bmc avatar.

## Positional modifiers

Positional modifiers are the first implemented transformative-composition rule. They run after an avatar's structural source stack has produced a completed frame and modify the `\Hips` translation on every compositor tick. They preserve all four `Hips` quaternion values, so source turns and pirouettes remain visible, and they never rewrite the contributing camera stream or clip.

1. `Bmc.addPositionModifier(name, target, position, mode)`

   Adds a named modifier to `target`. `position` is either `[x, y, z]` or a Function evaluated as `|time, frame, modifier|`. A `nil` coordinate preserves that axis. `mode` is `\replace` (absolute coordinates, the default) or `\add` (offsets relative to the composed frame).

   ```supercollider
   Bmc.addPositionModifier(\stageRight, \Mother, [1.5, nil, 0.0]);

   ~start = SystemClock.seconds;
   Bmc.addPositionModifier(\orbit, \Ishidomaru, { |time|
       var angle = (time - ~start) * 2pi / 8;
       [angle.cos, nil, angle.sin]
   });

   Bmc.addPositionModifier(\lift, \Mother, [0.0, 0.25, 0.0], \add);
   ```

   Modifiers use newest-first storage and oldest-to-newest evaluation, so a later modifier has final authority over coordinates it replaces. The Function receives compositor time rather than maintaining its own Routine, making procedural motion independent of incoming camera or clip frame rates.

2. `Bmc.modifier(name)` and `Bmc.modifierNames`

   Return a named modifier or the sorted list of registered modifier names. A modifier exposes `position`, `mode`, and `enabled`; use `position_`, `mode_`, or `enabled_` to change it live.

3. `Bmc.removeModifier(name)` and `Bmc.clearModifiers`

   Remove one named modifier or every positional modifier. Removing a modifier reveals the unmodified structural composition on the next compositor tick.
