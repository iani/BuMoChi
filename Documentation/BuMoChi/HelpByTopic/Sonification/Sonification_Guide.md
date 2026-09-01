# Sonification guide

BuMoChi sonification turns movement-frame values into controls for SuperCollider Synths. A basic sonification has three parts:

1. a `SynthDef` that produces sound;
2. one or more `BmcSonificationMapping` objects that translate movement values into Synth controls; and
3. a `BmcLiveSonification` that owns the Synth and follows the frames of a playing clip.

Runnable companion examples are in [Sonification_Examples1.scd](Sonification_Examples1.scd).

## A first sonification

First define a Synth:

```supercollider
SynthDef(\bmcGuideTone, { |out = 0, freq = 220, amp = 0.05|
    Out.ar(out, SinOsc.ar(freq.lag(0.05), mul: amp.lag(0.05)).dup);
}).add;
```

Then map the horizontal position of the hips to its frequency:

```supercollider
~sonification = BmcLiveSonification(
    \bmcGuideTone,
    [
        BmcSonificationMapping.absolute(
            \Hips, \x, \freq,
            [-0.5, 0.5],
            [110, 880]
        )
    ],
    [\amp, 0.06]
);

Bmc.sonifyTake(\ishidomaru1, ~sonification);
```

The mapping reads `Hips.x` from each frame. An input value of `-0.5` becomes 110 Hz, `0.5` becomes 880 Hz, and intermediate values are mapped linearly. Values outside the input range are clipped to the output range by default.

The third `BmcLiveSonification` argument is an optional array of initial Synth arguments. It is useful for controls that should not follow movement.

## Absolute values and change rates

An absolute mapping follows the reported transform component itself:

```supercollider
BmcSonificationMapping.absolute(
    \Head, \qy, \pan,
    [-0.7, 0.7],
    [-1.0, 1.0]
)
```

A rate mapping follows its signed rate of change per second:

```supercollider
BmcSonificationMapping.rate(
    \RightHand, \y, \amp,
    [-2.0, 2.0],
    [0.0, 0.16]
)
```

Rate mappings remember the preceding frame value and time. Their first frame produces a rate of zero. Positive and negative rates retain direction; use an input range and Synth design appropriate to whether direction matters.

## Transform components

Mappings currently accept these transform components:

- position: `\x`, `\y`, `\z`;
- quaternion rotation: `\qx`, `\qy`, `\qz`, `\qw`.

The bone and component must exist in the incoming frame. An unknown name produces an error, which helps expose spelling mistakes rather than silently sending an incorrect value.

## Choosing ranges

The input range describes the movement values expected from the selected clip or performer. The output range describes values suitable for the Synth control.

Start with a conservative input range and listen for places where the result remains fixed at one end. That usually means the movement exceeded the chosen range and was clipped. Pass `clip: false` as the last named argument when extrapolation is deliberately wanted:

```supercollider
BmcSonificationMapping.absolute(
    \Hips, \x, \freq,
    [-0.5, 0.5], [110, 880],
    clip: false
)
```

Smoothing such as `freq.lag(0.05)` belongs in the `SynthDef`. This keeps the mapping faithful to the frames while letting each sound process choose its own response character.

## Several controls and several Synths

One `BmcLiveSonification` may contain several mappings. Each mapping normally addresses a different control on the same Synth.

To run several independent sound processes from the same clip, pass an array:

```supercollider
Bmc.sonifyTake(\ishidomaru1, [~tone, ~noise]);
```

BuMoChi creates both Synths and attaches both observers to the same player. When clip playback ends, it removes their frame observers and frees their Synths.

## Countdown and optional recording

`Bmc.sonifyTake` runs the synchronized take workflow. Its arguments are:

```supercollider
Bmc.sonifyTake(clipName, sonifications, playerName: \default, record: false);
```

The countdown plays degrees 0 through 4 twice and then degree 7. Clip playback begins exactly with the final degree-7 cue. The mapped sonification begins after that cue has completed.

Set `record: true` to begin SuperCollider server recording before the countdown. Recording then contains the complete countdown and all sound through the clip's final frame. It stops automatically when playback ends.

For the detailed timing and recording workflow, see [RecordingWithSound.md](../RecordingWithSound.md).

## Stopping and inspecting a take

```supercollider
Bmc.stopTake;    // stop playback and clean up sound processes
Bmc.cancelTake;  // also works during a pending countdown
Bmc.takeStatus;  // report pending, playing, and recording state
```

Starting another take also cleans up the currently managed take. A `BmcLiveSonification` can be reused: its rate-tracking history is reset whenever it starts.

## Advanced setup functions

Instead of a `BmcLiveSonification`, the second argument may be a function. BuMoChi calls it with the player, clip name, and player name. The function should return a cleanup function, a freeable object, or a collection of these:

```supercollider
~customSonification = { |player, clipName, playerName|
    var synth = Synth(\bmcGuideTone);
    var controller = SimpleController(player);

    controller.put(\frame, { |model, what, frameIndex, message|
        var frame = BmcFrame.fromOSC(message);
        synth.set(\freq, frame.pose[\Head].y.linlin(-0.2, 0.2, 100, 2000));
    });

    {
        controller.remove;
        synth.free;
    }
};

Bmc.sonifyTake(\ishidomaru1, ~customSonification);
```

The function form is useful for nonlinear mappings, relationships between several bones, event detection, buffer processes, or algorithms that need their own state. Prefer `BmcLiveSonification` for straightforward one-value-to-one-control mappings because it supplies rate calculation and cleanup automatically.
