// Run in a fresh language session without live input.
// Camera muting must not mute recording, monitoring, or unrelated sources.
(
var check = { |condition, message|
	if(condition.not) { Error("FAIL: " ++ message).throw }
};
var source = \camera_control_test;
var recorder = BmcClipRecorder.new;
var other, frame, hasCamera;

try {
	check.(Bmc.cameraAnimationActive, "startup animation must be reported as enabled");
	check.(Bmc.cameraSource.isNil, "test requires an undiscovered camera source");
	Bmc.dispatcher.addDependant(recorder);
	recorder.record;
	hasCamera = { |avatar|
		avatar.sources.any { |item| item.source.asString == source.asString }
	};
	frame = BmcFrame(Bmc.defaultAvatarID.asString, source.asString,
		1, 0.0, BmcPose.neutral).asOSCMessage;

	// Stop before the first frame: discovering its source must not unmute it.
	Bmc.stopCameraAnimation;
	Bmc.dispatcher.receive(frame, 1.0);
	check.(Bmc.cameraAnimationActive.not, "first frame must not re-enable animation");
	check.(Bmc.cameraSource == source, "muted input must still discover the camera");
	check.(hasCamera.(Bmc.defaultAvatar).not, "late first frame must be blocked");
	check.(recorder.size == 1, "muted camera frames must remain recordable");
	check.(Bmc.dispatcher.received == 1 and: { Bmc.dispatcher.lastReceivedTime.notNil },
		"muted input must still update activity monitoring");

	Bmc.cameraTarget_(Bmc.defaultAvatarID);
	Bmc.dispatcher.receive(frame.copy.put(4, 2), 2.0);
	check.(Bmc.cameraAnimationActive and: { hasCamera.(Bmc.defaultAvatar) },
		"enabling camera animation must deliver live frames");
	Bmc.stopCameraAnimation;
	check.(hasCamera.(Bmc.defaultAvatar).not, "stop must remove cached camera motion");
	Bmc.dispatcher.receive(frame.copy.put(4, 3), 3.0);
	check.(hasCamera.(Bmc.defaultAvatar).not, "subsequent camera frames must stay blocked");
	check.(recorder.size == 3, "recording must continue after stopping animation");

	other = Bmc.addAvatar(\cameraControlOther);
	Bmc.dispatcher.receive(BmcFrame("cameraControlOther", "unrelated_source",
		1, 0.0, BmcPose.neutral).asOSCMessage, 4.0);
	check.(other.sources.notEmpty, "camera mute must not block unrelated live sources");

	Bmc.cameraTarget_(other.avatarID);
	Bmc.dispatcher.receive(frame.copy.put(4, 4), 5.0);
	check.(Bmc.cameraAnimationActive and: { hasCamera.(other) },
		"resume must route camera frames to the selected avatar");
	check.(hasCamera.(Bmc.defaultAvatar).not, "retargeting must not animate the old avatar");
	Bmc.stopCameraAnimation;
	check.(hasCamera.(other).not, "stop must clear the retargeted camera cache");

	Bmc.dispatcher.removeDependant(recorder);
	recorder.cancel;
	"PASS: Camera animation state, late input, mute/resume, recording, and routing".postln;
	0.exit;
} { |error| error.reportError; 1.exit };
)
