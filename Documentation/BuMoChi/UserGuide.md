# BuMoChi User Guide

> Draft user guide for the current Bmc interface.

## 1. What BuMoChi is

BuMoChi is a SuperCollider library for performing with motion-capture data and
animated characters. It lets a live coder treat movement as material: receive
it from a camera, record it, replay it, change its timing, combine selected body
parts, and send the result to an animated character.

The library is intended for networked dance, theatre, music, animation, and
other performance situations in which movement should remain open to live
intervention. A performer can be captured in one place while collaborators
process the movement or render the avatar somewhere else.

The main user interface is the `Bmc` class. Common actions are deliberately
short enough for live coding:

```supercollider
Bmc.record(\entrance);
Bmc.stopRecording;
Bmc.play(\entrance);
Bmc.rate(0.5);
Bmc.loop(true);
```

You do not need to understand the internal classes before using these commands.
The supporting classes described later in this guide are available when you
need more detailed control.

### What can an end user do?

With the current Bmc interface you can:

- receive live skeletal motion from XR Animator;
- route motion by source and avatar name;
- display the motion on a VMC-compatible Godot character;
- record motion as named clips;
- list, select, rename, save, load, and remove clips;
- play, pause, seek, loop, and change the speed of clips;
- copy selected bones or body regions between recordings;
- build a live composite avatar from different motion sources;
- inspect whether frames are arriving or being rejected.

BuMoChi operates inside SuperCollider, but using the movement features does not
require booting SuperCollider's audio server. The audio server becomes relevant
when a performance also synthesizes sound or uses synth control buses to change
movement.

## 2. The software connected by BuMoChi

The complete networked pipeline is:

```text
XR Animator
    → BunrakuOSCEncoder.py
    → OSCGroups
    → SuperCollider + BuMoChi
    → BunrakuOSCDecoder.py
    → Godot
```

On a single computer, OSCGroups can initially be omitted:

```text
XR Animator → encoder → BuMoChi → decoder → Godot
```

The components have different jobs. XR Animator observes a person, the encoder
packages one complete skeleton frame, OSCGroups carries frames between
computers, BuMoChi records or transforms them, the decoder restores standard
VMC messages, and Godot displays the animated character.

### SuperCollider and BuMoChi

SuperCollider is the live-coding environment in which BuMoChi runs. Download
SuperCollider from its official site:

- <https://supercollider.github.io/downloads>

The BuMoChi repository contains the library itself. Place or link the BuMoChi
repository folder inside your SuperCollider user extensions directory. To see
that directory, evaluate:

```supercollider
Platform.userExtensionDir;
```

After installing or updating BuMoChi, recompile the SuperCollider class
library. In the SuperCollider IDE, use **Language → Recompile Class Library**.

The current source files for the public interface are under:

```text
Classes/Bmc/
```

### XR Animator

XR Animator uses a webcam to track a performer and animate a humanoid model. In
this pipeline it is the source of standard VMC motion messages.

- Project and documentation: <https://github.com/ButzYung/SystemAnimatorOnline>
- Native application releases: <https://github.com/ButzYung/SystemAnimatorOnline/releases>
- Online version: <https://sao.animetheme.com/XR_Animator.html>

Use the native Electron application for this pipeline because VMC output is a
native-application feature. Configure its VMC destination host and port to
match the encoder; the local hello-world example below uses
`127.0.0.1:39538`.

### Python encoder and decoder

The required Python command-line scripts are included in the BuMoChi
distribution:

```text
Testing_BuMoChi/BunrakuOSCEncoder.py
Testing_BuMoChi/BunrakuOSCDecoder.py
```

Their supporting Python modules are in the same directory. Keep those files
together. The scripts use Python 3 and do not require third-party Python
packages.

`BunrakuOSCEncoder.py` receives VMC from XR Animator. It collects the 21
required humanoid bones and sends one `/bunraku/vmc/frame` message per complete
pose.

`BunrakuOSCDecoder.py` performs the reverse conversion. It receives Bunraku
frames from SuperCollider and emits standard VMC messages for Godot.

An additional, more general VMC packet-preserving bridge is included under:

```text
HelperAppsAndExamples/VMC_Converter_Scripts/
```

The Bmc classes documented here currently use the fixed Bunraku Frame
protocol-v1 encoder and decoder in `Testing_BuMoChi`.

### OSCGroups

