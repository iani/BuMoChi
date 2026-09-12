/*
  DANCE LAB — the one file to open.

  1. Open this file in the SuperCollider IDE.
  2. Put the cursor inside the big parenthesis block below and press Cmd/Ctrl+Enter.
  3. Wait for "listening on 57120" in the post window.
  4. Start the bridge (python tools/sc-bridge/bridge.py), pick
     "SuperCollider (local OSC bridge)" on #/dance and press Start.

  What it does: boots the server, loads synths.scd (the sounds), receive.scd (the OSC
  plumbing) and profile-template.scd (YOUR mapping — edit that file, not this one).
  Re-run this block any time you change a file; it is safe to evaluate twice.
*/
(
var dir = thisProcess.nowExecutingPath.dirname;

// Bigger safety margins for laptops; lower `s.latency` if the sound feels late.
s.options.numOutputBusChannels = 2;
s.latency = 0.05;

s.waitForBoot {
  (dir +/+ "synths.scd").load;
  s.sync;
  (dir +/+ "receive.scd").load;
  (dir +/+ "profile-template.scd").load;
  s.sync;

  ("dance-lab: listening on " ++ NetAddr.langPort).postln;
  "dance-lab: sounds in synths.scd — your mapping in profile-template.scd".postln;
  "dance-lab: no camera? open explorer.scd, or run tools/sc-bridge/replay.py".postln;
  if(NetAddr.langPort != 57120) {
    ("dance-lab: WARNING sclang is on port " ++ NetAddr.langPort
      ++ " — start the bridge with --osc-port " ++ NetAddr.langPort).postln;
  };
};
)
