// Constant-rate compositor and cache-only source update tests.
(
var check = { |condition, message|
	if(condition.not) { Error("FAIL: %".format(message)).throw };
};
var makeFrame = { |value|
	var pose = BmcPose.neutral;
	Bmc.boneNames.do { |bone|
		pose.put(bone, [value, value, value, 0.0, 0.0, 0.0, 1.0]);
	};
	BmcFrame("clocked", "test-source", value.asInteger, SystemClock.seconds, pose)
};
var avatar = BmcAvatar(\clocked, "clocked");
var sent = List.new;
var compositor;
var countAfterStop;
var oldTask, countBeforeRecovery;

avatar.output_({ |message| sent.add([SystemClock.seconds, message]) });
avatar.receiveSourceFrame(makeFrame.(1.0));
check.(sent.isEmpty, "source update emitted before a compositor tick");

compositor = BmcCompositor({ [avatar] }, 40.0);
Routine({
	compositor.start;
	0.13.wait;
	check.(sent.size >= 4, "compositor emitted too few frames");
	check.(sent.size <= 7, "compositor emitted too many frames");
	check.(Bmc.bone(sent.last[1], \Hips)[0] == 1.0,
		"compositor did not sample the latest cache");

	avatar.receiveSourceFrame(makeFrame.(2.0));
	0.04.wait;
	check.(Bmc.bone(sent.last[1], \Hips)[0] == 2.0,
		"cache update was not visible on a later tick");

	// Simulate CmdPeriod's clock clear, then invoke the registered recovery
	// callback. The compositor must replace its infrastructure Routine without
	// clearing the avatar cache.
	oldTask = compositor.task;
	oldTask.stop;
	countBeforeRecovery = sent.size;
	compositor.cmdPeriod;
	check.(compositor.isRunning, "compositor did not restart after CmdPeriod");
	check.(compositor.task !== oldTask, "CmdPeriod reused the stopped Routine");
	0.04.wait;
	check.(sent.size > countBeforeRecovery, "recovered compositor emitted no frames");
	check.(Bmc.bone(sent.last[1], \Hips)[0] == 2.0,
		"CmdPeriod recovery lost the cached camera frame");

	compositor.stop;
	countAfterStop = sent.size;
	0.05.wait;
	check.(sent.size == countAfterStop, "compositor emitted after stop");
	check.(compositor.tickCount >= countAfterStop,
		"compositor tick statistics are inconsistent");

	"PASS: Bmc constant-rate compositor tests".postln;
	0.exit;
}).play(SystemClock);
)
