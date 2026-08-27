// End-to-end draft tests for the public Bmc facade.
// Recompile the class library before evaluating.
(
var check, makeFrame, take1, take2, combined, typed, savedPath, scdPath, wire, composite;

check = { |condition, failureMessage|
	if(condition.not) { Error("FAIL: " ++ failureMessage).throw };
};

makeFrame = { |avatar, source, frameID, time, fill|
	['/bunraku/vmc/frame', 1, avatar, source, frameID, time]
	++ Array.fill(147, fill)
};

Bmc.reset;
Bmc.start(57131);
check.(Bmc.status[\running], "Bmc.start did not start the dispatcher");
Bmc.stop;

// Typed representation round trip.
typed = BmcFrame.fromOSC(makeFrame.("avatar-a", "camera-a", 1, 0.0, 0.25));
check.(typed.pose.isComplete, "BmcPose did not contain all protocol bones");
check.(typed.asOSCMessage == makeFrame.("avatar-a", "camera-a", 1, 0.0, 0.25),
	"BmcFrame OSC round trip changed the message");
check.(BmcBoneSets.leftArm.size == 4, "leftArm bone set is wrong");

// Record through the facade and dispatcher.
Bmc.record(\take1, "avatar-a", "camera-a");
Bmc.dispatcher.receive(makeFrame.("avatar-a", "camera-a", 1, 0.0, 0.0), 10.0);
Bmc.dispatcher.receive(makeFrame.("avatar-a", "camera-a", 2, 0.1, 0.0), 10.1);
take1 = Bmc.stopRecording;
check.(take1.size == 2, "Bmc.record did not capture two frames");
check.(Bmc.currentClip === take1, "recorded clip was not selected");

Bmc.record(\take2, "avatar-b", "camera-b");
Bmc.dispatcher.receive(makeFrame.("avatar-b", "camera-b", 1, 0.0, 1.0), 20.0);
Bmc.dispatcher.receive(makeFrame.("avatar-b", "camera-b", 2, 0.1, 1.0), 20.1);
take2 = Bmc.stopRecording;
check.(Bmc.clip(\take2) === take2, "named clip lookup failed");

// Clip composition delegates to the existing frame merge implementation.
combined = Bmc.combineClips(\take1, \take2, \leftArm, \combined);
check.(Bmc.bone(combined.frameAt(0), \LeftHand) == Array.fill(7, 1.0),
	"combined clip did not copy the left hand");
check.(Bmc.bone(combined.frameAt(0), \RightHand) == Array.fill(7, 0.0),
	"combined clip changed an unselected bone");

// Selection, renaming, save/load, and removal.
Bmc.selectClip(\take1);
Bmc.renameClip(\take1, \firstTake);
check.(Bmc.clip(\firstTake) === take1, "clip rename failed");
savedPath = "/private/tmp/bmc_facade_draft_test.archive";
Bmc.saveClip(\firstTake, savedPath);
Bmc.loadClip(savedPath, \loadedTake);
check.(Bmc.clip(\loadedTake).size == 2, "saved clip did not load");
Bmc.removeClip(\loadedTake);
check.(Bmc.clip(\loadedTake).isNil, "clip removal failed");
File.delete(savedPath);

// Human-readable SCD storage round trip.
scdPath = "/private/tmp/bmc_facade_draft_test.scd";
Bmc.saveClipScd(\firstTake, scdPath);
Bmc.loadClip(scdPath, \loadedScdTake);
check.(Bmc.clip(\loadedScdTake).size == 2, "SCD clip did not load");
check.(Bmc.clip(\loadedScdTake).timeAt(0) == 0.0,
	"SCD clip did not begin at relative time zero");
check.(Bmc.clip(\loadedScdTake).frameAt(1) == take1.frameAt(1),
	"SCD round trip changed a frame");
Bmc.removeClip(\loadedScdTake);
File.delete(scdPath);

// Live source wiring into a composite avatar.
composite = Bmc.addAvatar(\composite, "composite");
wire = Bmc.wire("camera-b", \leftArm, \composite, "avatar-b");
Bmc.dispatcher.receive(makeFrame.("avatar-b", "camera-b", 3, 0.2, 2.0), 20.2);
check.(Bmc.bone(composite.currentFrame.asOSCMessage, \LeftHand) == Array.fill(7, 2.0),
	"live wire did not update the composite avatar");
Bmc.unwire(wire);
check.(Bmc.wires.isEmpty, "Bmc.unwire did not remove the wire");

// Playback controls configure the delegated player.
Bmc.selectClip(\firstTake);
Bmc.rate(0.5);
Bmc.loop(true);
Bmc.seek(0.05);
check.(Bmc.player.rate == 0.5, "playback rate was not delegated");
check.(Bmc.player.looping, "loop setting was not delegated");

check.(Bmc.listClips.includes(\firstTake), "Bmc.listClips omitted a clip");
check.(Bmc.status[\clipCount] == 3, "Bmc status clip count is wrong");

Bmc.reset;
"PASS: Bmc facade draft tests".postln;
)
