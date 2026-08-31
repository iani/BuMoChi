// Tests runtime motion-source retargeting before avatar composition.
(
var check = { |condition, message|
	if(condition.not) { Error("FAIL: " ++ message).throw };
};
var source = \routing_test_camera;
var mother = Bmc.avatar(\routingTestMother);
var frame;

if(mother.isNil) { mother = Bmc.addAvatar(\routingTestMother, "routingTestMother") };
frame = BmcFrame("Ishidomaru", source.asString, 1, 0.0, BmcPose.neutral).asOSCMessage;

Bmc.routeMotionSource(source, \routingTestMother);
Bmc.dispatcher.receive(frame, 1.0);
check.(mother.sources.any { |item| item.source.asString == source.asString },
	"routed camera source did not reach the selected avatar");
check.(Bmc.avatar(\Ishidomaru).sources.any { |item| item.source.asString == source.asString }.not,
	"routed camera source also reached its encoder-labelled avatar");

Bmc.routeMotionSource(source, \Ishidomaru);
check.(mother.sources.any { |item| item.source.asString == source.asString }.not,
	"retargeting did not remove the old avatar cache");
Bmc.dispatcher.receive(frame.copy.put(4, 2), 2.0);
check.(Bmc.avatar(\Ishidomaru).sources.any { |item| item.source.asString == source.asString },
	"retargeted camera source did not reach Ishidomaru");

Bmc.cameraSource_(source);
Bmc.cameraTarget_(\routingTestMother);
check.(Bmc.cameraTarget == \routingTestMother, "cameraTarget_ did not retain its target");
check.(Bmc.motionSourceRoutes[source].avatarID == \routingTestMother,
	"cameraTarget_ did not update the source route");

Bmc.removeMotionSourceRoute(source);
"PASS: Bmc runtime motion-source routing tests".postln;
0.exit;
)
