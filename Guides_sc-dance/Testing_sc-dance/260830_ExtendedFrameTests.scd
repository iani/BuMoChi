(
var pose = BmcPose.neutral;
var extension = [
	1, \LeftIndexProximal, 0.01, 0.02, 0.03, 0.0, 0.0, 0.1, 0.995,
	2, \Blink, 0.75, \Joy, 0.25
];
var frame = BmcFrame("Ishidomaru", "extended-test", 42, 1.25, pose, 3, nil, extension);
var routeFree = frame.asOSCMessage;
var routed = frame.withTargetPort(39539).asOSCMessage;
var parsed;

Bmc.validateMessage(routeFree, "extended route-free test");
Bmc.validateMessage(routed, "extended routed test");
parsed = BmcFrame.fromOSC(routed);
if(parsed.protocolVersion != 4) { Error("expected routed version 4").throw };
if(parsed.targetPort != 39539) { Error("target port was not preserved").throw };
if(parsed.extension != extension) { Error("extended payload was not preserved").throw };
if(parsed.withoutRoute.protocolVersion != 3) { Error("expected route-free version 3").throw };
if(parsed.withAvatar("Mother").extension != extension) {
	Error("avatar reassignment lost the extended payload").throw
};
"BMC_EXTENDED_FRAME_TEST_OK".postln;
0.exit;
)
