/*
  Headless smoke test (developers only; dancers never need this).

    sclang -D sc/test/headless-check.scd          # then, in another shell:
    python tools/sc-bridge/replay.py sc/test/fixture-timeline.json --speed 4

  Loads synths + receive + profile without booting scsynth, waits for the fixture to arrive
  on port 57120 and prints PASS/FAIL. Exit code 0 on PASS, 1 on FAIL / timeout.
*/
var dir = thisProcess.nowExecutingPath.dirname.dirname;
var deadline = 20;

("check: sclang port " ++ NetAddr.langPort).postln;
if(NetAddr.langPort != 57120) { "check: FAIL sclang is not on 57120".postln; 1.exit };

(dir +/+ "synths.scd").load;
(dir +/+ "receive.scd").load;
(dir +/+ "profile-template.scd").load;

// Prove the hooks fire without a server: count calls from the profile's hooks.
~hookCalls = (nParams: 0, nEvents: 0, nStop: 0);
~userParamsA = ~onParamsA; ~userEventA = ~onEventA; ~userStopA = ~onStopA;
~onParamsA = { |d| ~hookCalls.nParams = ~hookCalls.nParams + 1; ~userParamsA.(d) };
~onEventA  = { |k, st, d| ~hookCalls.nEvents = ~hookCalls.nEvents + 1; ~userEventA.(k, st, d) };
~onStopA   = { |d| ~hookCalls.nStop = ~hookCalls.nStop + 1; ~userStopA.(d) };

"check: waiting for /dance/A/* from replay.py …".postln;

fork {
  var waited = 0;
  while { (~hookCalls.nStop == 0) and: { waited < deadline } } { 0.1.wait; waited = waited + 0.1 };
  ("check: dancerA frames=" ++ ~dancerA.frames ++ " events=" ++ ~dancerA.events
    ++ " lastEvent=" ++ ~dancerA.lastEvent ++ " lastStrength=" ++ ~dancerA.lastStrength).postln;
  ("check: dancerA intensity=" ++ ~dancerA.intensity ++ " brightness=" ++ ~dancerA.brightness
    ++ " pitch=" ++ ~dancerA.pitch ++ " width=" ++ ~dancerA.width ++ " pan=" ++ ~dancerA.pan
    ++ " density=" ++ ~dancerA.density ++ " space=" ++ ~dancerA.space).postln;
  ("check: hooks " ++ ~hookCalls).postln;
  ("check: dancerB untouched frames=" ++ ~dancerB.frames).postln;
  if(
    (~dancerA.frames == 3) and: { ~dancerA.events == 2 } and: { ~hookCalls.nStop == 1 }
      and: { ~dancerA.lastEvent == \accent } and: { ~dancerA.intensity.equalWithPrecision(0.9) }
      and: { ~dancerA.space.equalWithPrecision(0.3) } and: { ~hookCalls.nParams == 3 }
      and: { ~hookCalls.nEvents == 2 } and: { ~dancerB.frames == 0 }
  ) { "check: PASS".postln; 0.exit } { "check: FAIL".postln; 1.exit };
};
