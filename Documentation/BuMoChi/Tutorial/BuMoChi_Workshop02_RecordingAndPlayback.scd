// BuMoChi Workshop — Oulu
// Companion code for Documentation/BuMoChi/Tutorial (chapters 03–08).
//
// Run ONE line or ONE parenthesized block at a time, from top to bottom.
//   macOS:          Cmd-Return        stop everything: Cmd-Period
//   Linux/Windows:  Ctrl-Return       stop everything: Ctrl-Period
// Never select the whole file and run it.

//: Open the Assets window
// Opens the BuMoChi Asset Editor. Use it to browse Godot projects and scenes,
// inspect avatar targets, record motion clips, and configure clip playback
// presets such as frame range, speed, looping and the body parts controlled.
Bmc.assetEditor;

//: Open the SceneCompositor window
// Opens the scene composition window (currently named SceneCompositor in BuMoChi).
// Use it to select recorded gesture clips and a scene, generate a performance
// from that repertoire, preview it, and save the generated motion as a new clip.
Bmc.sceneCompositor;

//: ================= 03 FIRST RUN =================
// Godot running VMC_1_Avatar_M, launcher running, XR-Animator sending to 127.0.0.1:39537.

Bmc.showDispatcherStatus;     // "received" should climb while you move
Bmc.help;                     // port numbers in use
Bmc.status;

//: ================= 05 RECORD AND PLAY BACK =================

//: Record a take: run, move for about five seconds, then stop.
Bmc.record(\take1);
//:
Bmc.stopRecording;

//: Inspect
Bmc.listClips;
Bmc.clip(\take1).duration;
Bmc.clip(\take1).size;

//: Silence the camera before playing clips
Bmc.stopCameraAnimation;

//: Play
Bmc.play(\take1);
Bmc.play(\take1, loop: true);
Bmc.pause;
Bmc.resume;
Bmc.stopPlayback;

//: Change time
Bmc.play(\take1, loop: true, rate: 0.5);
Bmc.play(\take1, loop: true, rate: 2);
Bmc.play(\take1, loop: true, rate: 0.1);
Bmc.play(\take1, loop: true, startFrame: 60, endFrame: 180);
Bmc.play(\take1, loop: true, startFrame: 100, endFrame: 112);
Bmc.stopPlayback;

//: Give the body back to the camera
Bmc.cameraTarget_(\Ishidomaru);

//: Two more takes for chapter 06.
// legTake: legs move, arms hang still.
Bmc.record(\legTake);
//:
Bmc.stopRecording;

//: armTake: stand still, move only the arms.
Bmc.record(\armTake);
//:
Bmc.stopRecording;

//: Clip list window
Bmc.showClips;

//: ================= 06 COMPOSE MOVEMENT =================

//: Part A — one body from two takes
Bmc.combineClips(\legTake, \armTake, \arms, \hybrid);
Bmc.stopCameraAnimation;
Bmc.play(\hybrid, loop: true);
Bmc.saveClipScd(\hybrid);

//: Single bones instead of a group
Bmc.combineClips(\legTake, \armTake, [\Head, \Neck], \otherHead);
Bmc.play(\otherHead, loop: true);

//: Arms one second behind the body
Bmc.combineClips(\take1, \take1, \arms, \canon, 60);
Bmc.play(\canon, loop: true);

//: Part B — position modifiers
Bmc.addPositionModifier(\aside, \Ishidomaru, [0.5, nil, nil]);
Bmc.removeModifier(\aside);

//: Orbit: change 8 (seconds per circle) or 0.5 (radius) and run again
(
~start = SystemClock.seconds;
Bmc.addPositionModifier(\orbit, \Ishidomaru, { |time|
	var angle = (time - ~start) * 2pi / 8;
	[angle.cos * 0.5, nil, angle.sin * 0.5]
});
)

//: Lift, added to the existing movement
Bmc.addPositionModifier(\lift, \Ishidomaru, [0, 0.3, 0], \add);

//: Remove everything and return to the camera
Bmc.clearModifiers;
Bmc.stopPlayback;
Bmc.cameraTarget_(\Ishidomaru);