OSCGroups carries OSC messages between collaborators. All participants connect
to the same OSCGroups server and group. Each participant uses a local send port
and a local receive port; applications continue sending ordinary UDP OSC to
localhost.

BuMoChi includes OSCGroups documentation and some prebuilt clients under:

```text
HelperAppsAndExamples/OSCGroups/
```

Upstream source and build instructions are available from:

- <https://github.com/RossBencina/oscgroups>
- <https://github.com/RossBencina/oscpack>
- <http://www.rossbencina.com/code/oscgroups>

You do not need OSCGroups for the first local test. Introduce it after the
encoder-to-BuMoChi-to-decoder path works on one computer. Detailed staged tests
are in `Testing_BuMoChi/Communication_Tests/`.

### Godot

Godot renders the animated character. Download a current compatible Godot 4
editor from the official site:

- <https://godotengine.org/download/>

A VMC-compatible reference project is included at:

```text
Testing_BuMoChi/GodotVMCReference/project.godot
```

Import that file from the Godot Project Manager and run the project. The
reference test configuration listens for reconstructed VMC on UDP port
`39539`.

You may later replace the reference character or project. As long as the new
Godot project accepts standard VMC and has a correctly mapped humanoid
skeleton, the encoder, BuMoChi, and decoder do not need to change.

## 3. Hello world: capture, record, and replay movement

This first example runs everything on one computer and deliberately omits
OSCGroups. It demonstrates the smallest useful BuMoChi session.

### Port map

|From|To|UDP port|
|---|---|---:|
|XR Animator|Python encoder|`39538`|
|Python encoder|BuMoChi|`57130`|
|BuMoChi|Python decoder|`39537`|
|Python decoder|Godot|`39539`|

Only one program can listen on a given UDP port. Stop older test processes
before starting this example.

### Step 1: start Godot

Import and run:

```text
Testing_BuMoChi/GodotVMCReference/project.godot
```

### Step 2: start the decoder

Open a terminal in `Testing_BuMoChi` and run:

```bash
python3 BunrakuOSCDecoder.py \
  --listen-port 39537 \
  --target-port 39539 \
  --accept-avatar "BunrakuTestAvatar" \
  --verbose
```

### Step 3: prepare BuMoChi in SuperCollider

Evaluate this block:

```supercollider
(
Bmc.reset;

// This name must match the encoder's --avatar value.
Bmc.addAvatar(\BunrakuTestAvatar, "BunrakuTestAvatar");
Bmc.selectAvatar(\BunrakuTestAvatar);

// Send processed or replayed frames to the Python decoder.
Bmc.output(NetAddr("127.0.0.1", 39537));

// Receive Bunraku frames from the Python encoder.
Bmc.start(57130);
)
```

Check the state:

```supercollider
Bmc.status;
```

The posted event should include `running: true` and `port: 57130`.

### Step 4: start the encoder

In a second terminal, also opened in `Testing_BuMoChi`, run:

```bash
python3 BunrakuOSCEncoder.py \
  --listen-port 39538 \
  --target-port 57130 \
  --avatar "BunrakuTestAvatar" \
  --source "xr-animator" \
  --verbose
```

### Step 5: start XR Animator

In XR Animator, set the VMC destination to:

```text
Host: 127.0.0.1
Port: 39538
```

Enable VMC output and move in front of the camera. The Godot character should
follow the motion. Evaluate `Bmc.status` again; the `received` count should be
increasing.

### Step 6: record a clip

Start recording in SuperCollider:

```supercollider
Bmc.record(\hello, "BunrakuTestAvatar", "xr-animator");
```

Move for several seconds and then stop:

```supercollider
~helloClip = Bmc.stopRecording;
```

Inspect the result:

```supercollider
~helloClip.size;
~helloClip.duration;
Bmc.listClips;
```

### Step 7: replay the clip

Disable XR Animator output, or simply stand still, and evaluate:

```supercollider
Bmc.play(\hello);
```

Try changing playback:

```supercollider
Bmc.rate(0.5);     // half speed for the next playback
Bmc.loop(true);
Bmc.play(\hello);

Bmc.pause;
Bmc.resume;
Bmc.stopPlayback;
```

### Step 8: shut down

```supercollider
Bmc.stop;
```

Then disable XR Animator output, press **Control-C** in the encoder and decoder
terminals, and stop the Godot project. `Bmc.stop` stops the BuMoChi receiver and
playback; it does not stop the external applications.

## 4. Bmc method reference

