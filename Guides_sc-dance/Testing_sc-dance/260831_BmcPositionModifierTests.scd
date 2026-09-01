// Positional transformative-composition tests.
(
var check = { |condition, message|
	if(condition.not) { Error("FAIL: %".format(message)).throw };
};
var pose = BmcPose.neutral;
var frame, replaced, added, procedural;

pose.put(\Hips, [1.0, 2.0, 3.0, 0.1, 0.2, 0.3, 0.9]);
frame = BmcFrame("test", "source", 1, 0.0, pose);

replaced = BmcPositionModifier(\replaceXZ, [10.0, nil, 30.0], \replace)
	.applyTo(frame, 2.0);
check.(replaced.pose.at(\Hips).position == [10.0, 2.0, 30.0],
	"replace mode or nil-axis preservation failed");
check.(replaced.pose.at(\Hips).rotation == [0.1, 0.2, 0.3, 0.9],
	"position modifier changed Hips rotation");
check.(frame.pose.at(\Hips).position == [1.0, 2.0, 3.0],
	"position modifier mutated its input frame");

added = BmcPositionModifier(\addXZ, [0.5, nil, -1.0], \add)
	.applyTo(frame, 2.0);
check.(added.pose.at(\Hips).position == [1.5, 2.0, 2.0],
	"add mode failed");

procedural = BmcPositionModifier(\procedural, { |time| [time, nil, time * 2] })
	.applyTo(frame, 4.0);
check.(procedural.pose.at(\Hips).position == [4.0, 2.0, 8.0],
	"Function was not sampled with compositor time");

// Facade registration and removal.
Bmc.stop;
Bmc.addPositionModifier(\facadeTest, \default, [1.0, nil, 2.0]);
check.(Bmc.modifier(\facadeTest).notNil, "facade did not register modifier");
check.(Bmc.avatar.sources.isEmpty, "modifier was incorrectly added as a frame source");
check.(Bmc.avatar.positionModifiers.size == 1, "avatar did not receive modifier");
Bmc.removeModifier(\facadeTest);
check.(Bmc.modifier(\facadeTest).isNil, "facade did not remove modifier");
check.(Bmc.avatar.positionModifiers.isEmpty, "avatar retained removed modifier");

"PASS: Bmc position-modifier tests".postln;
0.exit;
)
