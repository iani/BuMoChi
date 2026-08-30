# What is BunrakuOSCDecoder?

`BunrakuOSCDecoder` is an open-source Python application included with BuMoChi. It is a bridge between synthesis applications that use BuMoChi's OSC frame format and animation applications that use VMC, such as Godot with the VMC Tracker plugin. It converts individual OSC frame messages received from SuperCollider/Bmc into standard VMC bundles and sends them to Godot. It accepts legacy routed protocol-version-2 frames and extended routed protocol-version-4 frames. Extended frames reconstruct the 21 core bones, additional bones such as finger joints, facial `/VMC/Ext/Blend/Val` messages, and `/VMC/Ext/Blend/Apply`, then forward the complete VMC bundle to the destination port embedded in the frame.

Each routed frame contains the destination VMC port assigned to its avatar. One decoder can therefore receive every locally synthesized avatar on input port `39538` and forward each one to its own local Godot port. In the default configuration, Ishidomaru is forwarded to `39539`.

```text
SuperCollider/Bmc → routed frames on UDP 39538 → BunrakuOSCDecoder → VMC on UDP 39539 → Godot/Ishidomaru
```

The decoder is a local rendering helper. It does not send data to OSCGroups and should not receive remote route-free source frames directly.

# Where to find BunrakuOSCDecoder

All repository paths in this guide are relative to the root of the BuMoChi repository. Run the shown repository commands after changing into that root folder.

The entry-point script and its supporting Python modules are in:

```text
PipelineApplications/
```

The main entry point is `BunrakuOSCDecoder.py`. Keep it beside `bunraku_frame_to_vmc.py` and `bunraku_protocol.py`. Copying only `BunrakuOSCDecoder.py` elsewhere will break its imports.

The current implementation uses only Python's standard library; it does not require a separate OSC package.

# How to start BunrakuOSCDecoder

For the default Ishidomaru pipeline:

```bash
python3 PipelineApplications/BunrakuOSCDecoder.py \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --verbose
```

The allow-list is optional, but it prevents an incorrectly routed frame from being forwarded to an unexpected local UDP port. For a scene containing additional avatars, repeat the option:

```bash
python3 PipelineApplications/BunrakuOSCDecoder.py \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --allow-target-port 39540 \
  --verbose
```

The allow-list validates destinations embedded by Bmc; it does not assign those destinations. Leave this terminal open while using BuMoChi. Stop the decoder with `Control-C`.

# Make BunrakuOSCDecoder available from any terminal directory

Do not copy the Python entry-point file alone into a binary directory because it depends on modules beside it. Instead, while your terminal is in the BuMoChi repository root, create a symbolic-link launcher in `~/.local/bin`. Python resolves the link to the original script and can therefore still find its support modules.

Create `~/.local/bin` if needed:

```bash
mkdir -p "$HOME/.local/bin"
```

Create or replace the launcher link. `$PWD` captures the current BuMoChi repository root, while the repository path following it remains relative to that root:

```bash
ln -sf "$PWD/PipelineApplications/BunrakuOSCDecoder.py" "$HOME/.local/bin/BunrakuOSCDecoder"
```

