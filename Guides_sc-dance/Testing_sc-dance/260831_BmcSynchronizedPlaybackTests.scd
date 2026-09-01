// Shared absolute start-time playback test.
(
var check = { |condition, message|
	if(condition.not) { Error("FAIL: %".format(message)).throw };
};
var pose = BmcPose.neutral;
var clip = BmcMocapClip([
	[0.0, BmcFrame("test", "clip", 0, 0.0, pose).asOSCMessage],
	[0.05, BmcFrame("test", "clip", 1, 0.05, pose).asOSCMessage]
]);
var sentA = List.new;
var sentB = List.new;
var playerA = BmcClipPlayer(clip, { |message|
	sentA.add([SystemClock.seconds, BmcFrame.fromOSC(message).frameID])
}, \syncA);
var playerB = BmcClipPlayer(clip, { |message|
	sentB.add([SystemClock.seconds, BmcFrame.fromOSC(message).frameID])
}, \syncB);
var startTime = SystemClock.seconds + 0.1;

playerA.playAt(startTime);
playerB.playAt(startTime);

Routine({
	0.13.wait;
	check.(sentA.notEmpty and: { sentB.notEmpty }, "synchronized players emitted no frame");
	check.(sentA.first[1] == sentB.first[1], "players began on different clip frames");
	check.((sentA.first[0] - sentB.first[0]).abs < 0.005,
		"players did not begin on the same scheduled clock instant");
	playerA.stop;
	playerB.stop;
	"PASS: Bmc synchronized playback tests".postln;
	0.exit;
}).play(SystemClock);
)
