# BuMoChi User Guide

This is a user guide draft for the current Bmc interface. It outlines the purpose of the BuMoChi library, the applications it works with, and gives examples of commands for doing basic tasks with this library like recording, playback and composition of animation clips.

***For installation and getting started see files [[Documentation/BuMoChi/Installation|Installation]] and [[Getting Started]].***
## 1. What BuMoChi is

BuMoChi is a SuperCollider library for performing with motion-capture data and animated characters. It lets a live coder treat movement as material: receive it from a camera, record it, replay it, change its timing, combine selected body parts, and send the result to an animated character. BuMoChi also supports live collaboration among separate performance workstations, each with its own motion-capture tracking, computer, sound-generation, and animation systems. By sharing motion-capture data as OSC through OSCGroups, it makes it possible to rehearse and perform together from different locations over the network.

The library is intended for networked dance, theatre, music, animation, and other performance situations in which movement should remain open to live intervention. A performer can be captured in one place while collaborators process the movement or render the avatar somewhere else.

The main user interface is the `Bmc` class. Common actions are deliberately short enough for live coding:

``` supercollider
Bmc.record(\entrance);
Bmc.stopRecording;
Bmc.play(\entrance);
Bmc.rate(0.5);
Bmc.loop(true);
```

You do not need to understand the internal classes before using these commands. The supporting classes described later in this guide are available when you need more detailed control.

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

BuMoChi operates inside SuperCollider, but using the movement features does not require booting SuperCollider's audio server. The audio server becomes relevant when a performance also synthesizes sound or uses synth control buses to change movement.

## 2. The software connected by BuMoChi

The complete networked pipeline is:

``` text
XR Animator
    → BunrakuOSCEncoder.py
    → local SuperCollider + BuMoChi and OSCGroups
OSCGroups
    → every collaborator's SuperCollider + BuMoChi
each local BuMoChi
    → local BunrakuOSCDecoder.py
    → local Godot
```

On a single computer, OSCGroups can initially be omitted:

``` text
XR Animator → encoder → BuMoChi → decoder → Godot
```

The components have different jobs. XR Animator observes a person, and the encoder packages one complete route-free skeleton frame. It sends identical copies to local BuMoChi and to OSCGroups. OSCGroups distributes these source frames to the other workstations, where they also enter BuMoChi. Each local BuMoChi records, combines, transforms, and assigns all available sources to figures and avatars, then sends its completed scene only to its own decoder and Godot renderer.

### Distributed sources, local synthesis

BuMoChi uses a distributed-sources, local-synthesis model. What travels between collaborators is motion source material, not a finished rendered animation. Every workstation receives its own motion source directly and remote motion sources through OSCGroups. Its local SuperCollider/BuMoChi process then creates the complete animation from those inputs, using the same Scene definition as the other workstations. Finally, it routes the completed avatars through its local decoder to its local Godot scene resource.

This separation is fundamental. OSCGroups is the shared source-data layer; BuMoChi is the local animation synthesis layer; Godot is the local renderer. Bmc's processed routed frames never return to OSCGroups. When collaborators load the same Scene, they synthesize and render the same defined performance independently, in the same way that sc-hacks-redux shared control sources while each workstation synthesized sound locally.

### SuperCollider and BuMoChi

SuperCollider is the live-coding environment in which BuMoChi runs. Download SuperCollider from its official site:

- <https://supercollider.github.io/downloads>

The BuMoChi repository contains the library itself. Place or link the BuMoChi repository folder inside your SuperCollider user extensions directory. To see that directory, evaluate:

``` supercollider
Platform.userExtensionDir;
```

After installing or updating BuMoChi, recompile the SuperCollider class library. In the SuperCollider IDE, use **Language → Recompile Class Library**.

The current source files for the public interface are under:

``` text
Classes/Bmc/
```

### XR Animator

XR Animator uses a webcam to track a performer and animate a humanoid model. In this pipeline it is the source of standard VMC motion messages.

- Project and documentation: <https://github.com/ButzYung/SystemAnimatorOnline>
- Native application releases: <https://github.com/ButzYung/SystemAnimatorOnline/releases>
- Online version: <https://sao.animetheme.com/XR_Animator.html>

Use the native Electron application for this pipeline because VMC output is a native-application feature. Configure its VMC destination host and port to match the encoder; the local hello-world example below uses `127.0.0.1:39537`.

### Python encoder and decoder

