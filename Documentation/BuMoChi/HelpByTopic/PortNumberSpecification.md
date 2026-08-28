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

All Bmc avatars fan each routed frame out to the shared decoder port and the `OscGroupClient` transmit port. Each protocol-version-2 frame contains the `vmcPort` of its final Godot destination. Consequently, every workstation can deliver the same frame to the same avatar port in a matching Godot scene.

``` example
Bmc avatars -+-> 127.0.0.1:39538 -> one decoder -> Godot ports
             `-> 127.0.0.1:22244 -> OscGroupClient -> remote decoders
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

XR-Animator sends ordinary VMC to the Python encoder's `--listen-port`. The encoder sends complete route-free version-1 Bunraku frames only to Bmc. Bmc adds routing after figure composition and avatar assignment, then sends the same routed version-2 frame to its local decoder and to OSCGroups.

A practical complete local path is:

| Connection                       | Example receiving port |
|----------------------------------|------------------------|
| XR-Animator -\> encoder          | 39537                  |
| encoder -\> Bmc                  | 57130                  |
| Bmc/OscGroupClient -\> decoder   | 39538                  |
| Bmc -\> OscGroupClient tx input  | 22244                  |
| decoder -\> Mother Godot VMC     | 39539                  |
| decoder -\> Ishidomaru Godot VMC | 39540                  |

The `OscGroupClient` local receive output is `39538`, so remote routed frames go directly to the decoder rather than back to Bmc.

# Legacy version-1 playback

A version-1 Bunraku frame contains no final target. For direct legacy playback, the decoder still accepts:

``` bash
BunrakuOSCDecoder --listen-port 39538 --target-port 39539
```

This fallback is unnecessary when a Bmc avatar has `vmcPort` configured and therefore transmits protocol version 2.

# Rules

1.  One receiving process per host/port pair.
2.  `Bmc.decoderPort` must equal the shared decoder's `--listen-port`.
3.  `Bmc.oscGroupsPort` must equal `OscGroupClient.localTxPort`.
4.  Each avatar's `vmcPort` must equal that avatar's Godot VMC listening port on every workstation.
5.  Independent Godot VMC sources require distinct ports.
6.  Routing is added only at the Figure -\> Avatar boundary and is never stored in clips.
7.  Use an allow-list when routed frames are received from a network or any untrusted source.

# Diagnose a conflict

On macOS:

``` bash
lsof -nP -iUDP:39538
```

Replace `39538` with the port reported in the error. Stop the unintended listener or update both ends of the desired connection to use another free port.
