// LeftHandSound1_260911 — live XR-Animator left-hand sonification.
// With XR-Animator sending data to BuMoChi, evaluate the START block below.
// It boots the default audio server if needed. No sound files are required.
//
// Tilt/turn your left hand: its qx rotation component controls pitch, and qy
// controls stereo position. These are quaternion components, not angles.
// We use rotation because VMC bone positions can stay fixed relative to the
// parent bone even while the hand moves through space.
// The tone continues while the hand is still; movement changes its sound.
// Raw input is used, so "Stop Camera Animation" does not stop this sound.

//: START — evaluate this block; re-running it replaces the previous sound.
(
s.waitForBoot({
	SynthDef(\leftHandSound1_260911, { |out = 0, freq = 330, amp = 0.04, pan = 0|
		var signal = SinOsc.ar(freq.clip(100, 1200).lag(0.1));
		Out.ar(out, Pan2.ar(signal * amp.clip(0, 0.1).lag(0.1), pan.lag(0.1)));
	}).add;
	s.sync;

	// Remove the old listener as well as its synth when restarting.
	~leftHandSound1Stop !? { ~leftHandSound1Stop.value };
	~leftHandSound1 = BmcLiveSonification(
		\leftHandSound1_260911,
		[
			BmcSonificationMapping.absolute(
				\LeftHand, \qx, \freq, [-0.7, 0.7], [150, 900]
			),
			BmcSonificationMapping.absolute(
				\LeftHand, \qy, \pan, [-0.7, 0.7], [-0.8, 0.8]
			)
		],
		[\amp, 0.04]
	).start(Bmc.dispatcher, \rawFrame);

	~leftHandSound1Stop = {
		~leftHandSound1 !? { ~leftHandSound1.stop; ~leftHandSound1 = nil };
		CmdPeriod.remove(~leftHandSound1Stop);
	};
	CmdPeriod.add(~leftHandSound1Stop);
	"LeftHandSound1: turn your left hand to change pitch and stereo position.".postln;
});
)

//: STOP — evaluate the following line without the leading //, or press Cmd+.
~leftHandSound1Stop.value;
