# 07 Movement to Sound

**Goal:** one number from your body controls one property of a sound. Then two.

Turn your volume down before you begin.

## Step 1. Start the sound engine

```supercollider
s.boot;
```

Wait until the status numbers at the bottom right of the SuperCollider window turn green.

## Step 2. Define an instrument

This is a plain sine tone with three controls: pitch (`freq`), loudness (`amp`), and left-right position (`pan`). Run the block once.

```supercollider
(
SynthDef(\workshopTone, { |out = 0, freq = 220, amp = 0.05, pan = 0|
    var signal = SinOsc.ar(freq.lag(0.1));
    Out.ar(out, Pan2.ar(signal * amp.lag(0.1), pan.lag(0.1)));
}).add;
)
```

`.lag(0.1)` smooths each control slightly so that the jitter of the tracker does not become crackle.

## Step 3. Connect your body to it

A **mapping** says: take this number from this bone, expect it in this range, and turn it into that range for this control.

```supercollider
(
~sound = BmcLiveSonification(
    \workshopTone,
    [
        BmcSonificationMapping.absolute(
            \Hips, \x, \freq,
            [-0.5, 0.5],     // expected input: half a metre left to half a metre right
            [110, 880]       // output: pitch in Hz
        )
    ],
    [\amp, 0.05]
).start;
)
```

Make sure the camera is driving the character (`Bmc.cameraTarget_(\Ishidomaru);`), then step slowly from side to side. The pitch follows your hips.

Stop the sound:

```supercollider
~sound.stop;
```

**If the pitch sticks at the top or bottom,** your movement is outside the input range. Widen the range, for example `[-1, 1]`, and run the block again.

## Step 4. Two mappings

Add the turning of your head to the stereo position. Run the block; it replaces the previous sound.

```supercollider
(
~sound !? { ~sound.stop };
~sound = BmcLiveSonification(
    \workshopTone,
    [
        BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
        BmcSonificationMapping.absolute(\Head, \qy, \pan, [-0.7, 0.7], [-1, 1])
    ],
    [\amp, 0.05]
).start;
)
```

## Step 5. Speed instead of position

`absolute` follows where a bone is. `rate` follows how fast it is changing. Here the tone is silent while you are still and grows louder the faster your hips rise or fall:

```supercollider
(
~sound !? { ~sound.stop };
~sound = BmcLiveSonification(
    \workshopTone,
    [
        BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
        BmcSonificationMapping.rate(\Hips, \y, \amp, [0, 1.5], [0, 0.2])
    ]
).start;
)
```

Bend your knees quickly, then slowly. (With this range only upward movement sounds. Use `[-1.5, 1.5]` and `[0, 0.2]` and listen to the difference.)

```supercollider
~sound.stop;
```

## Which numbers are worth listening to?

| Bone and component | What it follows | Typical range |
|---|---|---|
| `\Hips, \x` | Stepping left and right | `[-0.5, 0.5]` |
| `\Hips, \y` | Crouching and rising | about `[0.4, 1.6]` |
| `\Hips, \z` | Stepping towards and away from the camera | `[-0.5, 0.5]` |
| `\Head, \qy` | Turning the head left and right | `[-0.7, 0.7]` |
| `\Head, \qz` | Tilting the head to the shoulder | `[-0.7, 0.7]` |
| `\Chest, \qy` | Twisting the upper body | `[-0.5, 0.5]` |
| `\LeftHand, \qx` | Turning the left hand | `[-0.7, 0.7]` |

**Use rotations (`qx`, `qy`, `qz`) for arms, hands, and head.** In this data format a limb's position is usually measured from its parent bone, so it hardly changes even when the hand travels a long way. The hips are the exception: their position is your position in the room.

The ranges are starting points. Bodies, cameras, and rooms differ; adjust by ear.

## Step 6. Sonify a recorded clip

The same kind of sonification can follow a clip instead of the live camera. Build it without `.start` and hand it to `Bmc.sonifyTake`:

```supercollider
(
~clipSound = BmcLiveSonification(
    \workshopTone,
    [
        BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
        BmcSonificationMapping.absolute(\Head, \qy, \pan, [-0.7, 0.7], [-1, 1])
    ],
    [\amp, 0.05]
);
Bmc.stopCameraAnimation;
Bmc.sonifyTake(\take1, ~clipSound);
)
```

You hear a short count-in melody; the clip and its sound start together on the last note. When the clip ends, the sound stops by itself.

```supercollider
Bmc.stopTake;                                           // stop early
Bmc.sonifyTake(\take1, ~clipSound, record: true);       // also record the sound to a file
Bmc.sonifyTake(\hybrid, ~clipSound, rate: 0.5);         // another clip, half speed
```

Because the clip is always the same, you can now refine a mapping patiently: change one range, run it again, compare.

## Checkpoint

You have controlled pitch with your hips live, and you have heard a recorded clip play with its own sound.

## Try it

- Replace `SinOsc.ar(freq.lag(0.1))` in the instrument with `Saw.ar(freq.lag(0.1))` or `Pulse.ar(freq.lag(0.1))` and run the SynthDef block again.
- Map the same bone to two controls at once. Does a single movement that changes two things feel more or less like an instrument?
- More instruments and worked examples: [Sonification Guide](../HelpByTopic/Sonification/Sonification_Guide.md) and the `LeftHandSound` files beside it.

Next: [08 Make a Short Study](08%20Make%20a%20Short%20Study.md)