Ensure that `~/.local/bin` is in your shell search path. For the default macOS `zsh` shell, add this line to `~/.zshrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Open a new terminal, or reload the configuration:

```bash
source "$HOME/.zshrc"
```

Confirm the launcher:

```bash
which BunrakuOSCDecoder
BunrakuOSCDecoder --help
```

You can now start the decoder from any directory:

```bash
BunrakuOSCDecoder \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --verbose
```

# Important options

| Option | Meaning | Default |
|---|---|---:|
| `--listen-ip` | Local address on which the decoder receives Bmc frames | `127.0.0.1` |
| `--listen-port` | Local decoder input | `39538` |
| `--target-ip` | Host receiving reconstructed VMC | `127.0.0.1` |
| `--allow-target-port PORT` | Permit an embedded Godot destination; may be repeated | unrestricted if omitted |
| `--target-port PORT` | Fallback only for legacy route-free version-1 frames | none |
| `--accept-avatar NAME` | Convert only frames carrying this avatar name | all avatars |
| `--avatar NAME` | Override the avatar name in emitted VMC metadata | unchanged |
| `--verbose` | Print detailed activity | disabled |

Normal Bmc operation does not require `--target-port`, because routed version-2 and version-4 frames already contain the Godot destination.

# Test and diagnose

With Godot listening on `39539` and the decoder running on `39538`, evaluate this in SuperCollider:

```supercollider
Bmc.sendCalibrationFrame;
```

The decoder's verbose output should report a received frame and a VMC transmission to `127.0.0.1:39539`. Ishidomaru should react in Godot.

If startup reports `Address already in use`, find the existing listener:

```bash
lsof -nP -iUDP:39538
```

Only one decoder should listen on `39538`.

# Cheat-sheet

Start the globally available decoder with all default settings:

```bash
BunrakuOSCDecoder
```

This starts `BunrakuOSCDecoder` with these defaults:

- Bunraku frame input from Bmc: `127.0.0.1:39538`
- VMC destination host: `127.0.0.1`
- Avatar-name override: none; the decoder preserves the avatar name carried by each Bmc frame
- VMC destination port: read from each routed version-2 or version-4 frame; default Bmc startup frames for Ishidomaru carry port `39539`
- Legacy version-1 fallback port: none

This works if you have installed a globally accessible script according to the instructions above.

# Test the decoder from SuperCollider

Run the following to test that SuperCollider can send animations to Godot.  In detail, this tests that animations sent by SuperCollider are translated by BunrakuOSCDecoder and that they can drive the demo project `Seed_2_Ishidomaru_C` in Godot.

After starting `BunrakuOSCDecoder`, recompile the SuperCollider class library and evaluate:

```supercollider
~test = Bmc.testBunrakuOSCDecoder;
```

The test sends complete routed Bunraku protocol-version-2 frames directly to the decoder's default input port `39538` at 60 frames per second for 60 seconds. Every frame embeds Ishidomaru's default Godot VMC destination port `39539`. The default `rest` pose uses a known-good complete VMC transform snapshot previously captured from XR-Animator. Its absolute hips translation is normalized to `(0, 1, 0)` so the avatar remains visible on the project stage. Because the recorded source had an unusually compressed and bent torso chain, the diagnostic pose substitutes Ishidomaru-derived vertical offsets for the spine, chest, neck, and head and gives those four bones upright rotations. The validated limb transforms remain unchanged. The test gently moves only the root position. With `BunrakuOSCDecoder --verbose`, the decoder should report received frames and VMC output to `127.0.0.1:39539`; if Godot is running, Ishidomaru should move.

Stop the test before 60 seconds have elapsed with:

```supercollider
~test.stop;
```

If no arguments are supplied, `Bmc.testBunrakuOSCDecoder` sends to decoder input port `39538`, embeds Ishidomaru's current default avatar port `39539`, runs at `60` frames per second, and stops after `60` seconds:

```supercollider
~test = Bmc.testBunrakuOSCDecoder;
```

Optional arguments specify, in order, the decoder input port, the destination avatar's Godot/VMC port, the frame rate, the duration in seconds, and the test pose. Any omitted argument uses the following default:

| Argument | Default | Meaning |
|---|---:|---|
| Decoder input port | `39538` | Port on which `BunrakuOSCDecoder` receives routed frames from SuperCollider |
| Avatar VMC port | `Bmc.defaultAvatar.vmcPort` | Godot VMC tracker destination embedded in each routed frame; currently `39539` for Ishidomaru |
| Frame rate | `60` | Number of synthetic test frames sent per second |
| Duration | `60.0` | Test duration in seconds |
| Pose | `\rest` | Known-good complete VMC reference pose; use `\calibration` for the older generic calibration frame |

The effective method signature is:

```text
Bmc.testBunrakuOSCDecoder(inputPort = 39538, avatarPort = Bmc.defaultAvatar.vmcPort, frameRate = 60, duration = 60.0, pose = \rest)
```

```supercollider
~test = Bmc.testBunrakuOSCDecoder(39538, 39539, 60, 60);
```

The second argument is embedded in every routed test frame. For example, to test an avatar whose Godot VMC tracker listens on port `39540` while keeping the decoder on `39538`:

```supercollider
~test = Bmc.testBunrakuOSCDecoder(39538, 39540, 60, 60);
```

If the avatar port is omitted or `nil`, the test uses the VMC port of `Bmc.defaultAvatar`.

## Choose the test pose

The default rest pose is intended for ordinary visual inspection. It is a complete reference frame captured from valid XR-Animator output, including the source coordinate conventions expected by the Godot VMC tracker:

```supercollider
~test = Bmc.testBunrakuOSCDecoder(pose: \rest);
```

The older generic calibration pose remains available for comparison. It uses approximate generic body dimensions rather than Ishidomaru's measured proportions.

```supercollider
~test = Bmc.testBunrakuOSCDecoder(pose: \calibration);
```

Godot's imported `Skeleton3D` rest transforms cannot be copied directly into VMC messages: the VMC tracker performs an additional source-to-XR coordinate conversion while retargeting. Applying imported Godot rest transforms as if they were VMC input therefore distorts the avatar.

Both modes test the same SuperCollider-to-decoder-to-Godot transport and routing path. The `rest` mode is the reliable visual test; `calibration` is retained for protocol comparison.
