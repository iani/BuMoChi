/*
  PROFILE — YOUR mapping from movement to sound. This is the file to edit.

  You get 7 numbers, all 0..1, about 30-60 times a second (d = the dancer Environment):

    d.intensity   overall energy        d.width     arm / stance spread
    d.brightness  how open / upright    d.pan       0 = left … 1 = right
    d.pitch       how high (head/hands) d.density   how busy the movement is
    d.space       distance / stillness  (d.t = time of last frame, seconds)

  and 5 events, each with a strength 0..1:  \hit  \accent  \sweep  \freeze  \release

  Three hooks per dancer:  ~onParamsA  ~onEventA  ~onStopA   (and the same with B).
  Sounds live in synths.scd:  \padWarm \padGlass \pluck \lead \kick \snap \grains \subDrone.
  Evaluate this whole file (Cmd/Ctrl+Enter inside the parenthesis) after every change — the
  hooks are swapped live, no need to restart anything.

  The default below sounds immediately. Read it top to bottom, then change the numbers,
  then the synth names, then the rules.
*/
(
// ============================ MUSICAL SETTINGS ==============================================
~scale = Scale.minorPentatonic;    // try Scale.major, Scale.dorian, Scale.hirajoshi …
~root  = 45;                       // MIDI note of the lowest degree (45 = A2)
~octaves = 2;                      // pitch 0..1 spans this many octaves of the scale

// pitch 0..1  ->  a frequency on the scale. Used by the default rules below.
~pitchToFreq = { |pitch, root = (~root)|
  var degrees = ~scale.size * ~octaves;
  ~scale.degreeToFreq((pitch.clip(0, 1) * degrees).round.asInteger, root.midicps, 0);
};

// 0..1 -> Hz for filter cutoffs (exponential feels right for brightness).
~toCutoff = { |x| x.clip(0, 1).linexp(0, 1, 250, 9000) };

// Start the shared reverb once the server runs (safe to evaluate again).
~startFx = {
  ~verbSynth !? { |x| x.free };
  ~verbSynth = Synth.tail(s, \danceVerb, [\room, 0.85, \damp, 0.4]);
};
if(s.serverRunning) { ~startFx.value } { ServerBoot.add(~startFx) };

// ============================ DANCER A — CUSTOM MAPPING =====================================
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  WRITE YOUR RULES BETWEEN THESE LINES  <<<<<<<<<<<<<<<<<<<<<<<

// --- continuous: called on every frame ---------------------------------------------------
~onParamsA = { |d|
  // 1) A pad that is always there. It starts on the first frame and follows the body.
  if(d.pad.isNil and: { s.serverRunning }) {
    d.pad = Synth(\padWarm, [\amp, 0, \verb, 0.5]);
  };
  d.pad !? { |pad|
    pad.set(
      \freq,   ~pitchToFreq.(d.pitch),
      \amp,    d.intensity.linlin(0, 1, 0.05, 0.6),   // "when intensity is low the pad is soft"
      \cutoff, ~toCutoff.(d.brightness),
      \width,  d.width,
      \pan,    d.pan * 2 - 1,
      \verb,   d.space
    );
  };

  // 2) Plucks: the busier the movement (density), the more often a note is plucked.
  //    Threshold example: "when intensity > 0.2 play plucks".
  d.lastPluck = d.lastPluck ? 0;
  if(d.intensity > 0.2 and: { s.serverRunning }) {
    var interval = d.density.linlin(0, 1, 1.2, 0.12);           // seconds between plucks
    if(d.t - d.lastPluck > interval) {
      Synth(\pluck, [
        \freq,   ~pitchToFreq.(d.pitch, ~root + 12),
        \amp,    d.intensity.linlin(0, 1, 0.1, 0.7),
        \cutoff, ~toCutoff.(d.brightness),
        \width,  d.width,
        \pan,    d.pan * 2 - 1,
        \verb,   d.space
      ]);
      d.lastPluck = d.t;
    };
  };
};

// --- discrete: called once per event -----------------------------------------------------
~onEventA = { |kind, strength, d|
  if(s.serverRunning) { switch(kind,
    \hit,    { Synth(\kick, [\amp, strength.linlin(0, 1, 0.3, 1.0), \pan, d.pan * 2 - 1]) },     // hit → kick
    \accent, { Synth(\snap, [\amp, strength, \cutoff, ~toCutoff.(d.brightness), \pan, d.pan * 2 - 1]) },
    \sweep,  {                                                                                    // sweep → quick run up the scale
      4.do { |i|
        SystemClock.sched(i * 0.07, {
          Synth(\lead, [\freq, ~pitchToFreq.(d.pitch + (i * 0.1)), \amp, strength * 0.5,
                        \cutoff, ~toCutoff.(d.brightness), \width, d.width, \pan, d.pan * 2 - 1]);
          nil;
        });
      };
    },
    \freeze, {                                                                                    // freeze → hold a sub drone …
      d.drone !? { |x| x.free };
      d.drone = Synth(\subDrone, [\freq, ~pitchToFreq.(d.pitch, ~root - 12), \amp, strength * 0.5,
                                  \width, d.width, \pan, d.pan * 2 - 1, \verb, d.space]);
    },
    \release, { d.drone !? { |x| x.free }; d.drone = nil }                                                     // … release lets it go
  ) };
};

// --- stop: the dancer pressed Stop --------------------------------------------------------
~onStopA = { |d|
  d.pad !? { |x| x.free }; d.pad = nil;
  d.drone !? { |x| x.free }; d.drone = nil;
};

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// ============================ DANCER B ======================================================
// B starts as an exact copy of A. To give B a different sound, replace these three lines
// with your own functions (same arguments as above), e.g. use \padGlass instead of \padWarm.
~onParamsB = ~onParamsA;
~onEventB  = ~onEventA;
~onStopB   = ~onStopA;

"profile: default mapping loaded (A; B = copy of A)".postln;
)