`Bmc` is the recommended entry point for ordinary sessions. The methods below
delegate work to the appropriate supporting object.

### System control

#### `Bmc.start(port: 57130)`

Starts the Bunraku Frame OSC receiver. The port must match the output of the
encoder or the local OSCGroups receiving client.

#### `Bmc.stop`

Stops clip playback, cancels an unfinished recording, and closes the BuMoChi
OSC receiver. It does not stop XR Animator, Python, OSCGroups, or Godot.

#### `Bmc.status`

Posts and returns an event containing receiver, recording, playback, clip, and
wire statistics. Useful keys include `running`, `port`, `received`, `rejected`,
`dropped`, `recording`, `playing`, `currentClip`, and `clipCount`.

#### `Bmc.reset`

Stops the current session and replaces the working clip library, avatars,
recorder, player, dispatcher, and wires with fresh objects. Unsaved in-memory
clips are lost, so use it deliberately.

### Avatars and output

#### `Bmc.addAvatar(name, displayName)`

Creates an avatar destination. Its name should match the avatar name carried by
incoming frames when it is intended to receive that stream directly.

#### `Bmc.avatar(name)`

Returns a registered `BmcAvatar`. With no argument it returns the default
avatar.

#### `Bmc.selectAvatar(name)`

Makes an avatar the destination for subsequent playback and completed-frame
recording.

#### `Bmc.output(destination)`

Sets the selected avatar's output. A typical decoder destination is:

```supercollider
Bmc.output(NetAddr("127.0.0.1", 39537));
```

A function may also be used as an output for inspection or custom processing.

### Recording

#### `Bmc.record(name, avatar, source, capturePoint, metadata)`

Begins a recording. Every argument is optional.

```supercollider
Bmc.record;                         // record all incoming frames
Bmc.record(\take1);                 // record all frames as \take1
Bmc.record(\take1, "actor", "camA");
```

`capturePoint` is `\rawFrame` by default. Use `\completedFrame` to record the
selected avatar after reference-pose completion and live wiring.

#### `Bmc.stopRecording`

Stops recording, returns a `BmcMocapClip`, adds it to the clip library, and
makes it the current clip.

#### `Bmc.cancelRecording`

Stops recording and discards the frames collected in that take.

#### `Bmc.isRecording`

Returns `true` or `false`.

### Clip library

#### `Bmc.clips`

Returns the dictionary of all in-memory named clips.

#### `Bmc.clip(name)`

Returns a named clip. With `nil`, it returns the current clip.

#### `Bmc.selectClip(name)`

Makes a named clip current and returns it.

#### `Bmc.currentClip`

Returns the currently selected clip.

#### `Bmc.listClips`

Posts clip names, frame counts, and durations in the SuperCollider post window.
The current clip is marked with `*`.

#### `Bmc.showClips`

Opens a simple clip-list window. Selecting a row selects that clip.

#### `Bmc.renameClip(oldName, newName)`

Renames a clip in the in-memory library.

#### `Bmc.removeClip(name)`

Removes a clip from memory. This does not delete a separately saved file.

#### `Bmc.saveClip(name, path)` / `Bmc.save(name, path)`

Writes a clip archive. If the path is omitted, BuMoChi uses a `BmcClips`
directory inside `Platform.userAppSupportDir` and the `.bmc` extension.

#### `Bmc.loadClip(path, name)` / `Bmc.load(path, name)`

Loads a saved Bmc clip. If `name` is omitted, the filename becomes the clip
name.

### Playback

#### `Bmc.play(name)` / `Bmc.playClip(name)`

Plays a named clip. With no name, it plays the current clip.

#### `Bmc.pause` and `Bmc.resume`

Pause and resume the current player task.

#### `Bmc.stopPlayback`

Stops playback without shutting down the receiver or other Bmc services.

#### `Bmc.seek(seconds)`

Moves the player's next frame position to the closest frame at or before the
requested time.

#### `Bmc.rate(value)`

Sets playback speed. `1.0` is original timing, `0.5` is half speed, and `2.0`
is double speed. The value must be greater than zero.

#### `Bmc.loop(flag)`

Turns repeated playback on or off.

### Combining recordings

#### `Bmc.combineClips(target, source, bones, result, startIndex)`

Copies selected bones from one clip into another and stores the result as a new
`BmcAnimationClip`.

```supercollider
Bmc.combineClips(
    \baseTake,
    \armTake,
    \leftArm,
    \combined
);
```

