
//:Load buffers from all audiofiles folder in home directory
// Store each buffer in the global library under
// [\buffers, <filenamewithoutextension>]
// Do this at each ServerBoot.
// Enable this at StartUp (before the first ServerBoot)

// The library setup performs this automatically after the class library has
// been recompiled. Boot or reboot the server, then inspect the loaded buffers:
Library.global.at(\buffers).postln;

// Retrieve one buffer by its filename without the extension:
// Library.global.at(\buffers, \crickets);

// Reload the audio files manually while the server is running. Existing Bmc
// buffers are replaced; buffers for files removed from ~/audiofiles are freed:
Bmc.loadSoundFiles;

// Post each buffer name and its full source path:
Bmc.listAudioBuffers;

// Show the same information in a new ListView window.
// Select a buffer and press Enter or "Play selected" to play it.
// "Stop playback" frees every buffer-playback synth created by this window:
Bmc.showAudioBuffers;
//:-----------------------------------------------------
// make some clip recordings to work with
//:
Bmc.record(\ishidomaru1);
Bmc.stopRecording;
//:
Bmc.record(\ishidomaru2);
Bmc.stopRecording;
//:
Bmc.record(\ishidomaru3);
Bmc.stopRecording;
//:
Bmc.record(\ishidomaru4);
Bmc.stopRecording;
//:
Bmc.record(\ishidomaru5);
Bmc.stopRecording;
//:-----------------------------------------------------
// Sonification tests with the clips recorded above
// Run this setup block once after booting the audio server. Each example below
// observes two absolute bone values and their signed rates of change. Starting
// another example on the same player cleans up the preceding sonification.
SynthDef(\bmcMotionSine, { |out = 0, a = 0, b = 0, da = 0, db = 0|
	var frequency = a.linexp(-1, 1, 90, 1400);
	var motion = (da.abs + db.abs).clip(0, 1);
	var signal = SinOsc.ar(frequency * [1, 1.005], b * pi, 0.025 + (motion * 0.12));
	Out.ar(out, Balance2.ar(signal[0], signal[1], b));
}).add;

SynthDef(\bmcMotionPulse, { |out = 0, a = 0, b = 0, da = 0, db = 0|
	var frequency = a.linexp(-1, 1, 45, 700);
	var width = b.linlin(-1, 1, 0.08, 0.92);
	var motion = (da.abs + db.abs).clip(0, 1);
	var signal = RLPF.ar(Pulse.ar(frequency, width), 250 + (motion * 5000), 0.2);
	Out.ar(out, Pan2.ar(signal * (0.02 + (motion * 0.08)), b));
}).add;

SynthDef(\bmcMotionNoise, { |out = 0, a = 0, b = 0, da = 0, db = 0|
	var motion = (da.abs + db.abs).clip(0, 1);
	var center = a.linexp(-1, 1, 120, 6500);
	var signal = BPF.ar(PinkNoise.ar, center, 0.08 + (b.abs * 0.35));
	Out.ar(out, Pan2.ar(signal * (0.015 + (motion * 0.18)), b));
}).add;

SynthDef(\bmcMotionRings, { |out = 0, a = 0, b = 0, da = 0, db = 0|
	var motion = (da.abs + db.abs).clip(0, 1);
	var impulses = Dust.ar(1 + (motion * 35));
	var frequencies = a.linexp(-1, 1, 100, 1800) * [1, 1.5, 2.25, 3.1];
	var signal = Mix(Ringz.ar(impulses, frequencies, 0.08 + (b.abs * 0.7)));
	Out.ar(out, Pan2.ar(signal * 0.035, b));
}).add;

SynthDef(\bmcMotionBuffer, { |out = 0, bufnum = 0, a = 0, b = 0, da = 0, db = 0|
	var motion = (da.abs + db.abs).clip(0, 1);
	var rate = BufRateScale.kr(bufnum) * a.linexp(-1, 1, 0.35, 2.5);
	var signal = PlayBuf.ar(1, bufnum, rate, loop: 1);
	signal = RLPF.ar(signal, 300 + (motion * 7000), 0.25);
	Out.ar(out, Pan2.ar(signal * (0.015 + (motion * 0.16)), b));
}).add;

