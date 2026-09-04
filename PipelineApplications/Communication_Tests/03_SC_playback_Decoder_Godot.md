# Test 3 — SuperCollider playback → Decoder → Godot

## Purpose

Test SuperCollider frame construction or recorded mocap-clip playback,
Bunraku-to-VMC decoding, and Godot rendering without XR Animator or OSCGroups.

## Signal path

`SuperCollider → BunrakuOSCDecoder → Godot`

## Port configuration

| Component | Input | Output |
|---|---:|---:|
| SuperCollider | — | `127.0.0.1:39538` |
| BunrakuOSCDecoder | `39538` | `127.0.0.1:39539` |
| Godot | `39539` | — |

## Procedure A — deterministic synthetic pose

1. Start `../GodotVMCReference/project.godot` in Godot.
2. In a terminal opened in `Testing`, start the decoder:

   ```sh
   python3 BunrakuOSCDecoder.py \
     --listen-port 39538 \
     --target-port 39539 \
     --verbose
   ```

3. Open `../BunrakuPipelineTests.scd` in SuperCollider and evaluate its entire
   parenthesized setup block.
4. Evaluate:

   ```supercollider
   ~playBunrakuTestPose.();
   ```

The avatar should perform a deterministic movement for approximately five
seconds.

## Procedure B — recorded Bunraku Clip

After Procedure A succeeds, load the SuperCollider file that defines your
recorded-Bunraku playback helper and ensure its destination is
`NetAddr("127.0.0.1", 39538)`. Then play the full Clip recording with:

```supercollider
~playRecordedBunraku.(OscRecorder.default.recordedData);
```

Use `recordedData`, not `data`: `data` contains only the current output file and
is reset whenever `OscRecorder` opens a new file.

For older recordings in the legacy Avatar message layout, the compatibility
helper in `BunrakuPipelineTests.scd` can be used:

```supercollider
~playLegacyToGodot.(Avatar.default.messages, 30);
```

## Pass criteria

- The synthetic pose animates Godot for its expected duration.
- The decoder's `received` and `sent` counters increase together.
- Decoder `rejected` remains zero.
- Recorded playback reproduces the expected motion and duration.

## Common failures

- **No packets reach the decoder:** confirm the SuperCollider destination port
  is `39538`; `OSCFunc.trace` only traces packets received by SuperCollider,
  not packets it sends.
- **Decoder rejects frames:** inspect the outgoing OSC address. It must be
  `/bunraku/vmc/frame`, protocol version `1`.
- **Playback is empty or incomplete:** check
  `OscRecorder.default.recordedData.size`, then inspect its first and last
  elements.
- **Port unavailable:** run `lsof -nP -iUDP:39538` and stop or reconfigure the
  listed process.

## Shutdown

Stop the SuperCollider Routine if it is still running, press Control-C in the
decoder terminal, and stop the Godot project.