Built-in body groups include `\leftArm`, `\rightArm`, `\arms`, `\leftLeg`,
`\rightLeg`, `\legs`, `\torso`, `\upperBody`, and `\all`. An array of exact
bone names can also be supplied.

#### `Bmc.combine(targetFrame, sourceFrame, bones)`

Lower-level operation that copies selected bones between two individual
Bunraku frames.

#### `Bmc.rseq(targetSequence, sourceSequence, bones, startIndex)`

Lower-level sequence operation that replaces selected bones over a range of
frames.

#### `Bmc.bone(frame, boneName)`

Returns the seven transform values for one named bone in a frame.

### Live composition

#### `Bmc.wire(source, bones, target, sourceAvatar, priority)`

Creates a persistent live routing rule. For example:

```supercollider
~armWire = Bmc.wire(
    "camera-a",
    \leftArm,
    \composite,
    "performer-a"
);
```

Matching left-arm transforms are copied into the `\composite` avatar. Other
bones retain the avatar's current or reference pose.

#### `Bmc.unwire(wire)`

Removes one wire object.

#### `Bmc.listWires`

Posts and returns the active wires.

#### `Bmc.clearWires`

Removes every live wire from every Bmc avatar.

## 5. Bmc class overview

Most users can work entirely through `Bmc`. These supporting classes explain
how responsibilities are divided and provide extension points for advanced
work.

### `Bmc`

The public live-coding facade. It owns the current working environment and
translates short user commands into operations on the dispatcher, recorder,
clip library, player, avatars, and wires. It also retains lower-level frame and
sequence combination methods.

### `BmcDispatcher`

Receives `/bunraku/vmc/frame` OSC messages, validates them, counts rejected or
discontinuous frames, and routes valid frames to registered destinations and
avatars.

### `BmcAvatar`

Represents one controllable output character. It holds the current pose and a
neutral reference pose, completes missing data, applies live wires, and sends
completed frames to a function or network destination.

### `BmcFrame`

A typed representation of one Bunraku animation frame. It contains protocol
version, avatar, source, frame number, encoder timestamp, and a `BmcPose`. It
converts between class objects and OSC message arrays.

### `BmcPose`

The spatial state of a skeleton: a collection mapping standardized bone names
to transforms. It can copy selected bones and fill missing bones from another
pose.

### `BmcBoneTransform`

The position and rotation of one bone, stored as seven values:
`x, y, z, qx, qy, qz, qw`.

### `BmcBoneSets`

Named body regions used by clip combination and live wiring. It supplies groups
such as `leftArm`, `rightArm`, `legs`, `torso`, and `upperBody`.

### `BmcClip`

The base class for a timed sequence of frames. It provides frame access,
relative times, duration, copying, and archive reading or writing.

### `BmcMocapClip`

A `BmcClip` produced by recording motion-capture input. It can retain capture
metadata such as filters, capture point, performer, and source.

### `BmcAnimationClip`

A `BmcClip` produced through editing, body-part combination, or future
algorithmic generation rather than direct capture.

### `BmcClipRecorder`

Collects validated frames, filters them by avatar and source, preserves relative
arrival timing, and returns a `BmcMocapClip` when stopped.

### `BmcClipPlayer`

Schedules clip frames according to their recorded timing. It handles play,
pause, resume, stop, seek, loop, and rate, and sends frames to an avatar,
function, or `NetAddr`.

### `BmcClipLibrary`

Maintains the named in-memory clip collection and current selection. It
implements clip listing, the clip-list GUI, rename/remove operations, and
archive save/load.

### `BmcWire`

A live rule connecting a selected source and body region to a target avatar.
It can filter by source and source-avatar name and carries a priority for cases
where several wires affect the same target.

### `BunrakuParser`

An older compatibility parser for symbol-labelled Bunraku messages and control
bus layouts. The fixed Bunraku Frame protocol-v1 path primarily uses
`BmcFrame`, `BmcPose`, and `Bmc.bone` instead.

## Further testing and troubleshooting

The repository includes four staged communication tests:

1. XR Animator → Godot
2. XR Animator → encoder → OSCGroups → decoder → Godot
3. SuperCollider playback → decoder → Godot
4. XR Animator → encoder → OSCGroups → SuperCollider → decoder → Godot

They are located in:

```text
Testing_BuMoChi/Communication_Tests/
```

Each test includes its port map, startup order, pass criteria, and common
failures. When the complete system fails, return to Test 1 and introduce one
component at a time.
