// LeftHandSound4_260911 — sine pulses with right-hand period control.
// Evaluate SETUP, then START (or evaluate this whole file).
// Left-hand rotation controls pitch and stereo position, as in v3.
// Turn the RIGHT hand: its qy quaternion component sets the pulse period.
// qy = -0.7 gives 2 seconds between pulses; qy = +0.7 gives 0.1 seconds.
// This is a rotation component, not an angle. No calibration is required.
// Impulse -> Decay2 supplies a short envelope which multiplies the sine tone.
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
~leftHandSound4Stop !? { ~leftHandSound4Stop.value };
~leftHandSound4State = ();
// Guessed local joint rotations, measured from identity (straight finger).
// Change these values and re-evaluate SETUP and START if tracking differs.
~leftHandSound4OpenDegrees = 15;    // At or below this bend: amplitude 0.5.
~leftHandSound4ClosedDegrees = 70;  // At or above this bend: amplitude 0.
~leftHandSound4MaxAmp = 0.5;

// Exponential mapping gives useful control over slow and fast pulses.
~leftHandSound4Period = { |rightHand|
	rightHand.qy.linexp(-0.7, 0.7, 2.0, 0.1).clip(0.1, 2.0)
};

// Finger transforms are in the extended payload, outside the 21 body bones.
~leftHandSound4ReadFinger = { |frame|
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
~leftHandSound4Bend = { |finger|
	if(finger.isNil) { nil } {
		(2 * finger[3].abs.clip(0, 1).acos).raddeg
	}
};
~leftHandSound4Amplitude = { |finger|
	var bend = ~leftHandSound4Bend.(finger);
	if(bend.isNil) { 0 } {
		bend.linlin(~leftHandSound4OpenDegrees, ~leftHandSound4ClosedDegrees,
			~leftHandSound4MaxAmp.clip(0, 0.5), 0).clip(0, 0.5)
	}
};
);

//: START — boot audio if needed, and replace earlier left-hand sounds.
(
s.waitForBoot({
	var state = ~leftHandSound4State;
	SynthDef(\leftHandSound4_260911, { |out = 0, freq = 330, amp = 0, pan = 0,
		period = 0.45, attack = 0.005, decay = 0.12|
		var pulse = Impulse.ar(period.clip(0.1, 2.0).lag(0.1).reciprocal);
		var envelope = Decay2.ar(pulse, attack.clip(0.001, 0.02), decay.clip(0.03, 1.0));
		var signal = SinOsc.ar(freq.clip(100, 1200).lag(0.1)) * envelope;
		// Finger amplitude multiplies the envelope: a fist still silences it.
		Out.ar(out, Pan2.ar(signal * Ramp.kr(amp.clip(0, 0.5), 0.08), pan.lag(0.1)));
	}).add;
	s.sync;
	~leftHandSound1Stop !? { ~leftHandSound1Stop.value };
	~leftHandSound2Stop !? { ~leftHandSound2Stop.value };
	~leftHandSound3Stop !? { ~leftHandSound3Stop.value };
	~leftHandSound4Stop !? { ~leftHandSound4Stop.value };
	state[\finger] = nil;
	state[\time] = nil;
	state[\source] = nil;
	~leftHandSound4Synth = Synth(\leftHandSound4_260911);
	~leftHandSound4Controller = SimpleController(Bmc.dispatcher);
	~leftHandSound4Controller.put(\rawFrame, { |model, what, message, time|
		var frame = BmcFrame.fromOSC(message);
		var finger = ~leftHandSound4ReadFinger.(frame);
		var hand = frame.pose[\LeftHand];
		var rightHand = frame.pose[\RightHand];
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
			state[\bendDegrees] = ~leftHandSound4Bend.(finger);
			amplitude = ~leftHandSound4Amplitude.(finger);
			state[\period] = ~leftHandSound4Period.(rightHand);
			~leftHandSound4Synth.set(
				\freq, hand.qx.linlin(-0.7, 0.7, 150, 900).clip(150, 900),
				\pan, hand.qy.linlin(-0.7, 0.7, -0.8, 0.8).clip(-0.8, 0.8),
				\amp, amplitude,
				\period, state[\period]
			);
		};
	});
	// Silence if the stream stops instead of leaving the last loudness held.
	~leftHandSound4Watch = Routine({
		loop {
			if(state[\time].isNil or: { (SystemClock.seconds - state[\time]) > 0.5 }) {
				~leftHandSound4Synth.set(\amp, 0);
			};
			0.1.wait;
		}
	}).play(AppClock);
	~leftHandSound4Stop = {
		~leftHandSound4Controller !? { ~leftHandSound4Controller.remove; ~leftHandSound4Controller = nil };
		~leftHandSound4Watch !? { ~leftHandSound4Watch.stop; ~leftHandSound4Watch = nil };
		~leftHandSound4Synth !? { ~leftHandSound4Synth.free; ~leftHandSound4Synth = nil };
		CmdPeriod.remove(~leftHandSound4Stop);
	};
	CmdPeriod.add(~leftHandSound4Stop);
	"LeftHandSound4 ready: left hand sets pitch/volume; turn the right hand to change pulse period.".postln;
});
);

//: OPTIONAL — inspect the current estimated bend in degrees.
// ~leftHandSound4State[\bendDegrees].postln;
// ~leftHandSound4State[\period].postln; // Seconds between pulses.

//: STOP — evaluate without the leading //, or press Cmd+.
// ~leftHandSound4Stop.value;
