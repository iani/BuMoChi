// BuMoChi audio-and-video recording test
// Execute one block at a time in Emacs. Lines beginning with //: separate blocks.

//: ---- 1. Boot the SuperCollider server
Server.default.boot;

//: ---- 2. Select a loaded clip
// Replace \ishidomaru1 if necessary. Bmc.listClips posts the available names.
Bmc.listClips;
~recordingTestClip = \ishidomaru1;
if(Bmc.clip(~recordingTestClip).isNil) {
	Error("Load or select an existing Bmc clip before running the recording test").throw;
};

//: ---- 3. Inspect or choose the recording folder
Bmc.videoRecordingFolder.postln;

// To store recordings on an external disk, evaluate one of these separately:
// Bmc.chooseVideoRecordingFolder;
// Bmc.videoRecordingFolder_("/Volumes/ExternalDisk/BuMoChi Recordings");

//: ---- 4. Add a simple test SynthDef
SynthDef(\bmcRecordingTestTone, { |out = 0, freq = 220, amp = 0.04|
	var tone = SinOsc.ar(freq.lag(0.06));
	var pulse = LFPulse.kr(2, width: 0.2).range(0.35, 1.0);
	var envelope = amp.lag(0.08) * pulse;
	Out.ar(out, (tone * envelope).dup);
}).add;

//: ---- 5. Map clip movement to pitch and amplitude
~recordingTestSonification = BmcLiveSonification(
	\bmcRecordingTestTone,
	[
		BmcSonificationMapping.absolute(
			\Hips, \x, \freq,
			[-0.5, 0.5],
			[140, 900]
		),
		BmcSonificationMapping.rate(
			\RightHand, \y, \amp,
			[-2.0, 2.0],
			[0.015, 0.12]
		)
	],
	[\amp, 0.04]
);

//: ---- 6A. Optional audio-only test
// This creates a WAV and SCD metadata file, without recording the screen.
Bmc.sonifyTake(
	~recordingTestClip,
	~recordingTestSonification,
	record: true,
	screenCapture: false
);

//: ---- 6B. Audio-and-screen recording test
// Stop the audio-only test before running this block.
// Put the visible Godot animation on FFmpeg's Capture screen 0,
// normally the first/main macOS display.
// The first run may require macOS Screen Recording permission.
Bmc.sonifyTake(
	~recordingTestClip,
	~recordingTestSonification,
	record: true,
	screenCapture: true,
	loop: false,
	rate: 1.0,
	startFrame: 0,
	endFrame: nil
);

//: ---- 7. Inspect the active or most recent take
Bmc.takeStatus.postln;

//: ---- 8. Stop early if required
// Normal non-looping takes stop automatically at the clip's final frame.
Bmc.stopTake;
