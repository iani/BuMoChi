// Run in a separate language session. No pipeline or Godot scene is launched.
(
var check = { |ok, message| if(ok.not) { Error("FAIL: " ++ message).throw } };
var frame = { |x, sign = 1|
    var pose = BmcPose.neutral;
    pose.put(\Hips, [x, 0, 0, 0, 0, 0, sign]);
    BmcFrame("test", "repertoire", 0, 0, pose)
};
var a = BmcClip([[0, frame.(0).asOSCMessage], [2, frame.(2).asOSCMessage]], name: \a);
var b = BmcClip([[0, frame.(4, -1).asOSCMessage], [1, frame.(5, -1).asOSCMessage]], name: \b);
var before = a.asArray.asCompileString;
var mixed, generated, repeat, different, rejected = false;
try {
    Bmc.stopCompositor; Bmc.forwardDecoder_(false);
    mixed = BmcSceneCompositor.blendFrames(frame.(0), frame.(2, -1), 0.5);
    check.(mixed.pose.at(\Hips).x == 1, "position interpolation");
    check.(mixed.pose.at(\Hips).rotation.squared.sum.round(0.00001) == 1, "quaternion normalization");
    check.(mixed.pose.at(\Hips).qw.abs == 1, "antipodal quaternion short path");
    check.(BmcSceneCompositor.sample(a, 1).pose.at(\Hips).x == 1, "time interpolation");
    generated = BmcSceneCompositor.generate([a, b], 3.25, 1, 0.2, 0.25, 42, 30);
    repeat = BmcSceneCompositor.generate([a, b], 3.25, 1, 0.2, 0.25, 42, 30);
    different = BmcSceneCompositor.generate([a, b], 3.25, 1, 0.2, 0.25, 43, 30);
    check.(generated.asArray.asCompileString == repeat.asArray.asCompileString, "seed reproducibility");
    check.(generated.asArray.asCompileString != different.asArray.asCompileString, "new seed variation");
    check.(generated.duration == 3.25, "requested duration");
    check.(generated.metadata[\phrases].collect { |item| item[\clip] }.asSet.size == 2, "uses repertoire");
    check.(a.asArray.asCompileString == before, "modified source clip");
    generated.frames.doAdjacentPairs { |left, right| check.(right[0] > left[0], "timestamps"); };
    generated.frames.do { |entry|
        var typed;
        Bmc.validateMessage(entry[1]);
        typed = BmcFrame.fromOSC(entry[1]);
        Bmc.boneNames.do { |bone|
            check.((typed.pose.at(bone).rotation.squared.sum - 1).abs < 0.00001, "rotation validity")
        }
    };
    check.(BmcSceneCompositor.generate([a], 1, 0.5, 0, 0, 1).duration == 1, "single-clip / no-blend case");
    try { BmcSceneCompositor.generate([], 1) } { rejected = true };
    check.(rejected, "empty repertoire accepted");
    rejected = false;
    try { BmcSceneCompositor.generate([a], 1, 1, 1) } { rejected = true };
    check.(rejected, "invalid blend accepted");
    "PASS: SceneCompositor generation, interpolation, seed, routing-free frames, and validation".postln;
    0.exit;
} { |error| error.reportError; 1.exit };
)
