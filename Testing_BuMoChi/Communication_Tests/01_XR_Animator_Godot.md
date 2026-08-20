# Test 1 — XR Animator → Godot

## Purpose

Confirm that XR Animator's native VMC output can animate the canonical Godot
project without the Bunraku encoder, OSCGroups, or SuperCollider. This is the
control test for the rest of the pipeline.

## Signal path

`XR Animator --VMC--> Godot`

## Port configuration

| Component | Setting |
|---|---|
| XR Animator VMC destination | `127.0.0.1:39539` |
| Godot VMC input | UDP `39539` |

If XR Animator and Godot run on different computers, replace `127.0.0.1` with
the Godot computer's local network address and allow UDP `39539` through its
firewall.

## Procedure

1. Open `../GodotVMCReference/project.godot` in Godot and run the project.
2. Start XR Animator and load the intended avatar and tracking setup.
3. Configure XR Animator's VMC output for `127.0.0.1`, port `39539`.
4. Enable VMC output.
5. Move the hips, head, both arms, and both legs separately.
6. Continue moving for at least 60 seconds.

## Pass criteria

- Godot follows every visible body region responsively.
- There is no persistent freezing, limb swapping, or progressive delay.
- Godot remains stable for at least 60 seconds.

If this test fails, do not continue to Test 2. Check the destination address,
port, macOS firewall, XR Animator VMC output, and Godot project first.

## Optional camera-free check

To test Godot without XR Animator, open a terminal in `Testing` and run:

```sh
python3 pipeline_test_sender.py --format vmc --target-port 39539
```

The avatar should move for approximately five seconds.

## Shutdown

Disable XR Animator VMC output and stop the running Godot project.

