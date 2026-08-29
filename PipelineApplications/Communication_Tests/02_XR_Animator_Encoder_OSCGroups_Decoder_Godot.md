# Test 2 — XR Animator → Encoder → OSCGroups → Decoder → Godot

## Purpose

Test VMC-to-Bunraku encoding, OSCGroups transport, Bunraku-to-VMC decoding,
and Godot rendering while bypassing SuperCollider.

## Signal path

`XR Animator → BunrakuOSCEncoder → OSCGroups → BunrakuOSCDecoder → Godot`

## Single-Mac port configuration

| Component | Input | Output |
|---|---:|---:|
| XR Animator | — | `127.0.0.1:39537` |
| BunrakuOSCEncoder | `39537` | `127.0.0.1:22244` |
| OSCGroups sender client | `22244` | network |
| OSCGroups receiver client | network | `127.0.0.1:39538` |
| BunrakuOSCDecoder | `39538` | `127.0.0.1:39539` |
| Godot | `39539` | — |

The separate ports `39537`, `39538`, and `39539` are intentional. Two
processes cannot bind the same UDP port on one Mac.

## Procedure

Open separate Terminal windows in the `Testing` directory for the two Python
programs and the OSCGroups clients.

1. Start the Godot reference project: `../GodotVMCReference/project.godot`.
2. Start the OSCGroups client that sends the data from the OSC encoder to the OSCGroups Server. The known project configuration is:

   ```sh
   OscGroupClient 165.22.82.70 22242 22246 22244 22245 iani 12345 skeletonTest test123
   ```

3. Start a OSCGroups client that receives the data from OSCGroups Server and sends them to the OSC Decoder. Its final local output port is `39538`.
   Its client name and its three private local ports must not conflict with the
   first client. For example:

   ```sh
   OscGroupClient 165.22.82.70 22242 22546 22544 39538 iannisVMC 12345 skeletonTest test123
   ```

4. Start the decoder:

   ```sh
   python3 BunrakuOSCDecoder.py \
     --listen-port 39538 \
     --target-port 39539 \
     --accept-avatar "BunrakuTestAvatar" \
     --verbose
   ```

5. Start the encoder:

   ```sh
   python3 BunrakuOSCEncoder.py \
     --listen-port 39537 \
     --target-port 22244 \
     --avatar "BunrakuTestAvatar" \
     --source "xr-animator" \
     --verbose
   ```

6. Configure XR Animator to send VMC to `127.0.0.1:39537`, then enable output.
7. Move all visible body regions for at least 60 seconds.

## What to observe

- The encoder's `sent` counter continually increases.
- Encoder `dropped` remains zero. `non_skeleton` may increase normally.
- The decoder's `sent` counter continually increases and `rejected` remains
  zero.
- Godot follows the performer responsively.

The current encoder uses a strict complete-update policy: it accumulates bone
updates and emits a frame only after all 21 required bones have been updated.
There is currently no `--hold-last` command-line option.

## Pass criteria

- Godot follows the performer for at least 60 seconds.
- Encoder `sent` and decoder `sent` both keep increasing.
- Encoder `dropped` and decoder `rejected` remain zero.
- There is no persistent freeze or growing delay.

## Common failures

- **Decoder says “not a Bunraku Frame protocol-v1 message”:** the OSCGroups
  receiver is probably forwarding raw VMC or control traffic instead of the
  encoder's `/bunraku/vmc/frame` messages. Verify both clients use the same
  group and that the encoder targets the sender's local input `22244`.
- **Could not bind a port:** another process owns that UDP port. On macOS, use
  `lsof -nP -iUDP:PORT`, replacing `PORT` with the affected number.
- **Encoder reports missing bones:** ensure XR Animator is producing a complete
  tracked skeleton. Use `--log-partial` only temporarily because it is noisy.
- **No animation but counters rise:** confirm the decoder targets `39539` and
  Godot is listening on `39539`.

## Shutdown

Disable XR Animator output, press Control-C in the encoder and decoder
terminals, stop both OSCGroups clients, and stop the Godot project.

