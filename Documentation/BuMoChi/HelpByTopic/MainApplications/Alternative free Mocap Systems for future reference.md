2026-08-29

> [!question] Are any other counterparts to XR-Animator that are free and work with webcams?

---

 
Yes, but none currently matches XR-Animator’s complete combination of:

- Free use
- macOS support
- Single-webcam real-time tracking
- Body, face and hands
- VRM support
- Direct VMC output

The closest alternatives are:

1. Kalidoface 3D

[Kalidoface 3D](https://github.com/yeemachine/kalidoface-3d) is the closest browser-based alternative.

- Free and open source
- Runs in a browser on macOS
- Uses MediaPipe
- Tracks body, face and hands
- Loads VRM avatars
- Can be used in OBS

Its weakness for BuMoChi is that it does not provide the same ready-made VMC transmission workflow as XR-Animator. We would probably need to add an OSC/VMC output adapter to its JavaScript code.

2. TDPT / ThreeDPoseTracker

[TDPT](https://digital-standard.com/tdpt/) is probably the closest protocol-compatible alternative.

- Free
- Single webcam or video input
- Real-time full-body tracking
- VRM support
- Sends and receives VMC
- Exports BVH, VMD and VRMA

However, the current supported application is **Windows-only**. Its older public source repository is unmaintained, so I would not recommend trying to rebuild it for your Mac. The current Windows version remains potentially useful on a separate Windows workstation.

3. FreeMoCap

[FreeMoCap](https://freemocap.org/) is free and open source.

- Works on macOS, Windows and Linux
- Uses ordinary webcams
- Supports one or multiple cameras
- Produces relatively detailed full-body motion data
- Runs locally

It is oriented toward recording, processing and exporting motion rather than immediate VTuber-style animation. It does not provide a turnkey VMC stream into BuMoChi, although an adapter could be developed. It is more suitable for producing high-quality reusable clips than for your current low-latency performance pipeline.

4. MediaPipe

[MediaPipe](https://mediapipe.org/) itself is free, open source and cross-platform.

It provides:

- Body pose landmarks
- Hand landmarks
- Facial landmarks and expressions
- Browser, Python, C++ and mobile implementations

However, MediaPipe is a development framework rather than a finished mocap application. XR-Animator and Kalidoface are essentially polished applications built around technologies such as MediaPipe. We could eventually build a BuMoChi-specific capture application around it, but that would be a software-development project.

My recommendation for your work is:

- Continue using **XR-Animator** as the primary real-time webcam/VMC source.
- Test **Kalidoface 3D** as an experimental alternative on the Mac.
- Consider **FreeMoCap** later for recording higher-quality motion clips.
- Use **TDPT** only if a Windows workstation becomes available.

For the present BuMoChi pipeline, XR-Animator remains the most practical option because it already supplies VMC data in a form that `BunrakuOSCEncoder` can consume directly.

# Unity Face Capture vs. XR-Animator 

> [!question] If detailed tracking of face shape is our first priority, rather than detection of pretrained expressions such as smile, smirk etc., does Unity Face Capture have a quality advantage over XR-Animator?

Yes—probably a substantial advantage, provided you use an iPhone with a TrueDepth camera and an avatar rigged for the full ARKit facial set.

The advantage is not that Unity Face Capture recognizes more named expressions. Both systems can output the same general class of data: approximately 52 ARKit-compatible facial blendshape coefficients. XR Animator advertises ARKit-compatible “Perfect Sync” 52-blendshape output, while Unity Face Capture uses Apple ARKit’s 52 blendshapes. [Unity Face Capture features](https://docs.unity3d.com/Packages/com.unity.live-capture@4.0/manual/face-capture-features.html), [XR Animator repository](https://github.com/ubemotho/XR-MoCap)

The important difference is how those coefficients are estimated:

- Unity Face Capture uses the iPhone’s dedicated TrueDepth facial tracking.
- XR Animator estimates facial movement from an ordinary RGB webcam using MediaPipe/TensorFlow.js.

I would therefore expect Unity Face Capture to provide:

- More stable values with less neutral-position jitter.
- Better separation of similar mouth shapes.
- Better asymmetric tracking, such as raising one eyebrow or one side of the mouth.
- More reliable cheek, lip-pucker, lip-funnel and jaw measurements.
- Greater resistance to lighting changes and moderate head rotation.
- Less accidental activation of unrelated shapes.

Unity also provides per-blendshape controls for smoothing, multiplier, offset, limits and response curves, which can be useful for calibrating subtle motion. [Unity blendshape mapping controls](https://docs.unity3d.com/Packages/com.unity.live-capture@4.0/manual/face-capture-mapping-evaluator.html)

There are two important qualifications.

First, neither system is transmitting arbitrary high-resolution facial geometry. Both principally produce standardized blendshape weights. Unity’s advantage is likely to be more accurate and stable measurement of those weights—not a fundamentally denser representation of the face.

Second, the avatar must contain corresponding facial morph targets. If Ishidomaru or Mother exposes only blink, vowels and a few emotional expressions, most of the additional detail will be discarded. To benefit fully, the avatar needs an ARKit/Perfect-Sync-style set of facial shapes and a correct mapping for all—or most—of the 52 channels.

There is also a pipeline issue: Unity Face Capture is designed to send its data to Unity Live Capture, not directly through VMC into Godot and BuMoChi. XR Animator already fits your pipeline:

```
XR Animator → VMC → BunrakuOSCEncoder → BuMoChi → decoder → Godot
```

Using Unity Face Capture would require either:

- Rendering the avatar in Unity, or
- Adding a Unity-to-OSC/VMC bridge, or
- Using another iPhone TrueDepth application that already outputs VMC/OSC.

My recommendation is therefore:

- For maximum facial coefficient quality: iPhone TrueDepth capture should outperform XR Animator.
- For immediate compatibility and simpler rehearsals: continue using XR Animator.
- For the eventual BuMoChi performance system: investigate an iPhone TrueDepth source that emits VMC, or implement a bridge so the higher-quality ARKit coefficients enter the same BuMoChi pipeline.

Before changing the whole pipeline, we should also inspect whether Ishidomaru and Mother actually possess the necessary 52 facial morph targets. That determines how much of the capture-quality improvement Godot can display.

# Building a Unity Face Capture to VMC bridge 

We can build a small Unity “Face Capture → VMC” transmitter. It would receive Unity Face Capture’s 52 ARKit coefficients and immediately transmit them as standard VMC/OSC blendshape messages.

```
iPhone
Unity Face Capture
        │ Unity Live Capture
        ▼
Unity bridge project
52 ARKit coefficients
        │ VMC/OSC
        ▼
BunrakuOSCEncoder
        │
        ├── SuperCollider/BuMoChi
        └── OSCGroups
```

## Recommended implementation

Create a minimal Unity project containing:

- Unity Live Capture and ARKit Face Capture packages.
    
- A `FaceCaptureVmcBridge` C# component.
    
- An OSC sender library or a small purpose-built OSC encoder.
    
- A configuration panel containing:
    
    - Target IP
    - Target port
    - Avatar name
    - Source name
    - Transmission rate
    - Smoothing
    - Enable/disable controls for individual facial channels

Unity exposes the captured face as a `FaceBlendShapePose` containing exactly 52 normalized coefficients. [Unity FaceBlendShapePose API](https://docs.unity3d.com/Packages/com.unity.live-capture@4.0/api/Unity.LiveCapture.ARKitFaceCapture.FaceBlendShapePose.html)

At every Unity update, the bridge would convert each coefficient into:

```
/VMC/Ext/Blend/Val "EyeBlinkLeft" 0.37
/VMC/Ext/Blend/Val "EyeBlinkRight" 0.41
/VMC/Ext/Blend/Val "JawOpen" 0.23
...
/VMC/Ext/Blend/Apply
```

VMC specifies that all `/VMC/Ext/Blend/Val` messages for a frame are followed by `/VMC/Ext/Blend/Apply`. Blendshape names are case-sensitive. [Official VMC specification](https://protocol.vmc.info/english)

Preferably these messages would be placed in one timestamped OSC bundle per facial frame.

## Where the bridge should send

For integration with BuMoChi, I would send the VMC output to `BunrakuOSCEncoder`, not directly to Godot:

```
Unity bridge
    target: 127.0.0.1:39537 or another dedicated encoder input
    avatar: Mother
    source: unity-face-capture
```

The encoder would then produce the same route-free BuMoChi frames used by XR Animator and fan them out to:

- Local SuperCollider/BuMoChi
- `OscGroupClient` for network collaboration

This maintains the established “distributed sources, local synthesis” architecture.

A separate encoder input port is advisable if XR Animator is running simultaneously:

```
XR Animator body VMC ──► encoder A
Unity facial VMC     ──► encoder B
                              │
                              ▼
                     SuperCollider/BuMoChi
```

The two streams would carry distinct source identities:

```
avatar: Ishidomaru
source: xr-animator-body
```

```
avatar: Ishidomaru
source: unity-face-capture
```

BuMoChi could then combine:

- Body and head pose from XR Animator
- Facial coefficients from Unity Face Capture

This is preferable to combining them inside Unity because it lets facial capture remain an independent motion source that can be recorded, replayed, substituted or assigned to another figure.

## Naming translation

The bridge needs a fixed ARKit-to-VMC table. In the straightforward case it is nearly one-to-one:

|Unity/ARKit|VMC Perfect Sync|
|---|---|
|`EyeBlinkLeft`|`EyeBlinkLeft`|
|`EyeBlinkRight`|`EyeBlinkRight`|
|`JawOpen`|`JawOpen`|
|`MouthFunnel`|`MouthFunnel`|
|`MouthSmileLeft`|`MouthSmileLeft`|
|`BrowInnerUp`|`BrowInnerUp`|

We should preserve all 52 values rather than reduce them to VRM presets such as `Joy`, `Angry` or `Sorrow`.

Conversion into a particular avatar’s actual morph-target names should happen at the renderer boundary—in the Godot face adapter—not in the Unity bridge. That keeps the recorded facial motion independent of Mother or Ishidomaru.

## Head and eye data

The first version should transmit:

- All 52 facial coefficients
- Relative timestamp
- Tracking-valid status

A second version could also transmit:

- Head position and quaternion
- Left-eye rotation
- Right-eye rotation
- Gaze target

We would need a user option deciding whether Unity or XR Animator owns the head and eye channels. Sending both sources into the same final figure without a clear priority would cause competition or jitter.

For example:

```
Head and body: XR Animator
Eyes and face: Unity Face Capture
```

## Important implementation decision

There are two possible bridge levels:

1. **Pure VMC bridge**
    
    Unity emits ordinary `/VMC/Ext/Blend/Val` messages. This is immediately compatible with existing VMC software.
    
2. **BuMoChi-aware bridge**
    
    Unity sends a compact complete facial frame directly in the Bunraku frame format, including source and avatar metadata.
    

I recommend beginning with the pure VMC bridge. It is simpler, reusable outside BuMoChi and testable with any VMC monitor. `BunrakuOSCEncoder` remains responsible for converting it into BuMoChi’s source-aware frames.

## Development sequence

1. Make Unity receive and visibly display the 52 coefficients.
2. Send one fixed `JawOpen` value over VMC.
3. Confirm it reaches `BunrakuOSCEncoder`.
4. Confirm the encoder delivers it to SuperCollider.
5. Confirm Godot animates the correct avatar.
6. Transmit all 52 channels in bundles.
7. Add source identity, smoothing and tracking-valid handling.
8. Test concurrent XR Animator body plus Unity facial capture.
9. Add recording and independent playback of the facial source in BuMoChi.

This is quite feasible. The core transmitter is small; the more consequential work is ensuring that BuMoChi retains the 52 facial values during recording/composition and that each Godot avatar has an accurate Perfect-Sync-to-morph-target mapping.


# Mainstream VTuber Apps and BuMoChi

The mainstream VTuber animation landscape is divided primarily between 2D avatar puppetry, ready-made 3D VTubing applications, social virtual worlds, and general-purpose game engines.

## 1. Live2D Cubism + VTube Studio

This is probably the most recognizable mainstream pipeline for anime-style 2D VTubers.

- **Live2D Cubism** creates and rigs a deformable 2D character from layered artwork.
- **VTube Studio** receives webcam or iPhone facial tracking and animates the model.
- It includes expressions, props, effects, hotkeys, audience interaction and online collaboration.
- VTube Studio supports Live2D models only—not VRM or ordinary 3D characters. [VTube Studio requirements](https://github.com/DenchiSoft/VTubeStudio/wiki/Introduction-%26-Requirements), [Live2D Cubism](https://www.live2d.com/en/)

This ecosystem emphasizes extremely expressive face and upper-body animation. It does not attempt naturalistic skeletal full-body movement in the same way as BuMoChi.

## 2. VSeeFace

VSeeFace has been one of the standard free applications for independent 3D VTubers using VRM avatars.

It offers:

- Webcam face and hand tracking.
- iPhone Perfect Sync facial input.
- VRM and VSFAvatar rendering.
- VMC input and output.
- Combination of tracking from multiple sources.
- Transparent output for OBS.

[VSeeFace](https://www.vseeface.icu/) is especially relevant to BuMoChi because it uses the same general VMC ecosystem. Conceptually, however, VSeeFace is an avatar puppeteering application: it combines tracking and renders an avatar, but it is not primarily a programmable system for recording, transforming and composing motion.

## 3. Warudo

Warudo is currently one of the most comprehensive dedicated 3D VTubing platforms.

It includes:

- VRM, VRChat and Unity-compatible avatars.
- Webcam and iPhone tracking.
- VMC-compatible motion sources.
- Multiple characters, cameras, environments and props.
- Node-based “Blueprint” programming.
- Audience interaction.
- Motion recording and FBX export.
- OBS, NDI and virtual-camera output.
- A C# plugin SDK.

[Warudo’s documentation](https://docs.warudo.app/docs) describes it as a complete 3D livestreaming environment rather than merely a tracker. Of the mainstream applications, it is probably the closest functional comparison to SC–Godot/BuMoChi.

Its emphasis is on configurable visual production and streaming. BuMoChi’s distinctive emphasis is temporal motion composition through live coding.

## 4. VNyan

[VNyan](https://vnyan.net/) is another free 3D VTubing environment. It is known particularly for:

- VRM avatar presentation.
- VMC tracking input.
- Node-graph programming.
- Twitch and audience interaction.
- Props, effects and event-driven behavior.
- Combining several tracking or control sources.

VNyan and Warudo both treat a VTuber performance as a programmable scene rather than simply displaying a tracked character. They are important comparison points for your work.

## 5. Animaze

Animaze is the successor to FaceRig. It provides a more conventional commercial avatar-puppeteering workflow:

- 2D and 3D avatars.
- Webcam and iPhone facial tracking.
- Multiple simultaneous trackers.
- VMC input for full-body tracking.
- Streaming and virtual-camera integration.

Its architecture is more closed and product-oriented than what you are developing. [Animaze tracker documentation](https://www.animaze.us/manual/appmanual/trackers)

## 6. VRChat

VRChat is not principally a broadcasting application, but it is a major platform for embodied avatar performance and collaborative virtual production.

It provides:

- Networked multi-avatar environments.
- Full-body IK.
- Face and eye tracking on supported systems.
- Avatar animation controllers.
- OSC parameters and OSC tracker input.
- Shared virtual stages and social interaction.

[VRChat supports external tracking through OSC](https://docs.vrchat.com/docs/osc-trackers), but its collaborative model is very different from BuMoChi. VRChat synchronizes participants inside a centrally defined social-world system. BuMoChi distributes motion sources while allowing each workstation to synthesize and render its own complete scene.

## 7. Unity

Unity is arguably the underlying platform behind a large amount of custom and commercial VTuber software.

It is used for:

- Custom virtual stages.
- VRM avatars through UniVRM.
- VMC communication through EVMC4U and related libraries.
- Live Capture and iPhone facial capture.
- Timeline, Mecanim and custom animation graphs.
- Networked performances.
- Shader, lighting and camera systems.
- Custom control panels and integrations.

Warudo itself exposes Unity-compatible assets and C# extensions. Unity is therefore less a single VTuber application and more the dominant construction environment for specialized VTuber tools.

## 8. Unreal Engine and MetaHuman

Unreal Engine is used more for high-end virtual production and realistic digital humans than for ordinary anime-style independent VTubing.

Its prominent components include:

- MetaHuman.
- MetaHuman Animator.
- Live Link.
- Control Rig.
- Sequencer.
- Professional motion-capture integrations.
- Broadcast-quality environments and rendering.

[MetaHuman Animator](https://www.metahuman.com/animate) provides high-quality facial animation in real time, while Live Link carries capture data into Unreal. It offers considerably greater rendering and facial-rig complexity, but also a much heavier production workflow.

## Where SC–Godot/BuMoChi fits

SC–Godot is not simply another replacement for VSeeFace. Its closest comparison is a combination of:

```
Warudo/VNyan scene composition
+ VMC motion interoperability
+ SuperCollider live coding
+ distributed performance
+ Godot rendering
```

Its distinguishing features are potentially:

- Motion capture treated as composable temporal material.
- Recording, replaying and transforming motion while performing.
- Combining different body regions from different clips or live sources.
- Algorithmic and Synth-controlled motion generation.
- Multiple figures constructed locally from distributed motion sources.
- Close synchronization between sound synthesis and avatar movement.
- Network collaboration without requiring one central renderer.
- Textual, live-coded control instead of—or alongside—a node graph.
- Godot as an open and modifiable renderer.

A useful conceptual comparison is:

|Platform|Main abstraction|
|---|---|
|VTube Studio|Live2D character parameters|
|VSeeFace|Tracked VRM avatar|
|Warudo/VNyan|Programmable streaming scene|
|VRChat|Networked embodied social world|
|Unity/Unreal|General real-time production engine|
|**BuMoChi**|**Live-coded composition of motion sources into figures**|

Therefore, BuMoChi’s strongest original territory is not merely “VTubing in Godot.” It is **collaborative live coding of avatar motion**, analogous to the way SuperCollider treats sound as material that can be generated, routed, transformed, layered, recorded and performed.