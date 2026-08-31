// Newest-first cached source stack and composition tests.
(
var check = { |condition, message|
	if(condition.not) { Error("FAIL: %".format(message)).throw };
};
var makeFrame = { |avatar, source, value|
	var pose = BmcPose.neutral;
	Bmc.boneNames.do { |bone|
		pose.put(bone, [value, value, value, 0.0, 0.0, 0.0, 1.0]);
	};
	BmcFrame(avatar, source, value.asInteger, value, pose)
};
var avatar = BmcAvatar(\stage, "stage");
var lastMessage;
var leftOnly;

avatar.output_({ |message| lastMessage = message });

// First-seen direct streams become overwrite caches. A later-added stream is
// placed at index zero and retains authority when an older cache updates.
avatar.receiveSourceFrame(makeFrame.("stage", "local", 1.0));
avatar.receiveSourceFrame(makeFrame.("stage", "remote", 2.0));
avatar.sampleAndSend;
check.(avatar.wires[0].source.asString == "remote", "new source was not pushed to stack front");
check.(Bmc.bone(lastMessage, \Hips)[0] == 2.0, "new overwrite source did not win");
avatar.receiveSourceFrame(makeFrame.("stage", "local", 4.0));
avatar.sampleAndSend;
check.(Bmc.bone(lastMessage, \Hips)[0] == 2.0,
	"older source update incorrectly displaced newer overwrite source");

// A newest partial source replaces only its selected body region.
leftOnly = BmcFrameSource(\leftHands, "hands", "performer", \compose, \leftArm);
avatar.addWire(leftOnly);
avatar.receiveSourceFrame(makeFrame.("performer", "hands", 3.0));
avatar.sampleAndSend;
check.(Bmc.bone(lastMessage, \LeftHand)[0] == 3.0, "partial composition missed left hand");
check.(Bmc.bone(lastMessage, \RightHand)[0] == 2.0, "partial composition changed right hand");

check.(leftOnly.frame.notNil, "source did not cache its latest frame");
check.(leftOnly.mode == \compose, "source did not retain its composition rule");
avatar.removeSource(leftOnly);
avatar.sampleAndSend;
check.(Bmc.bone(lastMessage, \LeftHand)[0] == 2.0,
	"removing newest source did not reveal cached source beneath it");

"PASS: Bmc cached frame-source stack tests".postln;
0.exit;
)
