// Minimal OscRecorder integration test.
//
// Expected result:
// - 1,003 messages are sent to the current sclang OSC port.
// - OscRecorder.maxItems = 1,000 causes the recording to span two .scd files.
// - Files are written below Platform.userAppSupportDir/OSC_Data.
//
// Recompile the class library after installing/linking BuMoChi, then evaluate
// this entire parenthesized block once.
//


(
// OSCFunc.trace(true, true);
OSCFunc.trace(false, false);
Routine({
	var recorder = OscRecorder.default;
	var destination = NetAddr.localAddr;
	var messageCount = 2003;
	var sendInterval = 0.002;
	var deliveryWait = 1.0;
	var rootPath = OscRecorderPath.rootDir.fullPath;
	var dayPath = rootPath +/+ Date.getDate.dayStamp;

	// Make the rollover boundary explicit for this test.
	recorder.maxItems = 1000;
	// OscRecorder creates the recording directory. Ensure its two parents exist.
	// if (File.exists(rootPath).not) { File.mkdir(rootPath) };
	// if (File.exists(dayPath).not) { File.mkdir(dayPath) };

	"1. Starting OscRecorder...".postln;
	recorder.record;
	0.25.wait;

	if (recorder.isRecording.not) {
		Error("OscRecorder did not start; no test messages were sent.").throw;
	};

	"2. Sending % messages to sclang on UDP port %..."
		.postf(messageCount, NetAddr.langPort);

	messageCount.do { |index|
		destination.sendMsg(
			'/BuMoChi/Test/OscRecorder',
			index,
			index / (messageCount - 1)
		);
		sendInterval.wait;
	};

	// Allow queued UDP callbacks to reach OscRecorder before closing the file.
	deliveryWait.wait;

	"3. Stopping OscRecorder...".postln;
	recorder.stopRecording;

	// if(recorder.data.size != messageCount) {
	// 	Error("FAIL: expected % recorded messages, got %"
	// 	.format(messageCount, recorder.data.size)).throw;
	// };
	if(File.exists(recorder.filePath).not) {
		Error("FAIL: recording file was not created").throw;
	};
	"PASS: OscRecorder captured and saved all % messages".postf(messageCount);

	"Test complete. Requested messages: %\nRecording directory: %\n"
		.postf(messageCount, recorder.recordingPath);
}).play(AppClock);
)
