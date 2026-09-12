/*
  SYNTHS — 8 starter sounds. Loaded by dance-lab.scd; you can also evaluate this file alone.

  Every synth understands the same handful of arguments so the mapping in profile-template.scd
  can drive any of them with the 7 dance parameters:

    amp     0..1   loudness              ← intensity
    cutoff  Hz     filter brightness     ← brightness   (use .linexp(0, 1, 200, 8000) or so)
    freq    Hz     pitch                 ← pitch        (via a scale, see profile-template.scd)
    width   0..1   stereo width / detune ← width
    pan    -1..1   left/right            ← pan          (pan * 2 - 1)
    verb    0..1   reverb send amount    ← space
    gate    0/1    for held sounds (pads, drone): Synth.set(\gate, 0) releases them
    density is best used by the mapping to decide HOW OFTEN to trigger (see profile-template.scd).

  A shared reverb runs on ~verbBus; every synth sends `verb` of its signal there.
  Tweak notes: numbers marked with "<- tweak" are the ones worth playing with first.
*/
(
~verbBus = ~verbBus ?? { Bus.audio(s, 2) };

// ---- one global reverb; all synths send into ~verbBus --------------------------------------
SynthDef(\danceVerb, {
  arg room = 0.8, damp = 0.5, mix = 1.0;
  var sig = In.ar(~verbBus, 2);
  sig = FreeVerb2.ar(sig[0], sig[1], mix, room, damp);   // room <- tweak (0.6 tight … 0.95 hall)
  Out.ar(0, sig);
}).add;

// ---- PAD 1: soft saw pad, slow attack ------------------------------------------------------
SynthDef(\padWarm, {
  arg freq = 220, amp = 0.3, cutoff = 1200, width = 0.5, pan = 0, verb = 0.4, gate = 1,
      atk = 0.8, rel = 2.5;
  var env = EnvGen.kr(Env.asr(atk, 1, rel), gate, doneAction: 2);
  var detune = width.linlin(0, 1, 0.001, 0.02);                    // width = how wide the chorus
  var sig = Saw.ar(freq * [1 - detune, 1, 1 + detune]).sum / 3;
  sig = RLPF.ar(sig, cutoff.clip(80, 12000), 0.4);                // 0.4 <- tweak (lower = more bite)
  sig = Pan2.ar(sig * env * amp * 0.5, pan);
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

// ---- PAD 2: glassy sine pad with slow wobble ------------------------------------------------
SynthDef(\padGlass, {
  arg freq = 440, amp = 0.3, cutoff = 3000, width = 0.5, pan = 0, verb = 0.6, gate = 1,
      atk = 1.5, rel = 4;
  var env = EnvGen.kr(Env.asr(atk, 1, rel), gate, doneAction: 2);
  var wobble = SinOsc.kr(width.linlin(0, 1, 0.1, 3)).range(0.98, 1.02); // width = wobble speed
  var sig = SinOsc.ar(freq * [1, 2.01 * wobble, 3.0]) * [1, 0.4, 0.15];
  sig = LPF.ar(sig.sum, cutoff.clip(200, 12000));
  sig = Pan2.ar(sig * env * amp * 0.4, pan);
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

// ---- PLUCK 1: Karplus-Strong string ----------------------------------------------------------
SynthDef(\pluck, {
  arg freq = 440, amp = 0.5, cutoff = 4000, width = 0.5, pan = 0, verb = 0.3, dur = 1.5;
  var sig = Pluck.ar(WhiteNoise.ar(0.5), Impulse.kr(0), 0.05, 1 / freq, dur, coef: width.linlin(0, 1, 0.1, 0.5));
  sig = LPF.ar(sig, cutoff.clip(200, 12000));
  sig = Pan2.ar(sig * amp, pan);
  DetectSilence.ar(sig, doneAction: 2);
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

// ---- LEAD 2: bright square lead with a short envelope ---------------------------------------
SynthDef(\lead, {
  arg freq = 440, amp = 0.4, cutoff = 2500, width = 0.5, pan = 0, verb = 0.2, dur = 0.4;
  var env = EnvGen.kr(Env.perc(0.01, dur), doneAction: 2);
  var sig = Pulse.ar(freq, width.linlin(0, 1, 0.5, 0.05));       // width = pulse width (thin ↔ full)
  sig = RLPF.ar(sig, (cutoff * env).clip(80, 12000) + 100, 0.3);
  sig = Pan2.ar(sig * env * amp * 0.5, pan);
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

// ---- KICK -----------------------------------------------------------------------------------
SynthDef(\kick, {
  arg amp = 0.8, pan = 0, verb = 0.05, pitch = 55;
  var env = EnvGen.kr(Env.perc(0.001, 0.4), doneAction: 2);
  var sweep = XLine.kr(pitch * 4, pitch, 0.06);                  // 0.06 <- tweak (longer = boomier)
  var sig = SinOsc.ar(sweep) * env;
  sig = (sig * 1.5).tanh;                                          // gentle saturation
  sig = Pan2.ar(sig * amp, pan);
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

// ---- SNAP / CLICK ---------------------------------------------------------------------------
SynthDef(\snap, {
  arg amp = 0.5, cutoff = 5000, pan = 0, verb = 0.3;
  var env = EnvGen.kr(Env.perc(0.0005, 0.08), doneAction: 2);    // 0.08 <- tweak (longer = snare-ish)
  var sig = BPF.ar(WhiteNoise.ar, cutoff.clip(500, 12000), 0.3) * env;
  sig = Pan2.ar(sig * amp, pan);
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

// ---- GRAINS: granular / noise texture, held ------------------------------------------------
SynthDef(\grains, {
  arg amp = 0.3, cutoff = 2000, density = 0.5, width = 0.5, pan = 0, verb = 0.7, gate = 1, freq = 300;
  var env = EnvGen.kr(Env.asr(0.5, 1, 2), gate, doneAction: 2);
  var trig = Dust.kr(density.linlin(0, 1, 4, 80));                // density = grains per second
  var grainFreq = freq * TRand.kr(0.5, 2, trig);
  var sig = GrainSin.ar(2, trig, 0.08, grainFreq, TRand.kr(-1, 1, trig) * width);
  sig = sig + (BPF.ar(PinkNoise.ar(0.3), cutoff.clip(200, 8000), 0.5) * (1 - density));
  sig = LPF.ar(sig, cutoff.clip(200, 12000));
  sig = Balance2.ar(sig[0], sig[1], pan) * env * amp;
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

// ---- SUB DRONE: held low tone, for `intensity` floors and `freeze` -------------------------
SynthDef(\subDrone, {
  arg freq = 55, amp = 0.4, cutoff = 300, width = 0.5, pan = 0, verb = 0.2, gate = 1;
  var env = EnvGen.kr(Env.asr(1.0, 1, 3.0), gate, doneAction: 2);
  var sig = SinOsc.ar(freq) + (Saw.ar(freq * [0.5, 0.501]).sum * width * 0.3); // width = growl
  sig = LPF.ar(sig, cutoff.clip(60, 2000));
  sig = Pan2.ar(sig * env * amp * 0.6, pan);
  Out.ar(~verbBus, sig * verb);
  Out.ar(0, sig);
}).add;

"synths: padWarm padGlass pluck lead kick snap grains subDrone (+ danceVerb) loaded".postln;
)
