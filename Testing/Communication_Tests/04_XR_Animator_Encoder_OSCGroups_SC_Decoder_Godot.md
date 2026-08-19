# Test 4 — XR Animator → Encoder → OSCGroups → SC → Decoder → Godot

## Purpose

Test the complete live pipeline: capture, frame encoding, network transport,
SuperCollider reception and processing, VMC reconstruction, and rendering.

## Signal path

`XR Animator → BunrakuOSCEncoder → OSCGroups → SuperCollider → BunrakuOSCDecoder → Godot`

## Single-Mac port configuration

| Component | Input | Output |
|---|---:|---:|
| XR Animator | — | `127.0.0.1:39538` |
| BunrakuOSCEncoder | `39538` | `127.0.0.1:22244` |
| OSCGroups sender client | `22244` | network |
| OSCGroups receiver client | network | `127.0.0.1:57130` |
| SuperCollider | `57130` | `127.0.0.1:39537` |
| BunrakuOSCDecoder | `39537` | `127.0.0.1:39539` |
| Godot | `39539` | — |

Test 4 uses decoder input `39537` so it does not collide with the encoder on
`39538` or SuperCollider on `57130`.

## Procedure

1. Start `../GodotVMCReference/project.godot` in Godot.
2. Start the OSCGroups sending client:

   ```sh
   OscGroupClient 165.22.82.70 22242 22246 22244 22245 iani 12345 skeletonTest test123
   ```

3. Start the OSCGroups receiver client, forwarding to SuperCollider port
   `57130`. Its client name and private local ports must not conflict with the
   sender:

   ```sh
   OscGroupClient 165.22.82.70 22242 22546 22544 57130 iannisVMC 12345 skeletonTest test123
   ```

4. Start the decoder in a terminal opened in `Testing`:

   ```sh
   python3 BunrakuOSCDecoder.py \
     --listen-port 39537 \
     --target-port 39539 \
     --accept-avatar "BunrakuTestAvatar" \
     --verbose
   ```

5. Open `../BunrakuPipelineTests.scd` in SuperCollider and evaluate its entire
   parenthesized setup block. It opens port `57130` and starts the receiver.
6. Change the decoder destination for this test and enable forwarding:

   ```supercollider
   ~bunrakuGodotAdapter = NetAddr("127.0.0.1", 39537);
   ~bunrakuForwardToGodot = true;
   ```

7. Start the encoder:

   ```sh
   python3 BunrakuOSCEncoder.py \
     --listen-port 39538 \
     --target-port 22244 \
     --avatar "BunrakuTestAvatar" \
     --source "xr-animator" \
     --verbose
   ```

8. Configure XR Animator to send VMC to `127.0.0.1:39538`, then enable output.
9. Move all body regions for at least 60 seconds.

## Inspect the live frame in SuperCollider

Evaluate these expressions individually:

```supercollider
~bunrakuPostBone.(\Head);
~bunrakuPostGroup.(\leftArm);
~bunrakuPostGroup.(\upperBody);
~bunrakuFrameCount;
~bunrakuMissingFrameCount;
~bunrakuLatest;
```

The `bones` dictionary in `~bunrakuLatest` provides named access to each set of
seven values: position `x, y, z` and quaternion `qx, qy, qz, qw`.

## Pass criteria

- Godot follows the performer responsively for at least 60 seconds.
- Encoder and decoder `sent` counters continually increase.
- Encoder `dropped` and decoder `rejected` remain zero.
- `~bunrakuFrameCount` increases in SuperCollider.
- `~bunrakuMissingFrameCount` remains zero during a stable network run.
- Individual bones and body groups can be inspected in SuperCollider.

## Common failures

- **SuperCollider cannot open `57130`:** run
  `lsof -nP -iUDP:57130`. Stop the old process or assign a different matching
  OSCGroups output and SuperCollider input port.
- **SuperCollider receives nothing:** confirm that the receiver client's final
  port is `57130`, then use `OSCFunc.trace(true, true)` temporarily.
- **Decoder receives nothing:** confirm forwarding is true and
  `~bunrakuGodotAdapter` targets `39537`.
- **Decoder rejects packets:** it should receive only
  `/bunraku/vmc/frame` messages from SuperCollider, not OSCGroups control or
  raw VMC messages.
- **Godot receives nothing:** confirm decoder output and Godot input are both
  `39539`.

## Shutdown

Evaluate:

```supercollider
~bunrakuForwardToGodot = false;
~stopBunrakuReceiver.();
```

Then disable XR Animator output, press Control-C in the encoder and decoder
terminals, stop both OSCGroups clients, and stop the Godot project.