~bmcSonify = { |clipName, playerName = \default, synthName = \bmcMotionSine,
	boneA = \Hips, componentA = \x, minA = -0.5, maxA = 0.5, rateScaleA = 0.1,
	boneB = \Head, componentB = \qy, minB = -0.7, maxB = 0.7, rateScaleB = 0.1,
	bufferName = \crickets, sonificationName, startPlayback = true, recordSound = true|
	var buffer = Library.global.at(\buffers, bufferName);
	var specification = { |player|
		var synth = Synth(synthName, [\bufnum, buffer.notNil.if({ buffer.bufnum }, { 0 })]);
		var frameController = SimpleController(player);
		var previousA, previousB, previousTime;
		frameController.put(\frame, { |model, event, frameIndex, message|
			var now = SystemClock.seconds;
			var frame = BmcFrame.fromOSC(message);
			var valueA = frame.pose[boneA].perform(componentA);
			var valueB = frame.pose[boneB].perform(componentB);
			var elapsed = if(previousTime.isNil) { 1 / 60 } { (now - previousTime).max(0.0001) };
			var changeA = if(previousA.isNil) { 0 } { (valueA - previousA) / elapsed };
			var changeB = if(previousB.isNil) { 0 } { (valueB - previousB) / elapsed };
			synth.set(
				\a, valueA.linlin(minA, maxA, -1, 1).clip2(1),
				\b, valueB.linlin(minB, maxB, -1, 1).clip2(1),
				\da, (changeA * rateScaleA).clip2(1),
				\db, (changeB * rateScaleB).clip2(1)
			);
			previousA = valueA;
			previousB = valueB;
			previousTime = now;
		});
		{ frameController.remove; synth.free };
	};
	if(startPlayback) {
		Bmc.sonifyTake(clipName, specification, playerName, recordSound)
	} {
		~bmcPendingSonifications = ~bmcPendingSonifications ?? { List.new };
		~bmcPendingSonifications.add(specification);
		specification
	};
};

//: ---- ishidomaru1 a
// Hips left/right position; head yaw; sine pitch and motion amplitude.
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionSine,
	boneA: \Hips, componentA: \x, minA: -0.5, maxA: 0.5, rateScaleA: 0.15,
	boneB: \Head, componentB: \qy, minB: -0.7, maxB: 0.7, rateScaleB: 0.3);

//: ---- ishidomaru1 b
// Hips height; left-hand vertical position; pulse pitch, width, and filter.
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionPulse,
	boneA: \Hips, componentA: \y, minA: 0.4, maxA: 1.6, rateScaleA: 0.2,
	boneB: \LeftHand, componentB: \y, minB: -0.5, maxB: 0.5, rateScaleB: 0.3);

//: ---- ishidomaru1 c
// Head tilt and chest twist excite a moving band of noise.
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionNoise,
	boneA: \Head, componentA: \qz, minA: -0.7, maxA: 0.7, rateScaleA: 0.4,
	boneB: \Chest, componentB: \qy, minB: -0.5, maxB: 0.5, rateScaleB: 0.4);

//: ---- ishidomaru1 d
// Foot separation and right-foot lift control resonant impacts.
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionRings,
	boneA: \LeftFoot, componentA: \x, minA: -0.3, maxA: 0.3, rateScaleA: 0.5,
	boneB: \RightFoot, componentB: \y, minB: -0.3, maxB: 0.3, rateScaleB: 0.5);

//: ---- ishidomaru1 e
// Right-hand reach changes cricket speed; hand rotation and speed shape space/filter.
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionBuffer,
	boneA: \RightHand, componentA: \z, minA: -0.5, maxA: 0.5, rateScaleA: 0.3,
	boneB: \RightHand, componentB: \qz, minB: -0.7, maxB: 0.7, rateScaleB: 0.4,
	bufferName: \crickets);

//: ---- ishidomaru1 all
// Attach all five observers and synths first, then start one shared playback.
~bmcPendingSonifications = List.new;
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionSine,
	boneA: \Hips, componentA: \x, minA: -0.5, maxA: 0.5, rateScaleA: 0.15,
	boneB: \Head, componentB: \qy, minB: -0.7, maxB: 0.7, rateScaleB: 0.3,
	sonificationName: \a, startPlayback: false);
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionPulse,
	boneA: \Hips, componentA: \y, minA: 0.4, maxA: 1.6, rateScaleA: 0.2,
	boneB: \LeftHand, componentB: \y, minB: -0.5, maxB: 0.5, rateScaleB: 0.3,
	sonificationName: \b, startPlayback: false);
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionNoise,
	boneA: \Head, componentA: \qz, minA: -0.7, maxA: 0.7, rateScaleA: 0.4,
	boneB: \Chest, componentB: \qy, minB: -0.5, maxB: 0.5, rateScaleB: 0.4,
	sonificationName: \c, startPlayback: false);
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionRings,
	boneA: \LeftFoot, componentA: \x, minA: -0.3, maxA: 0.3, rateScaleA: 0.5,
	boneB: \RightFoot, componentB: \y, minB: -0.3, maxB: 0.3, rateScaleB: 0.5,
	sonificationName: \d, startPlayback: false);
