# 05 Record and Play Back Movement

**Goal:** capture your movement as clips, then replay it in different ways.

Before you start, the checkpoint of chapter 03 must pass: Ishidomaru follows you live.

## Step 1. Record a take

Decide on about five seconds of movement. Run the first line, move, then run the second line.

```supercollider
Bmc.record(\take1);
```

```supercollider
Bmc.stopRecording;
```

`\take1` is the name of the clip. Choose any name you like, without spaces. When you stop, the clip is kept in memory and also saved to disk automatically.

Look at what you have:

```supercollider
Bmc.listClips;
Bmc.clip(\take1).duration;
Bmc.clip(\take1).size;
```

`duration` is in seconds; `size` is the number of frames.

**If the clip has 0 frames,** no data was arriving. Check that the `received` number in the monitor window was climbing while you recorded.

## Step 2. Silence the camera

While a clip plays, the live camera would fight it for control of the character. Tell BuMoChi to ignore the camera for now:

```supercollider
Bmc.stopCameraAnimation;
```

Ishidomaru stops following you. (Switching VMC output off in XR-Animator has the same effect.)

## Step 3. Play

```supercollider
Bmc.play(\take1);
```

Ishidomaru repeats your movement. Now try the transport controls, one line at a time:

```supercollider
Bmc.play(\take1, loop: true);
Bmc.pause;
Bmc.resume;
Bmc.stopPlayback;
```

## Step 4. Change time

```supercollider
Bmc.play(\take1, loop: true, rate: 0.5);   // half speed
Bmc.play(\take1, loop: true, rate: 2);     // double speed
Bmc.play(\take1, loop: true, rate: 0.1);   // very slow
```

Play only a part of the clip by naming a start and end frame. At about 60 frames per second, frames 60 to 180 are roughly the second and third seconds:

```supercollider
Bmc.play(\take1, loop: true, startFrame: 60, endFrame: 180);
```

A short loop of a few frames turns a gesture into a tic or a vibration:

```supercollider
Bmc.play(\take1, loop: true, startFrame: 100, endFrame: 112);
```

Stop:

```supercollider
Bmc.stopPlayback;
```

The clip itself is never changed by any of this. Speed, loop, and range belong to the playback, not to the recording.

## Step 5. Give the body back to the camera

```supercollider
Bmc.cameraTarget_(\Ishidomaru);
```

Ishidomaru follows you again.

## Step 6. Record two more takes

You will need them in the next chapter. Make them clearly different from each other:

- `\legTake`: walk, step, or shift your weight, with your arms hanging still.
- `\armTake`: stand still and move only your arms, large and clear.

```supercollider
Bmc.record(\legTake);
Bmc.stopRecording;
```

```supercollider
Bmc.record(\armTake);
Bmc.stopRecording;
```

## Checkpoint

`Bmc.listClips;` shows `take1`, `legTake`, and `armTake`, each with more than zero frames, and you can play each of them.

## A window instead of typing

```supercollider
Bmc.showClips;
```

opens a list of clips with a **Play selected** button.

## Try it

- Record ten seconds of standing as still as you can. Play it at `rate: 4`. What is stillness made of?
- Loop a clip and watch the jump from the last frame back to the first. Can you record a movement that ends where it begins?

Next: [06 Compose Movement](06%20Compose%20Movement.md)
