---
title: Session Data Objects and Terminology
---

Thu 27 Aug 2026 13:11

# Session

A session creates the motion of one or more avatars during live coding, rehearsal, or performance. It does this by replaying recorded motion, receiving live motion, generating synthetic motion, and combining these sources into completed motion frames for its figures. When the session is activated and performed, it routes each resulting figure stream to the corresponding avatar in Godot. A session can therefore create an animation containing several avatars, each moving independently according to its assigned motion data.

A session definition defines motion sources, motions, figures, avatars, and their routes. A clip is immutable recorded motion data. A motion configures a clip, live stream, function, or Synth-controlled generator for use in a session. A figure evaluates and layers ordered motions to produce complete frames. An avatar assigns external identity and a VMC destination to a completed figure. Routing information is added only at this final boundary and is not stored in clips.

Each session is stored as a separate named `.scd` file in the Bmc sessions directory. When a session is loaded, it is registered under its name in the in-memory `Bmc.sessions` dictionary. Keeping one session per file makes sessions easier to inspect, copy, version, and share, and prevents an error in one session from affecting every saved session.

Possible future refinement: A future *Scene* may describe a dramaturgical unit within a session. In particular, a scene should contain an ordered sequence, timeline, or set of cues. The present data format does not yet describe that temporal structure, so *Session* is the more accurate name at this stage.

# Session data format

Sessions use four principal data objects. *Source* is an additional role or interface: anything capable of supplying motion data can act as a source, but sources do not have to form a separate top-level session dictionary.

1.  *Clip*: A clip is an immutable stored recording of time-indexed mocap frames. Clips are usually created by recording XR-Animator, VMC, or another motion source. A clip retains provenance metadata, but it contains neither an avatar assignment nor output-routing information.
2.  *Motion*: A motion is a configured use of a motion source. Its source may be a clip, live stream, language-side Function, Synth-controlled generator, or another compatible producer. Motion settings may include playback rate, looping, the position at which reading begins, transformations, and processing rules. When evaluated, a motion supplies movement for all or part of a figure.
3.  *Figure*: A figure is a complete logical body assembled from one or more ordered motions. It lists its motion sources in the exact order in which their current values are applied to compose each completed figure frame. Only after composition is complete is the frame passed to an avatar.
4.  *Avatar*: An avatar is the rendered destination of a completed figure. It supplies the external avatar identity and final VMC destination. At the Figure -\> Avatar boundary, routing metadata is added to the transmitted frame; this does not alter the source clip.

Synthetic and transformed data therefore do not become part of a clip. They are represented as motion sources or processing rules. This permits Functions, Synth-controlled values, live input, and recorded clips to be used independently or combined without weakening the definition of a clip.

``` supercollider
(
    name: \duet_rehearsal,

    // All routed Bunraku frames are sent to this one shared decoder input.
    decoder: (host: "127.0.0.1", port: 39538),

    // Define the avatars that are the main actors in the session first.
    // Dictionaries are order-insensitive, but this order makes the
    // source file easier for a human reader to understand.

    avatars: IdentityDictionary[
        \Mother -> (vmcPort: 39539),
        \Ishidomaru -> (vmcPort: 39540)
    ],

    // A motion is a configured use of a saved clip. The dictionary key,
    // such as \walk, names the motion inside this session. The value of
    // \clip identifies the underlying recording and remains independent
    // of avatars and figures.

    motions: IdentityDictionary[
        \walk -> (
            clip: \take1,
            rate: 1.0,
            loop: false,
            in: 0.0
        ),
        \arms -> (
            clip: \take2,
            rate: 1.0,
            loop: false,
            in: 0.0
        )
    ],

    figures: IdentityDictionary[
        \motherFigure -> (
            // Sources are applied from first to last. Later sources
            // override earlier sources for overlapping selected bones.
            // Here \walk supplies the base body, then \arms replaces
            // only the arm bones for which it contains valid data.
            sources: [
                (motion: \walk, bones: \all),
                (motion: \arms, bones: \arms)
            ],
            avatar: \Mother
        ),
        \ishidomaruFigure -> (
            sources: [(motion: \walk, bones: \all)],
            avatar: \Ishidomaru
        )
    ]

)
```