~bmcSonify.(\ishidomaru1, synthName: \bmcMotionBuffer,
	boneA: \RightHand, componentA: \z, minA: -0.5, maxA: 0.5, rateScaleA: 0.3,
	boneB: \RightHand, componentB: \qz, minB: -0.7, maxB: 0.7, rateScaleB: 0.4,
	bufferName: \crickets, sonificationName: \e, startPlayback: false);
Bmc.sonifyTake(\ishidomaru1, ~bmcPendingSonifications, record: true);

//: ---- ishidomaru2 a
// Forward/backward hips and head nod become a continuous sine voice.
~bmcSonify.(\ishidomaru2, synthName: \bmcMotionSine,
	boneA: \Hips, componentA: \z, minA: -0.8, maxA: 0.8, rateScaleA: 0.12,
	boneB: \Head, componentB: \qx, minB: -0.7, maxB: 0.7, rateScaleB: 0.35);

//: ---- ishidomaru2 b
// Left- and right-hand heights oppose pulse width and stereo position.
~bmcSonify.(\ishidomaru2, synthName: \bmcMotionPulse,
	boneA: \LeftHand, componentA: \y, minA: -0.6, maxA: 0.6, rateScaleA: 0.35,
	boneB: \RightHand, componentB: \y, minB: -0.6, maxB: 0.6, rateScaleB: 0.35);

//: ---- ishidomaru2 c
// Shoulder rotations map upper-body asymmetry to filtered noise.
~bmcSonify.(\ishidomaru2, synthName: \bmcMotionNoise,
	boneA: \LeftShoulder, componentA: \qz, minA: -0.7, maxA: 0.7, rateScaleA: 0.45,
	boneB: \RightShoulder, componentB: \qz, minB: -0.7, maxB: 0.7, rateScaleB: 0.45);

//: ---- ishidomaru2 d
// Head height and hips turning determine density and tuning of short resonances.
~bmcSonify.(\ishidomaru2, synthName: \bmcMotionRings,
	boneA: \Head, componentA: \y, minA: -0.3, maxA: 0.3, rateScaleA: 0.5,
	boneB: \Hips, componentB: \qy, minB: -0.7, maxB: 0.7, rateScaleB: 0.3);

//: ---- ishidomaru2 e
// Left-foot rotation changes water playback rate; hips speed opens the filter.
~bmcSonify.(\ishidomaru2, synthName: \bmcMotionBuffer,
	boneA: \LeftFoot, componentA: \qx, minA: -0.7, maxA: 0.7, rateScaleA: 0.4,
	boneB: \Hips, componentB: \x, minB: -0.6, maxB: 0.6, rateScaleB: 0.15,
	bufferName: \nami);

//: ---- ishidomaru3 a
// Chest vertical motion sets pitch; head roll supplies pan and motion energy.
~bmcSonify.(\ishidomaru3, synthName: \bmcMotionSine,
	boneA: \Chest, componentA: \y, minA: -0.25, maxA: 0.25, rateScaleA: 0.5,
	boneB: \Head, componentB: \qz, minB: -0.7, maxB: 0.7, rateScaleB: 0.4);

//: ---- ishidomaru3 b
// Right-hand lateral reach and wrist twist drive a bright pulse voice.
~bmcSonify.(\ishidomaru3, synthName: \bmcMotionPulse,
	boneA: \RightHand, componentA: \x, minA: -0.5, maxA: 0.5, rateScaleA: 0.35,
	boneB: \RightHand, componentB: \qy, minB: -0.7, maxB: 0.7, rateScaleB: 0.4);

//: ---- ishidomaru3 c
// Knee bending on both sides controls the color, width, and motion of noise.
~bmcSonify.(\ishidomaru3, synthName: \bmcMotionNoise,
	boneA: \LeftLowerLeg, componentA: \qx, minA: -0.8, maxA: 0.8, rateScaleA: 0.45,
	boneB: \RightLowerLeg, componentB: \qx, minB: -0.8, maxB: 0.8, rateScaleB: 0.45);

//: ---- ishidomaru3 d
// Hand separation: left x sets the resonant register, right x sets pan/decay.
~bmcSonify.(\ishidomaru3, synthName: \bmcMotionRings,
	boneA: \LeftHand, componentA: \x, minA: -0.6, maxA: 0.6, rateScaleA: 0.35,
	boneB: \RightHand, componentB: \x, minB: -0.6, maxB: 0.6, rateScaleB: 0.35);

//: ---- ishidomaru3 e
// Head yaw scans a vending-machine recording; chest motion controls brightness.
~bmcSonify.(\ishidomaru3, synthName: \bmcMotionBuffer,
	boneA: \Head, componentA: \qy, minA: -0.7, maxA: 0.7, rateScaleA: 0.35,
	boneB: \Chest, componentB: \qz, minB: -0.6, maxB: 0.6, rateScaleB: 0.4,
	bufferName: \hanbaiki);

