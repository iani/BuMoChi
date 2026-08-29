# What is BunrakuOSCEncoder?

`BunrakuOSCEncoder` is an open-source Python application included with BuMoChi. It is a bridge between motion-capture applications that use VMC, such as XR-Animator and Waidayo, and synthesis and network applications that use OSC. It converts VMC bundles into individual OSC frame messages and sends them to SuperCollider and [OSCGroupsClient](OSCGroupsClient.md). More specifically, it listens for standard VMC bundles, collects the required 21 humanoid bones into complete frames, and converts each complete pose into one route-free protocol-version-1 `/bunraku/vmc/frame` OSC message. Route-free means that the message does not yet contain the destination port of the avatar that will render the frame in Godot.

By default, the encoder sends an identical copy of every source frame to two local destinations:

| Copy | Destination | Purpose |
|---|---|---|
| Local copy | `127.0.0.1:57130` | Local recording and motion synthesis in Bmc |
| Network copy | `127.0.0.1:22244` | Distribution through the local `OscGroupClient` |

This implements BuMoChi's distributed-sources/local-synthesis model. The encoder shares raw motion sources, not completed figures or routed avatar output. Bmc later constructs figures, assigns avatars, and sends the locally completed scene to the decoder and Godot.

```text
XR-Animator → VMC UDP 39537 → BunrakuOSCEncoder ┬→ UDP 57130 → local Bmc
                                                 └→ UDP 22244 → OscGroupClient → remote workstations
```

# Where to find BunrakuOSCEncoder

All repository paths in this guide are relative to the root of the BuMoChi repository. Run the shown repository commands after changing into that root folder.

The entry-point script and its supporting Python modules are in:

```text
PipelineApplications/
```

The main entry point is `BunrakuOSCEncoder.py`. Keep it beside `vmc_to_bunraku_frame.py` and `bunraku_protocol.py`. Copying only `BunrakuOSCEncoder.py` elsewhere will break its imports.

The current implementation uses only Python's standard library; it does not require a separate OSC package.

# Configure XR-Animator

Enable VMC/OSC output in XR-Animator and set its destination to:

```text
IP address: 127.0.0.1
UDP port:   39537
```

Port `39537` is the encoder's default VMC input. Do not point XR-Animator directly at Bmc port `57130`; Bmc expects complete Bunraku frames rather than ordinary VMC bone messages.

# How to start BunrakuOSCEncoder

For a multiuser OSCGroups session, first start Bmc and `OscGroupClient`, then run:

```bash
python3 PipelineApplications/BunrakuOSCEncoder.py \
  --avatar "Ishidomaru" \
  --source "workstation-a-xr-animator" \
  --verbose
```

The `--avatar` value is source metadata at this stage; it does not permanently bind recorded motion to that rendered avatar. Give every transmitting encoder a stable, unique `--source` value. On another workstation, use a different source such as `workstation-b-xr-animator`.

For a local-only session without OSCGroups:

```bash
python3 PipelineApplications/BunrakuOSCEncoder.py \
  --no-oscgroups \
  --avatar "Ishidomaru" \
  --source "local-xr-animator" \
  --verbose
```

Leave this terminal open while capturing motion. Stop the encoder with `Control-C`.

# Make BunrakuOSCEncoder available from any terminal directory

Do not copy the Python entry-point file alone into a binary directory because it depends on modules beside it. Instead, while your terminal is in the BuMoChi repository root, create a symbolic-link launcher in `~/.local/bin`. Python resolves the link to the original script and can therefore still find its support modules.

Create the directory if necessary:

```bash
mkdir -p "$HOME/.local/bin"
```

Create or replace the launcher link. `$PWD` captures the current BuMoChi repository root, while the repository path following it remains relative to that root:

```bash
ln -sf "$PWD/PipelineApplications/BunrakuOSCEncoder.py" "$HOME/.local/bin/BunrakuOSCEncoder"
```

Ensure that `~/.local/bin` is in the default macOS `zsh` search path by adding this to `~/.zshrc` if it is not already present:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Open a new terminal, or reload the configuration:

```bash
source "$HOME/.zshrc"
```

Confirm the launcher:

```bash
which BunrakuOSCEncoder
BunrakuOSCEncoder --help
```

You can now use it from any directory:

```bash
BunrakuOSCEncoder \
  --avatar "Ishidomaru" \
  --source "workstation-a-xr-animator" \
  --verbose
```

# Important options

| Option | Meaning | Default |
|---|---|---:|
| `--listen-ip` | Address on which VMC is received | `127.0.0.1` |
| `--listen-port` | VMC input from XR-Animator | `39537` |
| `--bmc-ip` | Local Bmc host | `127.0.0.1` |
| `--bmc-port` | Local Bmc input | `57130` |
| `--oscgroups-ip` | Local `OscGroupClient` host | `127.0.0.1` |
| `--oscgroups-port` | Local `OscGroupClient` transmit input | `22244` |
| `--no-bmc` | Disable the direct local Bmc copy | disabled |
| `--no-oscgroups` | Disable the OSCGroups copy | disabled |
| `--avatar NAME` | Source avatar metadata included in each frame | `Ishidomaru` |
| `--source NAME` | Stable sender/source identity | random per run if omitted |
| `--verbose` | Print frame and statistics information | disabled |
| `--log-partial` | With `--verbose`, show bones still awaited while assembling a frame | disabled |

At least one destination must remain enabled. `--no-bmc` is intended only for a deliberate network diagnostic because it prevents local Bmc from receiving the local performer directly.

# Test and diagnose

Check which applications own the pipeline ports:

```bash
lsof -nP -iUDP:39537
lsof -nP -iUDP:57130
lsof -nP -iUDP:22244
```

While the encoder is running, it should own `39537`; Bmc should own `57130`; and `OscGroupClient` should own `22244`. If `--verbose` repeatedly reports partial frames, XR-Animator is not providing all required bones or its VMC stream is not reaching the encoder.

# Cheat-sheet

This works if you have installed a globally accessible script according to the instructions above.

Start the globally available encoder with all default settings:

```bash
BunrakuOSCEncoder
```

This starts `BunrakuOSCEncoder` with these defaults:

- VMC input from XR-Animator: `127.0.0.1:39537`
- Route-free frame copy to local Bmc: `127.0.0.1:57130`
- Identical route-free frame copy to local `OscGroupClient`: `127.0.0.1:22244`
- Avatar name carried by each frame: `Ishidomaru`; override it with `--avatar NAME`
- Encoder-source identity: a new random identifier for this run if `--source NAME` is omitted; this identifies the stream, not the avatar

The avatar name is therefore fixed as `Ishidomaru` for the duration of a default run. It is not selected randomly. The separately generated source identifier prevents otherwise identical unnamed encoder processes from being mistaken for the same stream. For a repeatable recording or multiuser setup, supply an explicit stable source such as `--source "workstation-a-xr-animator"`.