***The two Python command-line scripts described here can be started together with the one-command shell launcher described in [Setup](HelpByTopic/Setup.md#quick-start-one-command-pipeline-launcher).***

The required Python command-line scripts are included in the BuMoChi distribution:

``` text
PipelineApplications/BunrakuOSCEncoder.py
PipelineApplications/BunrakuOSCDecoder.py
```

Their supporting Python modules are in the same directory. Keep those files together. The scripts use Python 3 and do not require third-party Python packages.

[BunrakuOSCEncoder](HelpByTopic/HelperApplications/BunrakuOSCEncoder.md) receives VMC from XR Animator. It collects the 21 required humanoid bones and sends each route-free `/bunraku/vmc/frame` both to local Bmc on `57130` and to local `OscGroupClient` on `22244`. Remote clients deliver their route-free frames to Bmc on `57130`. Bmc synthesizes the complete local scene, adds final avatar routes, and sends routed output only to the local decoder on `39538`.

[BunrakuOSCDecoder](HelpByTopic/HelperApplications/BunrakuOSCDecoder.md) performs the reverse conversion. It receives Bunraku frames from SuperCollider and emits standard VMC messages for Godot.

An additional, more general VMC packet-preserving bridge is included under:

``` text
HelperAppsAndExamples/VMC_Converter_Scripts/
```

The Bmc classes documented here currently use the fixed Bunraku Frame protocol-v1 encoder and decoder in `PipelineApplications`.

### OSCGroups

OSCGroups carries OSC messages between collaborators. All participants connect to the same OSCGroups server and group. Each participant uses a local send port and a local receive port; applications continue sending ordinary UDP OSC to localhost.

BuMoChi includes OSCGroups documentation and some prebuilt clients under:

``` text
HelperAppsAndExamples/OSCGroups/
```

Upstream source and build instructions are available from:

- <https://github.com/RossBencina/oscgroups>
- <https://github.com/RossBencina/oscpack>
- <http://www.rossbencina.com/code/oscgroups>

You do not need OSCGroups for the first local test. Introduce it after the encoder-to-BuMoChi-to-decoder path works on one computer. Detailed staged tests are in `PipelineApplications/Communication_Tests/`.

***The `OscGroupClient` application can optionally be started by the same one-command shell launcher described in [Setup](HelpByTopic/Setup.md#quick-start-one-command-pipeline-launcher).***

### Godot

Godot renders the animated character. Download a current compatible Godot 4 editor from the official site:

- <https://godotengine.org/download/>

A VMC-compatible reference project is included at:

``` text
PipelineApplications/GodotVMCReference/project.godot
```

Import that file from the Godot Project Manager and run the project. The reference test configuration listens for reconstructed VMC on UDP port `39539`.

You may later replace the reference character or project. As long as the new Godot project accepts standard VMC and has a correctly mapped humanoid skeleton, the encoder, BuMoChi, and decoder do not need to change.

## 3. Hello world: capture, record, and replay movement

This first example runs everything on one computer and deliberately omits OSCGroups. It demonstrates the smallest useful BuMoChi Scene.

### Port map

| From           | To             | UDP port |
|----------------|----------------|----------|
| XR Animator    | Python encoder | `39537`  |
| Python encoder | BuMoChi        | `57130`  |
| BuMoChi        | Python decoder | `39538`  |
| Python decoder | Godot          | `39539`  |

Only one program can listen on a given UDP port. Stop older test processes before starting this example.

### Step 1: start Godot

Import and run:

``` text
PipelineApplications/GodotVMCReference/project.godot
```

### Step 2: start the decoder

Open a terminal in `PipelineApplications` and run:

``` bash
python3 BunrakuOSCDecoder.py \
  --listen-port 39538 \
  --accept-avatar "BunrakuTestAvatar" \
  --verbose
```

### Step 3: prepare BuMoChi in SuperCollider

Evaluate this block:

``` supercollider
(
Bmc.reset;

// This name must match the encoder's --avatar value.
Bmc.addAvatar(\BunrakuTestAvatar, "BunrakuTestAvatar");
Bmc.selectAvatar(\BunrakuTestAvatar);

// Route this avatar through the local decoder to Godot.
Bmc.avatar(\BunrakuTestAvatar).vmcPort_(39539);

// Receive Bunraku frames from the Python encoder.
Bmc.start(57130);
)
```

Check the state:

``` supercollider
Bmc.status;
```

The posted event should include `running: true` and `port: 57130`.

### Step 4: start the encoder

See [Setup](HelpByTopic/Setup.md#quick-start-one-command-pipeline-launcher) for the easiest way to start the encoder.

Manual procedure:

In a second terminal, also opened in `PipelineApplications`, run:

``` bash
python3 BunrakuOSCEncoder.py \
  --no-oscgroups \
  --avatar "BunrakuTestAvatar" \
  --source "xr-animator" \
  --verbose
```

### Step 5: start XR Animator

In XR Animator, set the VMC destination to:

``` text
Host: 127.0.0.1
Port: 39537
```

Enable VMC output and move in front of the camera. The Godot character should follow the motion. Evaluate `Bmc.status` again; the `received` count should be increasing.

### Step 6: record a clip

Start recording in SuperCollider:

``` supercollider
Bmc.record(\hello, "BunrakuTestAvatar", "xr-animator");
```

Move for several seconds and then stop:

``` supercollider
~helloClip = Bmc.stopRecording;
```

Inspect the result:

``` supercollider
~helloClip.size;
~helloClip.duration;
Bmc.listClips;
```

### Step 7: replay the clip

Disable XR Animator output, or simply stand still, and evaluate:

``` supercollider
Bmc.play(\hello);
```

Try changing playback:

``` supercollider
Bmc.rate(0.5);     // half speed for the next playback
Bmc.loop(true);
Bmc.play(\hello);

Bmc.pause;
Bmc.resume;
Bmc.stopPlayback;
```

### Step 8: shut down

``` supercollider
Bmc.stop;
```

Then disable XR Animator output, press **Control-C** in the encoder and decoder terminals, and stop the Godot project. `Bmc.stop` stops the BuMoChi receiver and playback; it does not stop the external applications.

## 4. Bmc method reference

[Bmc method reference](Bmc%20method%20reference.md)

## 5. Bmc class overview

Most users can work entirely through `Bmc`. These supporting classes explain how responsibilities are divided and provide extension points for advanced work

### `Bmc`

The public live-coding facade. It owns the current working environment and translates short user commands into operations on the dispatcher, recorder, clip library, player, avatars, and wires. It also retains lower-level frame and sequence combination methods.

### `BmcDispatcher`

Receives `/bunraku/vmc/frame` OSC messages, validates them, counts rejected or discontinuous frames, and routes valid frames to registered destinations and avatars.

### `BmcAvatar`

Represents one controllable output character. It holds the current pose and a neutral reference pose, completes missing data, applies live wires, and sends completed frames to a function or network destination.

### `BmcFrame`

A typed representation of one Bunraku animation frame. It contains protocol version, avatar, source, frame number, encoder timestamp, and a `BmcPose`. It converts between class objects and OSC message arrays.

### `BmcPose`

The spatial state of a skeleton: a collection mapping standardized bone names to transforms. It can copy selected bones and fill missing bones from another pose.

### `BmcBoneTransform`

The position and rotation of one bone, stored as seven values: `x, y, z, qx, qy, qz, qw`.

### `BmcBoneSets`

Named body regions used by clip combination and live wiring. It supplies groups such as `leftArm`, `rightArm`, `legs`, `torso`, and `upperBody`.

### `BmcClip`

The base class for a timed sequence of frames. It provides frame access, relative times, duration, copying, and archive reading or writing.

### `BmcMocapClip`

A `BmcClip` produced by recording motion-capture input. It can retain capture metadata such as filters, capture point, performer, and source.

### `BmcAnimationClip`

A `BmcClip` produced through editing, body-part combination, or future algorithmic generation rather than direct capture.

### `BmcClipRecorder`

Collects validated frames, filters them by avatar and source, preserves relative arrival timing, and returns a `BmcMocapClip` when stopped.

### `BmcClipPlayer`

Schedules an entire clip or an inclusive frame range according to its recorded timing. It handles play, freeze/pause, resume, stop, restart, reset, seek, loop, and rate, and sends frames to an avatar, function, or `NetAddr`.

### `BmcCompositor`

Samples active avatar source caches at a constant rate—60 fps by default—and emits at most one completed frame per avatar per tick. Source arrival and clip playback update caches independently of the avatar output rate.

### `BmcClipLibrary`

Maintains the named in-memory clip collection and current selection. It implements clip listing, the clip-list GUI, rename/remove operations, and archive save/load.

### `BmcWire`

A live rule connecting a selected source and body region to a target avatar. It can filter by source and source-avatar name and carries a priority for cases where several wires affect the same target.

### `BunrakuParser`

An older compatibility parser for symbol-labelled Bunraku messages and control bus layouts. The fixed Bunraku Frame protocol-v1 path primarily uses `BmcFrame`, `BmcPose`, and `Bmc.bone` instead.

## Further testing and troubleshooting

The repository includes four staged communication tests:

1.  XR Animator → Godot
2.  XR Animator → encoder → OSCGroups → remote BuMoChi
3.  SuperCollider playback → decoder → Godot
4.  local and remote sources → BuMoChi synthesis → local decoder → local Godot

They are located in:

``` example
PipelineApplications/Communication_Tests/
```

Each test includes its port map, startup order, pass criteria, and common failures. When the complete system fails, return to Test 1 and introduce one component at a time.
