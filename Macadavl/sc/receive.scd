/*
  RECEIVE — the OSC plumbing. You normally don't edit this file.

  The browser (via tools/sc-bridge) or replay.py sends, for dancer A (and the same for B):

    /dance/A/params  intensity brightness pitch width pan density space   (7 floats, 0..1)
    /dance/A/event   kind strength                                          ("hit" 0.8 …)
    /dance/A/stop

  This file keeps the latest values in two Environments and calls YOUR hooks:

    ~dancerA / ~dancerB     latest values: ~dancerA.intensity, ~dancerA.pitch, … ~dancerA.t
    ~onParamsA.(~dancerA)   called on every params message (~30-60 times per second)
    ~onEventA.(kind, strength, ~dancerA)   called once per event
    ~onStopA.(~dancerA)     called when the dancer presses Stop

  Write those hooks in profile-template.scd. Same names with B for the second dancer.
*/
(
~paramNames = #[\intensity, \brightness, \pitch, \width, \pan, \density, \space];
~eventKinds = #[\hit, \accent, \sweep, \freeze, \release];

~makeDancer = { |name|
  var d = Environment.new.know_(true);   // know_(true) lets you write d.pitch instead of d[\pitch]
  d.dancer = name;
  ~paramNames.do { |k| d[k] = 0.0 };
  d.t = 0;                 // seconds since sclang started, at the last params message
  d.lastEvent = nil;       // Symbol of the last event kind
  d.lastStrength = 0.0;
  d.frames = 0;            // how many params messages arrived
  d.events = 0;            // how many events arrived
  d;
};

~dancerA = ~dancerA ?? { ~makeDancer.(\A) };
~dancerB = ~dancerB ?? { ~makeDancer.(\B) };

// Default hooks: silent no-ops, so nothing crashes before a profile is loaded.
~onParamsA = ~onParamsA ?? { |d| };
~onEventA  = ~onEventA  ?? { |kind, strength, d| };
~onStopA   = ~onStopA   ?? { |d| };
~onParamsB = ~onParamsB ?? { |d| };
~onEventB  = ~onEventB  ?? { |kind, strength, d| };
~onStopB   = ~onStopB   ?? { |d| };

~installDancer = { |name, dancer, onParams, onEvent, onStop|
  var prefix = "/dance/" ++ name;

  OSCdef(("danceParams" ++ name).asSymbol, { |msg|
    ~paramNames.do { |k, i| dancer[k] = msg[i + 1].asFloat };
    dancer.t = Main.elapsedTime;
    dancer.frames = dancer.frames + 1;
    currentEnvironment[onParams].value(dancer);
  }, prefix ++ "/params");

  OSCdef(("danceEvent" ++ name).asSymbol, { |msg|
    var kind = msg[1].asSymbol;
    var strength = msg[2].asFloat;
    dancer.lastEvent = kind;
    dancer.lastStrength = strength;
    dancer.events = dancer.events + 1;
    currentEnvironment[onEvent].value(kind, strength, dancer);
  }, prefix ++ "/event");

  OSCdef(("danceStop" ++ name).asSymbol, { |msg|
    currentEnvironment[onStop].value(dancer);
  }, prefix ++ "/stop");
};

// Looked up by name at message time, so you can re-evaluate a hook while dancing.
~installDancer.(\A, ~dancerA, \onParamsA, \onEventA, \onStopA);
~installDancer.(\B, ~dancerB, \onParamsB, \onEventB, \onStopB);

("receive: OSCdefs for /dance/A and /dance/B on port " ++ NetAddr.langPort).postln;
)