//: Part C (optional) — two characters. Godot must be running VMC_2_Avatars.
// In that project: Mother listens on 39539, Ishidomaru on 39540.
(
Bmc.avatar(\Ishidomaru).vmcPort_(39540);
~mother = Bmc.avatar(\Mother) ?? { Bmc.addAvatar(\Mother, "Mother") };
~mother.vmcPort_(39539);
)

//: Mother plays a clip; the camera drives Ishidomaru
Bmc.play(\hybrid, loop: true, playerName: \motherPlayer, avatarName: \Mother);
Bmc.cameraTarget_(\Ishidomaru);

//: Swap: the camera drives Mother
Bmc.stopPlayback(\motherPlayer);
Bmc.cameraTarget_(\Mother);

//: Back to the single-character project (VMC_1_Avatar_M)
Bmc.cameraTarget_(\Ishidomaru);
Bmc.avatar(\Ishidomaru).vmcPort_(39539);

//: ================= 07 MOVEMENT TO SOUND =================
// Turn your volume down first.

//: Start the sound engine and wait for the green numbers
s.boot;

//: The instrument
(
SynthDef(\workshopTone, { |out = 0, freq = 220, amp = 0.05, pan = 0|
	var signal = SinOsc.ar(freq.lag(0.1));
	Out.ar(out, Pan2.ar(signal * amp.lag(0.1), pan.lag(0.1)));
}).add;
)

//: One mapping: hips left/right -> pitch
(
~sound !? { ~sound.stop };
~sound = BmcLiveSonification(
	\workshopTone,
	[
		BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880])
	],
	[\amp, 0.05]
).start;
)

//:
~sound.stop;

//: Two mappings: add head turn -> stereo position
(
~sound !? { ~sound.stop };
~sound = BmcLiveSonification(
	\workshopTone,
	[
		BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
		BmcSonificationMapping.absolute(\Head, \qy, \pan, [-0.7, 0.7], [-1, 1])
	],
	[\amp, 0.05]
).start;
)

//: Speed instead of position: rising hips -> loudness
(
~sound !? { ~sound.stop };
~sound = BmcLiveSonification(
	\workshopTone,
	[
		BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
		BmcSonificationMapping.rate(\Hips, \y, \amp, [0, 1.5], [0, 0.2])
	]
).start;
)

//:
~sound.stop;

//: Sonify a recorded clip (count-in, then clip and sound together)
(
~clipSound = BmcLiveSonification(
	\workshopTone,
	[
		BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
		BmcSonificationMapping.absolute(\Head, \qy, \pan, [-0.7, 0.7], [-1, 1])
	],
	[\amp, 0.05]
);
Bmc.stopCameraAnimation;
Bmc.sonifyTake(\take1, ~clipSound);
)

//: Variations
Bmc.stopTake;
Bmc.sonifyTake(\take1, ~clipSound, record: true);
Bmc.sonifyTake(\hybrid, ~clipSound, rate: 0.5);

//: ================= 08 A SHORT STUDY (template) =================

//: 0. Prepare
s.boot;
Bmc.stopCameraAnimation;

//: 1. Opening: the slow version
Bmc.play(\take1, loop: true, rate: 0.25);

//: 2. Add the sound (follows the default clip player)
(
~sound !? { ~sound.stop };
~sound = BmcLiveSonification(
	\workshopTone,
	[
		BmcSonificationMapping.absolute(\Hips, \x, \freq, [-0.5, 0.5], [110, 880]),
		BmcSonificationMapping.absolute(\Head, \qy, \pan, [-0.7, 0.7], [-1, 1])
	],
	[\amp, 0.05]
).start(Bmc.player, \frame);
)

//: 3. Full speed, borrowed arms
Bmc.play(\hybrid, loop: true);

//: 4. Carry it away
(
~start = SystemClock.seconds;
Bmc.addPositionModifier(\orbit, \Ishidomaru, { |time|
	var angle = (time - ~start) * 2pi / 8;
	[angle.cos * 0.5, nil, angle.sin * 0.5]
});
)

//: 5. End
(
~sound.stop;
Bmc.clearModifiers;
Bmc.stopPlayback;
)

//: ================= SHUT DOWN =================
Bmc.stopPlayback;
Bmc.clearModifiers;
Bmc.cameraTarget_(\Ishidomaru);
