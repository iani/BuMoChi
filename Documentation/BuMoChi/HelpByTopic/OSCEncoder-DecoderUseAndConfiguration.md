---
title: OSC Encoder and Decoder Use and Configuration
---

Two Python applications convert between standard VMC bundles and the Bunraku OSC frame protocol.

# [BunrakuOSCEncoder](HelperApplications/BunrakuOSCEncoder.md)

The encoder receives VMC from XR-Animator, collects a complete 21-bone pose, and emits one route-free version-1 `/bunraku/vmc/frame` message. By default it sends identical source-frame copies to:

| Purpose                                     | Destination       |
|---------------------------------------------|-------------------|
| local synthesis in Bmc                      | `127.0.0.1:57130` |
| distribution through local `OscGroupClient` | `127.0.0.1:22244` |

Thus local Bmc does not depend on a server echo, while remote workstations receive the same source through OSCGroups. The encoder distributes source data only; it does not select a final Godot avatar or VMC port.

## Standard multiuser launch

``` bash
BunrakuOSCEncoder \
  --avatar "XRAnimator" \
  --source "workstation-a-xr-animator" \
  --verbose
```

Configure XR-Animator VMC output as `127.0.0.1:39537`. Bmc listens on `57130`, and `OscGroupClient` listens for local transmissions on `22244`.

## Single-user launch

``` bash
BunrakuOSCEncoder \
  --no-oscgroups \
  --avatar "XRAnimator" \
  --source "xr-animator" \
  --verbose
```

This keeps the local Bmc copy and disables only network distribution.

## Output options

``` example
--bmc-ip 127.0.0.1
--bmc-port 57130
--oscgroups-ip 127.0.0.1
--oscgroups-port 22244
--no-bmc
--no-oscgroups
```

`--target-ip` and `--target-port` remain aliases for the OSCGroups destination. At least one output must be enabled. `--no-bmc` is useful only for network diagnostics because it removes the direct local source copy.

# [BunrakuOSCDecoder](HelperApplications/BunrakuOSCDecoder.md)

The decoder receives locally synthesized, routed version-2 frames from Bmc on `39538`. It reconstructs VMC and sends each avatar to the target port embedded by local Bmc. The decoder does not receive remote source frames directly; those must first enter local Bmc and participate in local scene synthesis.

## One decoder for several avatars

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --verbose
```

Optional allow-list:

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --allow-target-port 39540 \
  --verbose
```

The allow-list validates embedded destinations; it does not supply them.

## Bmc local output configuration

``` supercollider
Bmc.decoderPort_(39538);       // default local decoder input
Bmc.forwardDecoder_(true);     // false disables local renderer output
```

These are Bmc's only class-wide network-output controls. Bmc has no OSCGroups or remote-forwarding output option.

## Legacy version-1 fallback

For a deliberate route-free stream sent directly to the decoder:

``` bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --target-port 39539 \
  --verbose
```

Normal BuMoChi operation uses routed version-2 output from local Bmc instead.

# Repository launch paths

``` bash
cd /Users/iani/Obsidian/Iani/Projects/260715_ICLC27/AppsAndCode/BuMoChi/Testing_BuMoChi
python3 BunrakuOSCEncoder.py --help
python3 BunrakuOSCDecoder.py --help
```

Press `Control-C` to stop either process. Diagnose occupied ports with:

``` bash
lsof -nP -iUDP:39537
lsof -nP -iUDP:57130
lsof -nP -iUDP:22244
lsof -nP -iUDP:39538
```
