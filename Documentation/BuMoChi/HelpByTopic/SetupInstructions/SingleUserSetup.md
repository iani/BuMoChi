---
title: Single User Setup
---

This is the canonical setup for working on one computer without OSCGroups. Use it for development, recording, playback, rehearsal, and local Godot rendering.

# Signal path

``` example
XR-Animator
    -> VMC 127.0.0.1:39537
BunrakuOSCEncoder
    -> local Bunraku frames 127.0.0.1:57130
    -> OSCGroups copy disabled for this setup
Bmc in SuperCollider
    -> routed Bunraku frames 127.0.0.1:39538
one BunrakuOSCDecoder
    -> VMC 127.0.0.1:39539 (Mother)
    -> VMC 127.0.0.1:39540 (Ishidomaru, when used)
Godot
```

# Port map

Use these values consistently:

| Port  | Listener                      | Sender              |
|-------|-------------------------------|---------------------|
| 39537 | `BunrakuOSCEncoder`           | XR-Animator         |
| 57130 | Bmc/SuperCollider             | `BunrakuOSCEncoder` |
| 39538 | shared `BunrakuOSCDecoder`    | Bmc avatars         |
| 39539 | Mother's Godot VMC receiver   | shared decoder      |
| 39540 | Ishidomaru Godot VMC receiver | shared decoder      |

Only one process may listen on each port. The same decoder listens once on `39538` and sends to all configured Godot ports.

# Before starting

1.  Stop old encoder and decoder processes with `Control-C`.
2.  Stop any running Godot project left from another test.
3.  Recompile the SuperCollider class library after changing BuMoChi classes.
4.  Open the desired Godot project and confirm its VMC receiver ports.

For a first test, configure only Mother on `39539`. Add Ishidomaru on `39540` when the Godot scene contains that second receiver.

# Startup procedure

Perform these steps in order.

## 1. Start Godot

Open and run the desired Godot project. Confirm that:

- Mother's VMC source listens on UDP `39539`;
- Mother's `XRBodyModifier3D` and `XRFaceModifier3D` nodes use the tracker names published by that source;
- if Ishidomaru is present independently, its VMC source listens on `39540` and uses distinct tracker names.

The avatars may remain still until the remaining applications start.

## 2. Start the shared decoder

Open a Terminal window:

### Basic version

Use this for simplicity. SuperCollider must embed the correct destination port in every protocol-version-2 frame, either from the active session definition or from manually configured Bmc avatars.

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --verbose
```

With no allow-list, the decoder accepts any valid destination port embedded in a protocol-version-2 frame. Protocol-version-1 frames are still rejected unless a fallback `--target-port` is supplied.

### Advanced version

Use this when you want the decoder to accept only a known set of Godot VMC destination ports:

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --allow-target-port 39540 \
  --verbose
```

The decoder reads the destination from each frame as before, but rejects frames whose embedded port is not `39539` or `39540`. If the scene contains only Mother, omit the `39540` allow-list line.

Keep this Terminal open.

## 3. Configure and start Bmc

In SuperCollider, evaluate:

``` supercollider
(
Bmc.reset;

~decoder = NetAddr("127.0.0.1", 39538);

// The encoder below labels the incoming live stream "Mother".
Bmc.addAvatar(\Mother, "Mother");
Bmc.avatar(\Mother).output_(~decoder);
Bmc.avatar(\Mother).vmcPort_(39539);
Bmc.selectAvatar(\Mother);

// Add this only when the Godot project has an independent second receiver.
Bmc.addAvatar(\Ishidomaru, "Ishidomaru");
Bmc.avatar(\Ishidomaru).output_(~decoder);
Bmc.avatar(\Ishidomaru).vmcPort_(39540);

Bmc.start(57130);
Bmc.status;
)
```

The posted status must include `running: true` and `port: 57130`.

## 4. Start the encoder

Open a second Terminal window:

``` bash
BunrakuOSCEncoder \
  --no-oscgroups \
  --avatar "Mother" \
  --source "xr-animator" \
  --verbose
```

The default encoder input is `39537` and its default Bmc output is `57130`, so neither port needs to be supplied. `--no-oscgroups` disables the otherwise automatic second copy to port `22244`. Keep this Terminal open. The encoded avatar name is `Mother` so the registered Bmc avatar receives the live stream and routes it to Godot port `39539`.

## 5. Start XR-Animator output

Configure XR-Animator VMC output:

``` example
Host: 127.0.0.1
Port: 39537
```

Enable VMC output and stand in view of the camera. Mother should follow the tracked motion in Godot.

# Verify the setup

1.  The encoder's `received` and `sent` counters should increase.
2.  Evaluate `Bmc.status`; `received` should increase.
3.  The decoder's `received` and `sent` counters should increase.
4.  With `--verbose`, the decoder should print target `127.0.0.1:39539` for Mother.
5.  Mother should move in Godot.

If a stage fails, inspect the listener immediately before it:

``` bash
lsof -nP -iUDP:39537
lsof -nP -iUDP:57130
lsof -nP -iUDP:39538
lsof -nP -iUDP:39539
```

# Recording and playback

Once the live path works, use the normal Bmc methods without changing the running applications:

``` supercollider
Bmc.record(\take1, "Mother", "xr-animator");
// perform the movement
Bmc.stopRecording;
Bmc.saveClip(\take1);

Bmc.playClip(\take1);
```

The saved clip remains independent of Mother and of port `39539`. Avatar identity and routing are applied only during output.

# Shutdown

1.  Disable VMC output in XR-Animator.
2.  In SuperCollider, evaluate `Bmc.stop`.
3.  Press `Control-C` in the encoder Terminal.
4.  Press `Control-C` in the decoder Terminal.
5.  Stop the running Godot project.

# Related detail

- [OSC Encoder and Decoder Use and Configuration](../OSCEncoder-DecoderUseAndConfiguration.org)
- [Avatar Port Numbers](../Avatar_Port_Numbers.org)
- [Recording and Playback](../RecordingAndPlayback.org)
- [Troubleshooting Port Numbers](../TroubleshootingInstructions/TroubleshootingPortNumbers.scd)
