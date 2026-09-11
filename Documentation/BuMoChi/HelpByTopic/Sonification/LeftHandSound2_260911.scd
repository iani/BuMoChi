// LevtHandSound2_260911 — left-hand pitch/pan, middle-finger volume.
// Evaluate SETUP, then START. With your left hand visible to XR-Animator:
// 1. Hold a closed fist and evaluate: ~leftHandSound2Calibrate.(\fist);
// 2. Hold a V sign and evaluate:      ~leftHandSound2Calibrate.(\v);
// Now extending the middle finger makes the sine louder; a fist silences it.
// Index-finger position is not checked: this measures middle-finger extension,
// rather than recognizing the whole V gesture. Hand rotation still sets pitch/pan.
// XR-Animator must send finger bones in BuMoChi extended frames (version 3/4).
// Until both poses are calibrated, or when finger data is missing, it is silent.
// Raw input is used, independently of the Animate from Camera button.

//: SETUP — also stops a previous run of this variation.
(
~leftHandSound2Stop !? { ~leftHandSound2Stop.value };
~leftHandSound2State = ();

// Finger transforms are in the extended payload, outside the 21 body bones.
~leftHandSound2ReadFinger = { |frame|
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

// Angular distance treats q and -q as the same rotation.
~leftHandSound2Distance = { |a, b|
	2 * ((a * b).sum.abs.clip(0, 1)).acos
};
~leftHandSound2Openness = { |finger, fist, v|
	var fromFist, fromV, amount = 0;
	if(finger.notNil and: { fist.notNil } and: { v.notNil }) {
		if(~leftHandSound2Distance.(fist, v) > 0.15) {
			fromFist = ~leftHandSound2Distance.(finger, fist);
			fromV = ~leftHandSound2Distance.(finger, v);
			// Dead zones give a reliably silent fist and full-volume extension.
			amount = (fromFist / (fromFist + fromV).max(0.0001))
				.linlin(0.12, 0.88, 0, 1).clip(0, 1);
		};
	};
	amount
};
~leftHandSound2Calibrate = { |pose|
	var state = ~leftHandSound2State;
	if([\fist, \v].includes(pose).not) {
		"Use \\fist or \\v for calibration.".warn;
	} {
		if(state[\finger].isNil or: {
			(SystemClock.seconds - (state[\time] ?? { 0 })) > 0.5
		}) {
			"No current LeftMiddleIntermediate data. Check XR-Animator hand tracking and finger output.".warn;
		} {
			state[pose] = state[\finger].copy;
			("Captured left-hand pose: " ++ pose).postln;
			if(state[\fist].notNil and: { state[\v].notNil }) {
				if(~leftHandSound2Distance.(state[\fist], state[\v]) <= 0.15) {
					"Poses are too similar. Capture a tightly closed fist and a fully extended middle finger again.".warn;
				} { "Calibrated: fist = silence; extended middle finger = full volume.".postln };
			};
		};
	};
};
);

//: START — boot audio if needed, and replace sound 1 / an earlier sound 2.
(
s.waitForBoot({
	var state = ~leftHandSound2State;
	SynthDef(\leftHandSound2_260911, { |out = 0, freq = 330, amp = 0, pan = 0|
		var signal = SinOsc.ar(freq.clip(100, 1200).lag(0.1));
		// Finite fade reaches amplitude zero after 0.08 seconds (no clicks).
		Out.ar(out, Pan2.ar(signal * Ramp.kr(amp.clip(0, 0.06), 0.08), pan.lag(0.1)));
	}).add;
	s.sync;
	~leftHandSound1Stop !? { ~leftHandSound1Stop.value };
	~leftHandSound2Stop !? { ~leftHandSound2Stop.value };
	state[\finger] = nil;
	state[\time] = nil;
	state[\source] = nil;
	~leftHandSound2Synth = Synth(\leftHandSound2_260911);
	~leftHandSound2Controller = SimpleController(Bmc.dispatcher);
	~leftHandSound2Controller.put(\rawFrame, { |model, what, message, time|
		var frame = BmcFrame.fromOSC(message);
		var finger = ~leftHandSound2ReadFinger.(frame);
		var hand = frame.pose[\LeftHand];
		var amount;
		// Follow one camera source, not unrelated incoming avatars.
		if(state[\source].isNil and: {
			frame.source.asSymbol == Bmc.cameraSource or: {
				Bmc.cameraSource.isNil and: { frame.avatar.asSymbol == Bmc.defaultAvatarID }
			}
		}) { state[\source] = frame.source.asSymbol };
		if(frame.source.asSymbol == state[\source]) {
			state[\finger] = finger;
			state[\time] = SystemClock.seconds;
			amount = ~leftHandSound2Openness.(finger, state[\fist], state[\v]);
			~leftHandSound2Synth.set(
				\freq, hand.qx.linlin(-0.7, 0.7, 150, 900).clip(150, 900),
				\pan, hand.qy.linlin(-0.7, 0.7, -0.8, 0.8).clip(-0.8, 0.8),
				\amp, amount * 0.06
			);
		};
	});
	// Silence if the stream stops instead of leaving the last loudness held.
	~leftHandSound2Watch = Routine({
		loop {
			if(state[\time].isNil or: { (SystemClock.seconds - state[\time]) > 0.5 }) {
				~leftHandSound2Synth.set(\amp, 0);
			};
			0.1.wait;
		}
	}).play(AppClock);
	~leftHandSound2Stop = {
		~leftHandSound2Controller !? { ~leftHandSound2Controller.remove; ~leftHandSound2Controller = nil };
		~leftHandSound2Watch !? { ~leftHandSound2Watch.stop; ~leftHandSound2Watch = nil };
		~leftHandSound2Synth !? { ~leftHandSound2Synth.free; ~leftHandSound2Synth = nil };
		CmdPeriod.remove(~leftHandSound2Stop);
	};
	CmdPeriod.add(~leftHandSound2Stop);
	"LeftHandSound2 ready. Calibrate your fist and V sign, then play.".postln;
});
);

//: CALIBRATE FIST — hold the pose; evaluate without the leading //.
~leftHandSound2Calibrate.(\fist);

//: CALIBRATE V SIGN — extend the middle finger; evaluate without leading //.
~leftHandSound2Calibrate.(\v);

//: STOP — evaluate without leading //, or press Cmd+.
// ~leftHandSound2Stop.value;
