---
title: Port Number Specification
---

# Principle

A port number identifies one receiving UDP socket on one host. Only one process should normally listen on a given host/port pair. Sending processes may all send to the same listener.

Port numbers are configurable. The examples below are recommended defaults for one-computer work; what matters is that both ends of every connection use the same value.

# Routed playback on one computer

| Connection | Receiver | Example port |
|----|----|----|
| Bmc routed Bunraku frames | Shared `BunrakuOSCDecoder` | 39538 |
| Decoder VMC output for Mother | Mother's Godot VMC source | 39539 |
| Decoder VMC output for Ishidomaru | Ishidomaru's Godot VMC source | 39540 |

All Bmc avatars send to the shared decoder port. Each protocol-version-2 frame contains the `vmcPort` of its final Godot destination. Consequently, only Bmc session/avatar data and the corresponding Godot receiver repeat the per-avatar VMC port; the Python command no longer needs one `--target-port` per avatar.

``` example
Bmc avatars -> 127.0.0.1:39538 -> one decoder
                                      |-> 127.0.0.1:39539 Mother
                                      `-> 127.0.0.1:39540 Ishidomaru
```

# Shared decoder command

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --allow-target-port 39540 \
  --verbose
```

The allow-list is recommended but optional. `--target-ip` defaults to `127.0.0.1`. The routed frame embeds only the port, so one decoder invocation sends all of its VMC output to one target host.

# Live input before Bmc

XR-Animator sends ordinary VMC to the Python encoder's `--listen-port`. The encoder sends complete version-1 Bunraku frames either directly to Bmc or through OSCGroups. Those incoming frames do not require a final Godot destination because Bmc adds routing only after figure composition and avatar assignment.

A practical complete local path is:

| Connection                       | Example receiving port |
|----------------------------------|------------------------|
| XR-Animator -\> encoder          | 39537                  |
| encoder/OSCGroups -\> Bmc        | 57130                  |
| Bmc -\> shared decoder           | 39538                  |
| decoder -\> Mother Godot VMC     | 39539                  |
| decoder -\> Ishidomaru Godot VMC | 39540                  |

OSCGroups uses additional session/server ports according to its own configuration. Those network ports should not be confused with the local Bmc dispatcher or Godot VMC ports.

# Legacy version-1 playback

A version-1 Bunraku frame contains no final target. For direct legacy playback, the decoder still accepts:

``` bash
BunrakuOSCDecoder --listen-port 39538 --target-port 39539
```

This fallback is unnecessary when a Bmc avatar has `vmcPort` configured and therefore transmits protocol version 2.

# Rules

1.  One receiving process per host/port pair.
2.  The Bmc decoder output address must equal the shared decoder's `--listen-ip` and `--listen-port`.
3.  Each avatar's `vmcPort` must equal that avatar's Godot VMC listening port.
4.  Independent Godot VMC sources require distinct ports.
5.  Routing is added only at the Figure -\> Avatar boundary and is never stored in clips.
6.  Use an allow-list when routed frames are received from a network or any untrusted source.
7.  A decoder can route to several ports on one `--target-ip`. Multiple destination hosts require separate decoder instances or a future protocol carrying a validated host/route identifier.

# Diagnose a conflict

On macOS:

``` bash
lsof -nP -iUDP:39538
```

Replace `39538` with the port reported in the error. Stop the unintended listener or update both ends of the desired connection to use another free port.
