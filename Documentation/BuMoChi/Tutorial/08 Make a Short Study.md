# 08 Make a Short Study

**Goal:** a 30–60 second study of your own, to show to the group.

You now have every technique you need. A study is small on purpose: one idea, a few clips, one sound.

## A constraint to start from

Pick one. Constraints make the work easier, not harder.

1. **Echo.** A clip of yourself plays; you move live against it in sound only, or on the second character.
2. **Borrowed limbs.** A character whose arms and legs come from two different moments, or two different people. Swap clips with your neighbour.
3. **Slow instrument.** One clip at `rate: 0.1`, sonified, so that a two-second gesture becomes a twenty-second sound.
4. **Loop study.** Three very short loops of the same take (different `startFrame` and `endFrame`), played one after another.
5. **Orbit.** A simple standing gesture, carried through space by a position modifier that you change while it plays.

## A working method

1. **Record** two or three takes of five to ten seconds. Name them so that you will recognize them.
2. **Listen and look.** Play each on a loop. Which two seconds are the interesting ones? Note their frame numbers.
3. **Choose one sound mapping** from chapter 07 and tune its ranges on the clip, using `Bmc.sonifyTake`.
4. **Write a score:** a short list of lines in the order you will run them. Performing a study means running those lines one at a time.
5. **Rehearse** twice, then show it.

## A score template

Copy this into a new SuperCollider document, replace the names with your own, and run it one line or block at a time. The lines beginning `//:` are just headings for you.

```supercollider
//: 0. Prepare (before the audience watches)
s.boot;
Bmc.stopCameraAnimation;

//: 1. Opening: the slow version
Bmc.play(\take1, loop: true, rate: 0.25);

//: 2. Add the sound
(
~sound = BmcLiveSonification(
    \workshopTone,
    [
        BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
        BmcSonificationMapping.absolute(\Head, \qy, \pan, [-0.7, 0.7], [-1, 1])
    ],
    [\amp, 0.05]
).start(Bmc.player, \frame);
)

//: 3. Full speed, borrowed arms
Bmc.play(\hybrid, loop: true);

//: 4. Carry it away
(
~start = SystemClock.seconds;
Bmc.addPositionModifier(\orbit, \Ishidomaru, { |time|
    var angle = (time - ~start) * 2pi / 8;
    [angle.cos * 0.5, nil, angle.sin * 0.5]
});
)

//: 5. End
(
~sound.stop;
Bmc.clearModifiers;
Bmc.stopPlayback;
)
```

Section 2 uses `.start(Bmc.player, \frame)`. This makes the sound follow whatever the default clip player is playing, and keep following when you switch to another clip in section 3. Plain `.start` (as in chapter 07) follows the live camera instead.

## Showing your work

- Put the Godot window where everyone can see it and your code where you can see it.
- Say in one sentence what your constraint was. Then perform without commentary.
- Mistakes on stage are normal in live coding. Cmd-Period, breathe, run the next line.

## Where to go next

| If you want to... | Read |
|---|---|
| Understand the vocabulary properly | [Glossary](../HelpByTopic/Glossary.md) |
| See every `Bmc` command | [Bmc method reference](../Bmc%20method%20reference.md) |
| Go deeper into sound | [Sonification Guide](../HelpByTopic/Sonification/Sonification_Guide.md) |
| Record sound and video of a take | [Recording audio and screen video](../HelpByTopic/RecordingAudioAndVideo.md) |
| Switch the camera between characters | [Controlling avatars from a camera](../HelpByTopic/ControllingAvatarsFromCamera.md) |
| Perform with other people over the network | [Multi-user setup](../HelpByTopic/SetupInstructions/MultiUserSetup.md) |
| Use your own Godot scenes and characters | [Working with Godot projects](../HelpByTopic/WorkingWithGodotProjects.md) |
| Know why BuMoChi exists | [Why BuMoChi?](../HelpByTopic/WhyBuMoChi.md) |

Next: [09 Troubleshooting and Cheat Sheet](09%20Troubleshooting%20and%20Cheat%20Sheet.md)
