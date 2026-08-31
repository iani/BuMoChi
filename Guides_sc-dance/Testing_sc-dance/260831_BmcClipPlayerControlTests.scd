// BmcClipPlayer Version 2 control API smoke tests.
(
var check = { |condition, message|
	if(condition.not) { Error("FAIL: %".format(message)).throw };
};
var clip = BmcMocapClip([
	[0.0, BmcFrame("test", "clip", 0, 0.0, BmcPose.neutral).asOSCMessage],
	[0.01, BmcFrame("test", "clip", 1, 0.01, BmcPose.neutral).asOSCMessage],
	[0.02, BmcFrame("test", "clip", 2, 0.02, BmcPose.neutral).asOSCMessage],
	[0.03, BmcFrame("test", "clip", 3, 0.03, BmcPose.neutral).asOSCMessage]
]);
var player = BmcClipPlayer(clip, { |message| message });

check.(player.startFrame == 0, "constructor did not set startFrame");
check.(player.endFrame == 3, "constructor did not set the default endFrame");
player.range_(1, 2);
check.(player.startFrame == 1, "startFrame was not set");
check.(player.endFrame == 2, "endFrame was not set");

player.loop_(true);
player.rate_(2.0);
check.(player.looping, "loop flag was not set");
check.(player.rate == 2.0, "rate was not set");

player.play;
player.freeze;
check.(player.isPaused, "freeze did not pause playback");
player.resume;
check.(player.isPaused.not, "resume left playback paused");
player.stop;

player.restart;
check.(player.currentIndex == 1, "restart did not use startFrame");
player.reset;
check.(player.currentIndex == 1, "reset did not rewind to startFrame");
check.(player.isPlaying.not, "reset did not stop playback");
check.(player.looping, "reset changed the loop flag");
check.(player.rate == 2.0, "reset changed the rate");

// The facade configures the same player API and keeps its playback-only
// controls distinct from Bmc.stop and Bmc.reset.
Bmc.library.add(\controlApiTest, clip);
Bmc.player.output_({ |message| message });
Bmc.play(\controlApiTest, true, 0.5, 1, 2);
check.(Bmc.player.looping, "Bmc.play did not set the loop flag");
check.(Bmc.player.rate == 0.5, "Bmc.play did not set the rate");
check.(Bmc.player.startFrame == 1, "Bmc.play did not set startFrame");
check.(Bmc.player.endFrame == 2, "Bmc.play did not set endFrame");
Bmc.freeze;
Bmc.resume;
Bmc.stopPlayback;
Bmc.restartPlayback;
Bmc.resetPlayback;
check.(Bmc.player.currentIndex == 1, "Bmc.resetPlayback did not rewind");

// Named players can run the same clip independently with different settings.
Bmc.play(\controlApiTest, true, 0.25, 0, 1, \slowStart);
Bmc.addAvatar(\controlTarget, "controlTarget");
Bmc.play(\controlApiTest, false, 2.0, 2, 3,
	\fastEnd, \controlTarget, [\leftArm, \RightHand]);
check.(Bmc.player(\slowStart) !== Bmc.player(\fastEnd),
	"named playback reused one player instance");
check.(Bmc.player(\slowStart).name == \slowStart, "slow player name is wrong");
check.(Bmc.player(\slowStart).rate == 0.25, "slow player rate is wrong");
check.(Bmc.player(\slowStart).startFrame == 0, "slow player range is wrong");
check.(Bmc.player(\fastEnd).rate == 2.0, "fast player rate is wrong");
check.(Bmc.player(\fastEnd).startFrame == 2, "fast player range is wrong");
check.(Bmc.player(\fastEnd).avatar === Bmc.avatar(\controlTarget),
	"player did not retain its target avatar");
check.(Bmc.player(\fastEnd).compositionRule.includes(\LeftHand),
	"player did not normalize its composition rule");
check.(Bmc.player(\fastEnd).compositionRule.includes(\RightHand),
	"player did not retain an exact canonical bone in a mixed rule");
Bmc.freeze(\slowStart);
check.(Bmc.player(\slowStart).isPaused, "named freeze targeted the wrong player");
check.(Bmc.player(\fastEnd).isPaused.not, "named freeze affected another player");
Bmc.stopPlayback(\slowStart);
Bmc.stopPlayback(\fastEnd);
Bmc.removePlayer(\slowStart);
Bmc.removePlayer(\fastEnd);
check.(Bmc.playerNames.includes(\slowStart).not, "removePlayer retained slowStart");
Bmc.library.remove(\controlApiTest);

"PASS: BmcClipPlayer Version 2 control API tests".postln;
)
