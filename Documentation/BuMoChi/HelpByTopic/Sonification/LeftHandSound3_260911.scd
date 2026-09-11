// LeftHandSound3_260911 — middle-finger amplitude without calibration.
// Evaluate SETUP, then START (or evaluate this whole file).
// Left-hand rotation controls pitch and stereo position, as in versions 1/2.
// Extending the left middle finger (e.g. a V sign) raises amplitude up to 0.5.
// A sufficiently bent middle finger (closed fist) gives amplitude exactly 0.
// This uses guessed angles: <=15 degrees is fully open, >=70 is fully closed.
// These are assumptions about LeftMiddleIntermediate's local quaternion,
// not measured anatomical angles. Avatar rest rotations can affect the result.
// Calibration is optional; adjust the two thresholds below if necessary.
// XR-Animator must send finger bones in extended BuMoChi frames (version 3/4).
// Missing finger data or a stopped stream gives silence. No sound files needed.
// Raw input is used, independently of the Animate from Camera button.

//: SETUP — also stops a previous run of this variation.
(
~leftHandSound3Stop !? { ~leftHandSound3Stop.value };
~leftHandSound3State = ();
// Guessed local joint rotations, measured from identity (straight finger).
// Change these values and re-evaluate SETUP and START if tracking differs.
~leftHandSound3OpenDegrees = 15;    // At or below this bend: amplitude 0.5.
~leftHandSound3ClosedDegrees = 70;  // At or above this bend: amplitude 0.
~leftHandSound3MaxAmp = 0.5;

// Finger transforms are in the extended payload, outside the 21 body bones.
~leftHandSound3ReadFinger = { |frame|
	var extra = frame.extension, quaternion, offset, norm;
	if(extra.notEmpty) {
		extra[0].asInteger.do { |index|
			offset = 1 + (index * 8);
			if(extra[offset].asSymbol == \LeftMiddleIntermediate) {
				quaternion = extra.copyRange(offset + 4, offset + 7);
			}
		};
	};
	if(quaternion.notNil) {
		norm = quaternion.squared.sum.sqrt;
		quaternion = if(norm > 0.0001) { quaternion / norm } { nil };
	};
	quaternion
};

// This estimate assumes an extended finger has a near-identity local rotation.
// abs(w) makes q and -q equivalent; no particular bending axis is assumed.
~leftHandSound3Bend = { |finger|
	if(finger.isNil) { nil } {
		(2 * finger[3].abs.clip(0, 1).acos).raddeg
	}
};
~leftHandSound3Amplitude = { |finger|
	var bend = ~leftHandSound3Bend.(finger);
	if(bend.isNil) { 0 } {
		bend.linlin(~leftHandSound3OpenDegrees, ~leftHandSound3ClosedDegrees,
			~leftHandSound3MaxAmp.clip(0, 0.5), 0).clip(0, 0.5)
	}
};
);

//: START — boot audio if needed, and replace earlier left-hand sounds.
(
s.waitForBoot({
	var state = ~leftHandSound3State;
	SynthDef(\leftHandSound3_260911, { |out = 0, freq = 330, amp = 0, pan = 0|
		var signal = SinOsc.ar(freq.clip(100, 1200).lag(0.1));
		// Finite fade reaches amplitude zero after 0.08 seconds (no clicks).
		Out.ar(out, Pan2.ar(signal * Ramp.kr(amp.clip(0, 0.5), 0.08), pan.lag(0.1)));
	}).add;
	s.sync;
	~leftHandSound1Stop !? { ~leftHandSound1Stop.value };
	~leftHandSound2Stop !? { ~leftHandSound2Stop.value };
	~leftHandSound3Stop !? { ~leftHandSound3Stop.value };
	state[\finger] = nil;
	state[\time] = nil;
	state[\source] = nil;
	~leftHandSound3Synth = Synth(\leftHandSound3_260911);
	~leftHandSound3Controller = SimpleController(Bmc.dispatcher);
	~leftHandSound3Controller.put(\rawFrame, { |model, what, message, time|
		var frame = BmcFrame.fromOSC(message);
		var finger = ~leftHandSound3ReadFinger.(frame);
		var hand = frame.pose[\LeftHand];
		var amplitude;
		// Follow one camera source, not unrelated incoming avatars.
		if(state[\source].isNil and: {
			frame.source.asSymbol == Bmc.cameraSource or: {
				Bmc.cameraSource.isNil and: { frame.avatar.asSymbol == Bmc.defaultAvatarID }
			}
		}) { state[\source] = frame.source.asSymbol };
		if(frame.source.asSymbol == state[\source]) {
			state[\finger] = finger;
			state[\time] = SystemClock.seconds;
			state[\bendDegrees] = ~leftHandSound3Bend.(finger);
			amplitude = ~leftHandSound3Amplitude.(finger);
			~leftHandSound3Synth.set(
				\freq, hand.qx.linlin(-0.7, 0.7, 150, 900).clip(150, 900),
				\pan, hand.qy.linlin(-0.7, 0.7, -0.8, 0.8).clip(-0.8, 0.8),
				\amp, amplitude
			);
		};
	});
	// Silence if the stream stops instead of leaving the last loudness held.
	~leftHandSound3Watch = Routine({
		loop {
			if(state[\time].isNil or: { (SystemClock.seconds - state[\time]) > 0.5 }) {
				~leftHandSound3Synth.set(\amp, 0);
			};
			0.1.wait;
		}
	}).play(AppClock);
	~leftHandSound3Stop = {
		~leftHandSound3Controller !? { ~leftHandSound3Controller.remove; ~leftHandSound3Controller = nil };
		~leftHandSound3Watch !? { ~leftHandSound3Watch.stop; ~leftHandSound3Watch = nil };
		~leftHandSound3Synth !? { ~leftHandSound3Synth.free; ~leftHandSound3Synth = nil };
		CmdPeriod.remove(~leftHandSound3Stop);
	};
	CmdPeriod.add(~leftHandSound3Stop);
	"LeftHandSound3 ready: extend the middle finger for sound; close your fist for silence.".postln;
});
);

//: OPTIONAL — inspect the current estimated bend in degrees.
~leftHandSound3State[\bendDegrees].postln;

//: STOP — evaluate without the leading //, or press Cmd+.
~leftHandSound3Stop.value;
