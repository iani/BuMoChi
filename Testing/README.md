# Bunraku pipeline tests

This folder contains the portable components needed to test the complete
XR Animator–Bunraku–SuperCollider–Godot pipeline one stage at a time.

## Components

- `BunrakuOSCEncoder.py` receives standard VMC from XR Animator and emits one
  `/bunraku/vmc/frame` OSC message per animation frame.
- `BunrakuOSCDecoder.py` receives Bunraku frames and recreates standard VMC for
  an unmodified Godot VMC project.
- `GodotVMCReference/` is the canonical Godot XR VMC Tracker demo. It listens
  for standard VMC on UDP port `39539`.
- `BunrakuPipelineTests.scd` contains the SuperCollider receiver, inspection,
  playback, synthetic-pose, and forwarding helpers.
- `pipeline_test_sender.py` is a camera-free diagnostic source.
- The lower-case Python modules are implementation/support files and should
  remain beside the two command-line scripts.

Open a terminal in this `Testing` folder before running the commands below.

## Test 0 — local reference control

Purpose: prove that the Godot project and local VMC receiver work before using
XR Animator.

Configuration:

- Godot VMC input: UDP `39539`
- Test sender output: `127.0.0.1:39539`

Run:

1. Open `GodotVMCReference/project.godot` in Godot and run the project.
2. In this folder, run:

   ```sh
   python3 pipeline_test_sender.py --format vmc --target-port 39539
   ```

Pass: the avatar moves for approximately five seconds and Godot remains stable.

## Test 1 — XR Animator to Godot

Purpose: establish that XR Animator's native VMC output drives the canonical
Godot project without any Bunraku component.

Configuration:

- XR Animator VMC destination: `127.0.0.1:39539` when both programs run on the
  same computer; otherwise use `GODOT_COMPUTER_IP:39539`.
- Godot VMC input: UDP `39539`.

Run:

1. Start the Godot reference project.
2. Start XR Animator and load the intended avatar/tracking setup.
3. Enable XR Animator VMC output.
4. Move the hips, head, both arms, and both legs separately.
5. Continue for at least 60 seconds.

Pass: Godot follows every tested region without persistent freezing or limb
swaps. If this fails, stop and correct XR Animator, firewall, address, port, or
Godot configuration before Test 2.

## Test 2 — XR Animator through OSCGroups to Godot

Purpose: test VMC encoding, OSCGroups transport, decoding, and rendering while
bypassing SuperCollider.

XR/encoder computer configuration:

- XR Animator output: `127.0.0.1:39538`
- Encoder input: `39538`
- Encoder output: local OSCGroups transmit port `22244`

Run on the XR/encoder computer:

```sh
python3 BunrakuOSCEncoder.py \
  --listen-port 39538 --target-port 22244 \
  --avatar "BunrakuTestAvatar" --source "xr-machine" --verbose
```

Godot/decoder computer configuration:

- OSCGroups receive client local output: `39538`
- Decoder input: `39538`
- Decoder VMC output: `127.0.0.1:39539`

Run on the Godot/decoder computer:

```sh
python3 BunrakuOSCDecoder.py \
  --listen-port 39538 --target-port 39539 \
  --accept-avatar "BunrakuTestAvatar" --verbose
```

Pass: encoder `received` equals `sent`, decoder `received` equals `sent`, all
error counters remain zero, and Godot follows the performer for 60 seconds.

## Test 3 — SuperCollider to Godot

Purpose: test SuperCollider frame construction or playback, decoding, and
rendering without XR Animator or OSCGroups.

Configuration:

- SuperCollider Bunraku output: `127.0.0.1:39538`
- Decoder input: `39538`
- Godot VMC input: `39539`

Run the decoder:

```sh
python3 BunrakuOSCDecoder.py --listen-port 39538 --target-port 39539 --verbose
```

Then evaluate `BunrakuPipelineTests.scd` in SuperCollider and evaluate:

```supercollider
~playBunrakuTestPose.();
```

After that succeeds, recorded Avatar material can be tested with:

```supercollider
~playLegacyToGodot.(Avatar.default.messages, 30);
```

Pass: the decoder rejects no frame and Godot displays the synthetic or recorded
movement for the expected duration.

## Test 4 — complete XR Animator to OSCGroups to SC to Godot chain

Purpose: test the complete capture, network, SuperCollider processing, VMC
reconstruction, and rendering path.

Configuration:

- XR Animator: `127.0.0.1:39538`
- Encoder: `39538 -> 22244`
- OSCGroups receiver on SC computer: local output `57130`
- SuperCollider input: `57130`
- SuperCollider output: `127.0.0.1:39538`
- Decoder: `39538 -> 39539`
- Godot input: `39539`

Run the encoder and decoder using the Test 2 commands. Evaluate
`BunrakuPipelineTests.scd`, then enable forwarding:

```supercollider
~bunrakuForwardToGodot = true;
```

Inspect the live skeleton:

```supercollider
~bunrakuPostBone.(\Head);
~bunrakuPostGroup.(\leftArm);
~bunrakuFrameCount;
~bunrakuMissingFrameCount;
```

Pass: Godot follows the performer; frames are inspectable in SuperCollider;
decoder error counters remain zero; and `~bunrakuMissingFrameCount` remains
zero during a stable network run.

## Port summary

| UDP port | Use |
|---:|---|
| `39538` | XR-to-encoder input, or SC-to-decoder input |
| `22244` | Encoder-to-OSCGroups local input |
| `57130` | OSCGroups-to-SuperCollider input |
| `39539` | Standard VMC input to Godot |

Two listeners cannot use the same port on the same computer. The repeated use
of `39538` assumes the relevant components are on separate machines or are used
in different tests.