//: ---- ishidomaru4 a
// Root height and forward travel form a compact melodic contour.
~bmcSonify.(\ishidomaru4, synthName: \bmcMotionSine,
	boneA: \Hips, componentA: \y, minA: 0.4, maxA: 1.6, rateScaleA: 0.18,
	boneB: \Hips, componentB: \z, minB: -0.8, maxB: 0.8, rateScaleB: 0.12);

//: ---- ishidomaru4 b
// Elbow rotations articulate pulse rhythm and spectral movement.
~bmcSonify.(\ishidomaru4, synthName: \bmcMotionPulse,
	boneA: \LeftLowerArm, componentA: \qz, minA: -0.8, maxA: 0.8, rateScaleA: 0.4,
	boneB: \RightLowerArm, componentB: \qz, minB: -0.8, maxB: 0.8, rateScaleB: 0.4);

//: ---- ishidomaru4 c
// Neck and spine rotation create a breath-like noise layer.
~bmcSonify.(\ishidomaru4, synthName: \bmcMotionNoise,
	boneA: \Neck, componentA: \qx, minA: -0.6, maxA: 0.6, rateScaleA: 0.45,
	boneB: \Spine, componentB: \qy, minB: -0.5, maxB: 0.5, rateScaleB: 0.4);

//: ---- ishidomaru4 d
// Toe lifts and their velocities scatter resonant grains across the stereo field.
~bmcSonify.(\ishidomaru4, synthName: \bmcMotionRings,
	boneA: \LeftToes, componentA: \y, minA: -0.2, maxA: 0.2, rateScaleA: 0.6,
	boneB: \RightToes, componentB: \y, minB: -0.2, maxB: 0.2, rateScaleB: 0.6);

//: ---- ishidomaru4 e
// Hips travel changes waterfall speed; head tilt and both rates shape the filter.
~bmcSonify.(\ishidomaru4, synthName: \bmcMotionBuffer,
	boneA: \Hips, componentA: \x, minA: -0.8, maxA: 0.8, rateScaleA: 0.12,
	boneB: \Head, componentB: \qz, minB: -0.7, maxB: 0.7, rateScaleB: 0.4,
	bufferName: \takisuiryu);

//: ---- ishidomaru5 a
// Head height and horizontal hips position shape pitch, pan, and loudness.
~bmcSonify.(\ishidomaru5, synthName: \bmcMotionSine,
	boneA: \Head, componentA: \y, minA: -0.3, maxA: 0.3, rateScaleA: 0.5,
	boneB: \Hips, componentB: \x, minB: -0.8, maxB: 0.8, rateScaleB: 0.12);

//: ---- ishidomaru5 b
// Upper-arm rotations compare broad left/right gestures with a pulse texture.
~bmcSonify.(\ishidomaru5, synthName: \bmcMotionPulse,
	boneA: \LeftUpperArm, componentA: \qz, minA: -0.9, maxA: 0.9, rateScaleA: 0.35,
	boneB: \RightUpperArm, componentB: \qz, minB: -0.9, maxB: 0.9, rateScaleB: 0.35);

//: ---- ishidomaru5 c
// Left-hand depth and right-hand height produce a two-axis noise gesture.
~bmcSonify.(\ishidomaru5, synthName: \bmcMotionNoise,
	boneA: \LeftHand, componentA: \z, minA: -0.6, maxA: 0.6, rateScaleA: 0.35,
	boneB: \RightHand, componentB: \y, minB: -0.6, maxB: 0.6, rateScaleB: 0.35);

//: ---- ishidomaru5 d
// Hips yaw and head yaw expose agreement and opposition as resonant activity.
~bmcSonify.(\ishidomaru5, synthName: \bmcMotionRings,
	boneA: \Hips, componentA: \qy, minA: -0.7, maxA: 0.7, rateScaleA: 0.3,
	boneB: \Head, componentB: \qy, minB: -0.7, maxB: 0.7, rateScaleB: 0.35);

//: ---- ishidomaru5 e
// Right-foot lift controls short-wave playback; left-foot roll controls space.
~bmcSonify.(\ishidomaru5, synthName: \bmcMotionBuffer,
	boneA: \RightFoot, componentA: \y, minA: -0.3, maxA: 0.3, rateScaleA: 0.5,
	boneB: \LeftFoot, componentB: \qz, minB: -0.7, maxB: 0.7, rateScaleB: 0.45,
	bufferName: \namishort);

//: ---- stop current sonification
// This is useful when stopping an example before its clip reaches the end.
Bmc.stopPlayback;
