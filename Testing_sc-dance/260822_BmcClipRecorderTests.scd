// Draft tests for BmcClipRecorder and BmcMocapClip.
// Recompile the class library before evaluating.
(
var check, makeFrame, recorder, clip, accepted;

check = { |condition, failureMessage|
	if(condition.not) { Error("FAIL: " ++ failureMessage).throw };
};

makeFrame = { |avatar, source, frameID, encoderTime, fill|
	['/bunraku/vmc/frame', 1, avatar, source, frameID, encoderTime]
	++ Array.fill(147, fill)
};

recorder = BmcClipRecorder.new.record(
	argAvatar: "avatar-a",
	argSource: "camera-a",
	argCapturePoint: \rawFrame,
	argMetadata: (performer: "test performer")
);

accepted = recorder.addFrame(makeFrame.("avatar-a", "camera-a", 10, 4.0, 0.0), 100.0);
check.(accepted, "matching frame was rejected");
check.(recorder.addFrame(makeFrame.("avatar-b", "camera-a", 11, 4.1, 1.0), 100.1).not,
	"avatar filter accepted a nonmatching frame");
check.(recorder.addFrame(makeFrame.("avatar-a", "camera-b", 12, 4.2, 1.0), 100.2).not,
	"source filter accepted a nonmatching frame");
recorder.addFrame(makeFrame.("avatar-a", "camera-a", 13, 4.5, 2.0), 100.5);

clip = recorder.stop;
check.(clip.size == 2, "clip does not contain exactly two accepted frames");
check.(clip.timeAt(0) == 0.0, "first relative capture time is not zero");
check.((clip.timeAt(1) - 0.5).abs < 0.0001, "relative capture time was not preserved");
check.(clip.frameAt(1)[4] == 13, "frame metadata was not preserved");
check.(clip.frameAt(1)[5] == 4.5, "encoder timestamp was not preserved");
check.(clip.avatar == "avatar-a", "clip avatar is wrong");
check.(clip.source == "camera-a", "clip source is wrong");
check.(clip.metadata[\capturePoint] == \rawFrame, "capture point metadata is wrong");
check.(clip.metadata[\performer] == "test performer", "caller metadata was lost");
check.(recorder.addFrame(makeFrame.("avatar-a", "camera-a", 14, 5.0, 3.0), 101.0).not,
	"stopped recorder accepted another frame");

"PASS: BmcClipRecorder tests".postln;
)
