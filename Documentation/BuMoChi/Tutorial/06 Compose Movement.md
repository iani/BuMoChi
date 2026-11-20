# 06 Compose Movement

**Goal:** build movement that nobody performed, by combining recordings and by writing code.

You need the clips `\legTake` and `\armTake` from chapter 05.

## Part A. One body from two takes

Take the whole of `\legTake`, replace its arms with the arms of `\armTake`, and store the result as a new clip:

```supercollider
Bmc.combineClips(\legTake, \armTake, \arms, \hybrid);
```

The four names are, in order: the base clip, the clip that donates bones, which bones, and the name of the result.

Play it (with the camera silenced):

```supercollider
Bmc.stopCameraAnimation;
Bmc.play(\hybrid, loop: true);
```

The new clip is as long as the base clip. If the donor clip is shorter, the remaining frames keep the base clip's own arms.

Combined clips live only in memory. Save the ones you want to keep:

```supercollider
Bmc.saveClipScd(\hybrid);
```

Other groups you can transplant:

```text
\leftArm  \rightArm  \arms  \leftLeg  \rightLeg  \legs  \torso  \upperBody
```

You can also give a list of single bones:

```supercollider
Bmc.combineClips(\legTake, \armTake, [\Head, \Neck], \otherHead);
```

## Part B. Move the character through space with code

A **position modifier** changes where the character's hips are, on top of whatever movement it is already performing. It works on a playing clip and on the live camera alike.

Shift the character half a metre to one side:

```supercollider
Bmc.addPositionModifier(\aside, \Ishidomaru, [0.5, nil, nil]);
```

The three values are x (sideways), y (height), and z (depth). `nil` means "leave this one alone".

Remove it:

```supercollider
Bmc.removeModifier(\aside);
```

Instead of fixed numbers you can give a function of time. This one carries the character round a circle once every eight seconds while it goes on dancing:

```supercollider
(
~start = SystemClock.seconds;
Bmc.addPositionModifier(\orbit, \Ishidomaru, { |time|
    var angle = (time - ~start) * 2pi / 8;
    [angle.cos * 0.5, nil, angle.sin * 0.5]
});
)
```

Change `8` to make the circle faster or slower, and `0.5` to change its radius, then run the block again: the new version replaces the old one.

Lift the character while keeping its own sideways movement, using the `\add` mode:

```supercollider
Bmc.addPositionModifier(\lift, \Ishidomaru, [0, 0.3, 0], \add);
```

Remove everything:

```supercollider
Bmc.clearModifiers;
Bmc.stopPlayback;
Bmc.cameraTarget_(\Ishidomaru);
```

## Checkpoint

You have played a `\hybrid` clip whose arms and legs come from different takes, and you have made the character travel in a circle.

## Part C (optional). Two characters

Do this part only if time allows; the workshop leader will demonstrate it. One character plays a clip while the other follows you live.

1. Stop the Godot scene and open the project `VMC_2_Avatars` instead. Press Play. You see Mother and Ishidomaru.
2. In this project each character listens on its own port: **Mother on `39539`, Ishidomaru on `39540`**. Tell BuMoChi:

```supercollider
(
Bmc.avatar(\Ishidomaru).vmcPort_(39540);
~mother = Bmc.avatar(\Mother) ?? { Bmc.addAvatar(\Mother, "Mother") };
~mother.vmcPort_(39539);
)
```

3. Play a clip on Mother with a player of her own, and let the camera drive Ishidomaru:

```supercollider
Bmc.play(\hybrid, loop: true, playerName: \motherPlayer, avatarName: \Mother);
Bmc.cameraTarget_(\Ishidomaru);
```

4. Swap the roles: the camera now moves Mother.

```supercollider
Bmc.stopPlayback(\motherPlayer);
Bmc.cameraTarget_(\Mother);
```

5. When you return to the single-character project, put Ishidomaru back on the standard port:

```supercollider
Bmc.cameraTarget_(\Ishidomaru);
Bmc.avatar(\Ishidomaru).vmcPort_(39539);
```

If a character does not react, compare the port numbers above with those in the Godot scene (select each `...VMCTracker` node and read `Udp Listener Port` in the Inspector).

## Try it

- Make a hybrid of a hybrid: add a third take's head to `\hybrid`.
- Combine a clip with itself played from a different point, using the fifth argument `startIndex`: `Bmc.combineClips(\take1, \take1, \arms, \canon, 60);` gives the arms a one-second delay against the body.

Next: [07 Movement to Sound](07%20Movement%20to%20Sound.md)
