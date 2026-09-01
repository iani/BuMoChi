// BuMoChi sonification examples 1
//
// These examples use the recorded clip \ishidomaru1. Substitute the name of
// any available clip if necessary. Boot the server and evaluate the SynthDef
// setup block before running the examples.

//: ---- setup
SynthDef(\bmcGuideTone, { |out = 0, freq = 220, amp = 0.05, pan = 0|
	var signal = SinOsc.ar(freq.lag(0.05)) * amp.lag(0.05);
	Out.ar(out, Pan2.ar(signal, pan.lag(0.05)));
}).add;

SynthDef(\bmcGuideNoise, { |out = 0, cutoff = 1000, amp = 0.03, pan = 0|
	var signal = RLPF.ar(PinkNoise.ar, cutoff.lag(0.06), 0.2);
	Out.ar(out, Pan2.ar(signal * amp.lag(0.05), pan.lag(0.05)));
}).add;

//: ---- example 1: one absolute movement value
// Map the horizontal position of the hips onto oscillator frequency.
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

//: ---- example 2: absolute value and rate of change
// Hips position controls pitch. Right-hand vertical speed controls loudness.
~sonification = BmcLiveSonification(
	\bmcGuideTone,
	[
		BmcSonificationMapping.absolute(
			\Hips, \x, \freq,
			[-0.5, 0.5],
			[110, 880]
		),
		BmcSonificationMapping.rate(
			\RightHand, \y, \amp,
			[-2.0, 2.0],
			[0.0, 0.16]
		)
	]
);

Bmc.sonifyTake(\ishidomaru1, ~sonification);

//: ---- example 3: three controls on one synth
// Hips height controls pitch, head turn controls stereo position, and hand
// speed controls amplitude.
~sonification = BmcLiveSonification(
	\bmcGuideTone,
	[
		BmcSonificationMapping.absolute(
			\Hips, \y, \freq,
			[0.4, 1.6],
			[90, 1200]
		),
		BmcSonificationMapping.absolute(
			\Head, \qy, \pan,
			[-0.7, 0.7],
			[-1.0, 1.0]
		),
		BmcSonificationMapping.rate(
			\LeftHand, \y, \amp,
			[-2.0, 2.0],
			[0.0, 0.14]
		)
	]
);

Bmc.sonifyTake(\ishidomaru1, ~sonification);

//: ---- example 4: two sonification processes listening together
~tone = BmcLiveSonification(
	\bmcGuideTone,
	[
		BmcSonificationMapping.absolute(
			\Hips, \x, \freq,
			[-0.5, 0.5],
			[110, 880]
		),
		BmcSonificationMapping.absolute(
			\Head, \qy, \pan,
			[-0.7, 0.7],
			[-1.0, 1.0]
		)
	],
	[\amp, 0.04]
);

~noise = BmcLiveSonification(
	\bmcGuideNoise,
	[
		BmcSonificationMapping.absolute(
			\RightHand, \y, \cutoff,
			[-0.5, 0.5],
			[200, 6000]
		),
		BmcSonificationMapping.rate(
			\RightHand, \x, \amp,
			[-2.0, 2.0],
			[0.0, 0.08]
		)
	]
);

Bmc.sonifyTake(\ishidomaru1, [~tone, ~noise]);

//: ---- example 5: make a recorded take
// The countdown is included in the sound file. Animation playback begins with
// its final degree-7 cue, and recording stops when clip playback ends.
Bmc.sonifyTake(\ishidomaru1, [~tone, ~noise], record: true);

//: ---- stop the current take
Bmc.stopTake;

//: ---- inspect take state
Bmc.takeStatus.postln;
