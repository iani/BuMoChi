---
title: Avatar Port Numbers
---

This guide explains the routed-frame workflow for sending independently composed Bmc figures through one Bunraku decoder to separate Godot VMC receivers.

# Routing model

Every Bmc avatar sends its Bunraku frames to one shared decoder input. A protocol-version-2 frame carries the final Godot VMC destination port. The decoder reads that port, reconstructs the VMC bundle, and forwards it locally.

``` example
Mother figure --------\
                       > 127.0.0.1:39538  one decoder
Ishidomaru figure ----/          |-- frame target 39539 --> Mother VMC receiver
                                 `-- frame target 39540 --> Ishidomaru VMC receiver
```

Routing information is attached only at the final Figure -\> Avatar boundary. Completed frames published for recording remain route-free protocol-version-1 frames, so saved clips do not become associated with a destination port.

An avatar name and a port perform different jobs:

- The avatar name is identity metadata carried by the frame and resulting VMC bundle.
- The embedded `vmcPort` selects the Godot VMC receiver that physically receives the reconstructed bundle.
- The shared decoder address tells every Bmc avatar where to send its routed Bunraku frame.

# Example local port map

| Role                         | Host        | Port  |
|------------------------------|-------------|-------|
| Shared Bunraku decoder input | `127.0.0.1` | 39538 |
| Mother Godot VMC input       | `127.0.0.1` | 39539 |
| Ishidomaru Godot VMC input   | `127.0.0.1` | 39540 |

The numbers are configurable. Their roles and agreement between sender and receiver are what matter.

# Start one shared decoder

For the example above:

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --allow-target-port 39540 \
  --verbose
```

The allow-list is recommended. A frame containing another target port is rejected. Omit the `--allow-target-port` options to permit any valid local UDP destination port.

The `--target-port` option is no longer needed for routed version-2 frames. It remains available only as a fallback for legacy version-1 frames.

# Configure Godot

The Godot scene needs one VMC source/tracker per independent incoming stream:

- Mother's VMC receiver listens on `39539` and publishes to Mother's body and face tracker names.
- Ishidomaru's VMC receiver listens on `39540` and publishes to Ishidomaru's body and face tracker names.

Each avatar's `XRBodyModifier3D` and `XRFaceModifier3D` nodes must reference the tracker names published by that avatar's VMC source. Distinct ports cannot separate motion if both modifier nodes still read the same tracker name.

# Configure Bmc directly

``` supercollider
(
~decoder = NetAddr("127.0.0.1", 39538);

Bmc.addAvatar(\Mother, "Mother");
Bmc.avatar(\Mother).output_(~decoder);
Bmc.avatar(\Mother).vmcPort_(39539);

Bmc.addAvatar(\Ishidomaru, "Ishidomaru");
Bmc.avatar(\Ishidomaru).output_(~decoder);
Bmc.avatar(\Ishidomaru).vmcPort_(39540);
)
```

Selecting an avatar makes the player send route-free clip frames to that Bmc avatar. At transmission, the avatar rewrites the external identity and adds its `vmcPort`:

``` supercollider
Bmc.selectAvatar(\Mother);
Bmc.playClip(\mother_take_01);
```

# Store routed settings in a session

The current `BmcSession` implementation accepts an optional shared decoder setting while retaining its legacy clip settings:

``` supercollider
(
~clipSettings = IdentityDictionary[
    \motherEntrance -> (clip: \mother_take_01, avatar: \Mother),
    \ishidomaruReply -> (clip: \ishidomaru_take_03, avatar: \Ishidomaru)
];

~avatarSettings = IdentityDictionary[
    \Mother -> (vmcPort: 39539),
    \Ishidomaru -> (vmcPort: 39540)
];

Bmc.saveSession(
    \duet_rehearsal,
    ~clipSettings,
    ~avatarSettings,
    nil, // default session-file path
    (host: "127.0.0.1", port: 39538) // shared decoder input
);
)
```

After loading, `Bmc.applySession` assigns the same decoder `NetAddr` to every configured avatar and assigns a different `vmcPort` to each:

``` supercollider
Bmc.loadSession(\duet_rehearsal);
Bmc.applySession;
```

The fuller `motions` and `figures` session format is specified in [Session Data Objects and Terminology](SessionDataObjectsAndTerminology.org) but is not yet implemented by `BmcSession`.

# Legacy version-1 fallback

Existing direct or recorded version-1 frames do not contain a target port. To send such frames without Bmc's avatar boundary, start the decoder with a fallback:

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --target-port 39539 \
  --verbose
```

When Bmc sends through an avatar with `vmcPort` configured, it automatically constructs version 2. When no `vmcPort` is configured, it continues to transmit the original version-1 form for compatibility with a dedicated decoder.

# Port rules and troubleshooting

1.  Only one process may listen on a particular host/UDP-port pair.
2.  Every Bmc avatar sends to the one shared decoder listening port.
3.  Each independent Godot VMC source needs a distinct listening port.
4.  An avatar's `vmcPort` must equal its corresponding Godot VMC input port.
5.  Use `--allow-target-port` to constrain embedded destinations.
6.  The current routed format sends only a port and assumes the decoder forwards to its `--target-ip`, which defaults to `127.0.0.1`. One decoder invocation therefore targets one host.
7.  Avatar identity and port routing should agree even though they have separate functions.

An `Address already in use` error means another process owns the reported listening port. On macOS, inspect it with:

``` bash
lsof -nP -iUDP:39538
```
