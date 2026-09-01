
# Introduction

This document shows how to sonify playback of an existing movement clip and optionally record the resulting sound. The parameters needed are:

1. The name of the clip to record. 
2. The code of the synth processes and their mapping to particular parameters.
3. Whether the sound should be recorded to disk.

# Recording process, sound cues for starting and stopping.

The initial configuration of this method includes some automation and sound cues to help one synchronize the start and end of the recording while being away from the keyboard.  The recording process is as follows: 

## 1. Specifying the clip, interaction, and sound synthesis parameters

Use `Bmc.sonifyTake`:

```supercollider
Bmc.sonifyTake(
    \ishidomaru1,
    ~sonification,
    record: true
);
```

The first argument names an existing Bmc clip. The second can be one `BmcLiveSonification`, an array of them, or an advanced setup function. `record` defaults to `false`; set `record: true` to record the server output. `playerName` defaults to `\default`. Recorded takes use a dedicated directory below the persistent `Bmc.videoRecordingFolder` and a shared `YYMMDDHHMMSS` basename for their audio and `.scd` metadata files. Use `Bmc.videoRecordingFolder_(path)` or `Bmc.chooseVideoRecordingFolder` to place recordings on an external disk. Add `screenCapture: true` to record a matching MP4 through FFmpeg. The default is FFmpeg's `Capture screen 0`, normally the first/main macOS display, so the Godot animation must be visible there. Afterward, FFmpeg incorporates the WAV into the MP4 and trims the longer stream to the shorter duration. See [RecordingAudioAndVideo.md](RecordingAudioAndVideo.md).

The optional `loop`, `rate`, `startFrame`, and `endFrame` arguments configure the recorded playback range:

```supercollider
Bmc.sonifyTake(
    \ishidomaru1,
    ~sonification,
    record: true,
    screenCapture: true,
    rate: 0.5,
    startFrame: 120,
    endFrame: 840
);
```

## 2. Issuing the recording command. 

The user issues the command with the clip and sound-synthesis algorithms. If recording is enabled, the server recorder is prepared and started before the synchronization countdown.

## 3. Starting the movement recording. Countdown

The synchronization pattern plays degrees 0 through 4 twice, followed by a final degree 7 cue. Animation playback starts exactly with the final degree 7. The mapped sonification begins when that final cue has completed.

## 4. Automatic stop at the end of clip playback

The sonification processes stop at the end of the animation clip. When `record: true`, disk recording stops at the same end event. The recorded file therefore contains the complete countdown followed by sound through the clip's final frame.

## Implementation and exact synchronization timing

The countdown and synchronization are implemented in [`BmcTakeSonifier.start`](../../../Classes/Bmc/BmcTakeSonifier.sc), rather than repeated in each rehearsal script. The countdown player is created there with:

```supercollider
countdownPlayer = Pbind(
    \degree, Pseq([Pseq((0..4), 2), 7]),
    \legato, 0.25
).play;
```

The timing sequence is:

1. If `record: true`, server recording is prepared and started.
2. The first of the ten scale countdown notes starts immediately.
3. After `10.wait`, animation playback starts exactly on the onset of the final degree 7 cue.
4. After that cue's one-beat duration, the requested sonification processes start.
5. When clip playback ends, the sonification processes and server recording stop automatically.

Thus recording includes the complete countdown as well as sound through the animation clip. With `record: false`, the synchronization is unchanged, but no sound file is recorded.

The take may also be controlled manually:

```supercollider
Bmc.stopTake;    // stop playback, sound, countdown, and optional recording
Bmc.cancelTake;  // cancel a pending countdown or active take
Bmc.takeStatus;  // inspect clip, player, countdown/playback, and recording state
```

# Specification of sound synthesis and interaction algorithms

Each `BmcSonificationMapping` connects one frame value to one Synth control. It specifies:

1. a bone;
2. one transform component (`\x`, `\y`, `\z`, `\qx`, `\qy`, `\qz`, or `\qw`);
3. the Synth control to change;
4. the expected movement range;
5. the output control range; and
6. whether to follow the absolute value or its signed rate of change.

For example, this Synth uses hips position for pitch and right-hand vertical speed for amplitude:

```supercollider
SynthDef(\rehearsalSine, { |out = 0, freq = 220, amp = 0|
    var signal = SinOsc.ar(freq.lag(0.05)) * amp.lag(0.08);
    Out.ar(out, signal.dup);
}).add;

~sonification = BmcLiveSonification(
    \rehearsalSine,
    [
        BmcSonificationMapping.absolute(
            \Hips, \x, \freq,
            [-0.5, 0.5],
            [110, 880]
        ),
        BmcSonificationMapping.rate(
            \RightHand, \y, \amp,
            [-2.0, 2.0],
            [0.0, 0.2]
        )
    ]
);

Bmc.sonifyTake(\ishidomaru1, ~sonification, record: true);
```

The ranges apply a linear mapping and clip to the output range by default. Pass `clip: false` to allow values beyond that range. Rate mappings calculate units per second from consecutive received frames. The first frame has a rate of zero.

## Using several simultaneous synthesis processes

Pass an array when one movement stream should control several Synths. Each specification creates its own Synth and frame dependency. All are stopped automatically with the take:

```supercollider
~rehearsalSounds = [
    BmcLiveSonification(\rehearsalSine, [
        BmcSonificationMapping.absolute(
            \Hips, \x, \freq, [-0.5, 0.5], [110, 880]
        )
    ]),
    BmcLiveSonification(\rehearsalNoise, [
        BmcSonificationMapping.rate(
            \Head, \qz, \brightness, [-1.5, 1.5], [200, 6000]
        )
    ])
];

Bmc.sonifyTake(\ishidomaru1, ~rehearsalSounds, record: true);
```

The referenced SynthDefs must be added before issuing the rehearsal command.

## Custom setup functions

For algorithms that need patterns, buffers, several related nodes, or custom frame processing, pass a function. It receives the player, clip name, and player name, and must return either a cleanup function or an object responding to `free`:

```supercollider
~customSound = { |player, clipName, playerName|
    var synth = Synth(\myCustomSynth);
    var controller = SimpleController(player);

    controller.put(\frame, { |model, event, frameIndex, message|
        var frame = BmcFrame.fromOSC(message);
        synth.set(\freq, frame.pose[\Head].y.linexp(-0.2, 0.2, 100, 2000));
    });

    {
        controller.remove;
        synth.free;
    }
};

Bmc.sonifyTake(\ishidomaru1, ~customSound, record: true);
```

This hook is intentionally open-ended. The mapping classes cover the common one-parameter-to-one-control case without preventing more elaborate sonification code.