# Motion

A motion is not another copy of recorded mocap data. It configures a source for one reusable mode of use within the session. The compact `clip` field shown below is shorthand for a source of type `\clip`.

In the example, `\walk` is the session-local motion name and `\take1` is the name of the saved clip:

``` supercollider
\walk -> (clip: \take1, rate: 1.0, loop: false, in: 0.0)
```

The `in` value is the position, in seconds, at which reading begins inside the clip. It replaces the less precise name `start`. A future scene timeline may use a separate `at` value to specify when a motion begins within a scene.

# Source types

A source is anything that can supply motion values to a motion. It is a role or interface rather than necessarily another top-level session collection. Planned source types include:

``` supercollider
(type: \clip, name: \take1)
(type: \live, input: \xrAnimator)
(type: \function, function: { |time| sin(time * 2pi * 0.2) })
(type: \synth, bus: 12)
```

A language-side Function can calculate values directly. A server-side Synth normally exposes control values through a bus or another adapter, which converts them into named bone or channel values. Recorded, live, and generated values may then be layered or transformed during figure composition.

For readability, a clip-based motion may use the shorthand shown in the main example:

``` supercollider
\walk -> (clip: \take1, rate: 1.0, loop: false, in: 0.0)
```

The session loader may normalize this internally to:

``` supercollider
\walk -> (
    source: (type: \clip, name: \take1),
    rate: 1.0,
    loop: false,
    in: 0.0
)
```

# Figure source order

The `sources` array is ordered and therefore defines a simple, deterministic layer order:

1.  Begin from the figure's reference pose, or use another explicitly selected missing-data policy.
2.  Apply the first source to its selected bones.
3.  Continue through the array from first to last.
4.  When selections overlap, a later source replaces values supplied by an earlier source.
5.  A later source replaces only bone channels for which it contains valid data; missing data must not erase values inherited from an earlier layer.
6.  After all sources have been applied, fill any still-missing data according to the figure's missing-data policy.

Thus, in the example, `\walk` supplies the general full-body motion and `\arms` supplies a more specific arm layer. Explicit numeric priorities are not needed initially because array order already expresses precedence clearly.

The exact contents of named bone groups such as `\arms` and `\all` must be defined centrally by BuMoChi. Later versions may also allow a source to select channels such as rotation or position independently.

The missing-data policy must be explicit because different policies create different movement. Initially useful policies are:

- `\underlying`: retain a value already supplied by an earlier source layer;
- `\reference`: use the figure's reference pose when no layer supplied a value;
- `\hold`: retain the most recent valid value from the previous completed frame.

During layer composition, `\underlying` is the normal behavior: absent data in a later layer must not erase valid data from an earlier one. A figure-level policy decides how to fill values that remain absent after every layer has been applied.

# Avatar routing

The routed-frame implementation uses one shared Python OSC decoder. Bmc sends every completed avatar frame to the decoder's global input. The outgoing protocol-version-2 frame carries that avatar's final VMC destination port, and the decoder converts the frame into a VMC bundle and forwards it accordingly.

Routing information is attached only at the final Figure -\> Avatar boundary. It is not written into clips, motions, or composed figure data. Each avatar's `vmcPort` is the port on which its Godot VMC receiver listens. The decoder's `--target-ip` defaults to `127.0.0.1`.

The decoder retains protocol-version-1 compatibility. A version-1 frame has no embedded route and therefore requires the decoder's legacy `--target-port` fallback. A Bmc avatar with `vmcPort` configured automatically transmits version 2; without `vmcPort` it transmits version 1.

The decoder validates embedded destination ports and may restrict them with repeated `--allow-target-port` options. If a future configuration sends VMC to several different computers, the route model must add a validated host or route identifier; the current decoder sends all reconstructed VMC bundles to one `--target-ip`.

# Open timing question

When the same motion is referenced by more than one figure, each source entry should normally create an independent playback instance with its own cursor. This permits figures to start, seek, loop, or change rate independently. A later synchronization option can allow several source instances to share a clock when exact unison is desired.
