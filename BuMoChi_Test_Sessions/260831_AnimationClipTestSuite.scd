//; 0 --------- Setup full application pipeline ------------
//: Check port numbers for XR Animator etc:
Bmc.help; // XR-Animator output port: 39537
// !!! Start and configure XR-Animator
// !!! Start BunrakuOSCEncoder and Decoder
// On terminal: 
//: Test frame reception XR-Animator -> SC
Bmc.showDispatcherStatus;
//: 1 ================== Animate from camera =====================
// Open Godot, load and run project Seed_2_Ishidomaru_C
//: 2 ================== Animate from saved clip =====================
//: List clips
Bmc.listClips;
//: play clip: \zoom_test LOOPING
Bmc.play(\zoom_test, loop: true);  // this shows clip only:
// NOTE: !!!!! Per default, clip playback overrides xr-animator input.
//: 3 ===== Switch to animating from camera only  =====================
//: 3a Remove clip player from compositor stack by muting
Bmc.mutePlayback; // implies: Bmc.mutePlayback(\default);
// The clip player continues playing, but does not write to compositor.
//: 3b Add player back to the compositor
Bmc.unmutePlayback; // implies: Bmc.unmutePlayback(\default);
//: 3c Version c: 
// Stop the clip playback.
// CLip is stored as \default because no clip player name was given when starting
Bmc.stopPlayback(\default);
// Stopping the clip playback restores camera animation
// if no other clips are running.

//:============================================================ 
//: 4 ===== Animate from camera and saved clip - show camera and clip on separate avatars 
//: 4a Load the required two-avatar Godot project
// 1. Stop the currently running scene in Godot.
// 2. In the Godot Project Manager, choose Import.
// 3. Select:
//    AppsAndCode/GodotProjects/Seed_4_Mother_Ishidomaru_E/project.godot
// 4. Import and open Seed_4_Mother_Ishidomaru_E.
// 5. Run its main scene.
// Its VMC input ports are:
// Ishidomaru: 39539 (standard default)
// Mother: 39540

//: 4b Keep the BuMoChi pipeline and decoder running
// Do not restart BunrakuOSCDecoder. start_bumochi_pipeline.sh starts it without
// an --allow-target-port list, so the decoder accepts every valid routed target
// port. The same decoder on 39538 can therefore dispatch Ishidomaru to 39539 and
// Mother to 39540. This applies after starting the pipeline with the current
// version of start_bumochi_pipeline.sh.

//: 4c Register and route both avatars in Bmc
// Ishidomaru receives the live XR-Animator/camera stream on Godot port 39539.
// Mother receives the saved clip on Godot port 39540.
(
~ishidomaru = Bmc.avatar(\Ishidomaru);
~ishidomaru.vmcPort_(39539);

~mother = Bmc.avatar(\Mother);
if(~mother.isNil) {
	~mother = Bmc.addAvatar(\Mother, "Mother");
};
~mother.vmcPort_(39540);
)
//: Check that Bmc reports both output routes:
Bmc.help;

//: 4d Use the standard live camera source for Ishidomaru
// XR-Animator should continue sending VMC to BunrakuOSCEncoder.
// BunrakuOSCEncoder must identify the incoming stream with:
// Avatar: Ishidomaru
// This is the launcher's default, so no encoder restart is needed. Move in front
// of the camera: only Ishidomaru should follow the live motion.

//: 4e Play zoom_test independently on Mother
// The player name \motherZoom identifies this playback instance.
// The avatar name \Mother selects Mother's compositor and port 39540.
Bmc.play(
	\zoom_test,
	loop: true,
	playerName: \motherZoom,
	avatarName: \Mother
);
// Expected result:
// Ishidomaru follows XR-Animator/camera motion on port 39539.
// Mother loops zoom_test independently on port 39540.

//: 4f Optional playback checks and controls
Bmc.player(\motherZoom).inspect;
// Temporarily reveal any lower-priority source assigned to Mother while the
// clip continues advancing:
Bmc.mutePlayback(\motherZoom);
Bmc.unmutePlayback(\motherZoom);
// Stop only Mother's clip player and remove its compositor cache:
Bmc.stopPlayback(\motherZoom);
//: 5 ===== Switch avatar control from camera
// These operations change only Bmc's live source route. XR-Animator, the
// encoder, decoder, OSCGroups client, and Godot continue running unchanged.

//: 5a Control Ishidomaru from camera
// Allow at least one XR-Animator frame to reach Bmc first. Bmc can then infer
// the encoder's source name from the latest frame labelled Ishidomaru.
Bmc.cameraTarget_(\Ishidomaru);
// Expected: Ishidomaru follows the camera on Godot port 39539; Mother is still.
Bmc.cameraSource.postln;
Bmc.cameraTarget.postln;
Bmc.motionSourceRoutes.postln;

//: 5b Switch camera control to Mother
Bmc.cameraTarget_(\Mother);
// The old Ishidomaru camera cache is removed. The next camera frame creates a
// cache in Mother's compositor and is emitted with Mother's port 39540.
// Expected: Mother follows the camera; Ishidomaru becomes still.
Bmc.cameraTarget.postln;
Bmc.avatar(\Mother).sources.do(_.postln);

//: 5c Switch camera control back to Ishidomaru
Bmc.cameraTarget_(\Ishidomaru);

//: 6 ===== Animate from camera and saved clip - combine camera and clip on 1 avatar 
// Control left arm/hand of Mother from recorded clip, and
// control the rest of Mother's body and head and face from camera.

//: 6a Complete setup after a fresh SuperCollider library compile
// Before evaluating this block:
// 1. Run Godot project Seed_4_Mother_Ishidomaru_E.
// 2. Keep start_bumochi_pipeline.sh running with its defaults.
// 3. Start XR-Animator and send VMC to 127.0.0.1:39537.
(
~ishidomaru = Bmc.avatar(\Ishidomaru);
~ishidomaru.vmcPort_(39540);

~mother = Bmc.avatar(\Mother);
if(~mother.isNil) {
	~mother = Bmc.addAvatar(\Mother, "Mother");
};
~mother.vmcPort_(39539);

// This workstation's default launcher source is 192-xr-animator. Setting it
// explicitly makes the exercise independent of post-recompile discovery.
Bmc.cameraSource_('192-xr-animator');
)

//: 6b Route the full live camera frame to Mother
Bmc.cameraTarget_(\Mother);
// IMPORTANT: wait until Mother is visibly following the camera before running
// 6c. This lets Mother's camera cache enter the stack first. The partial clip
// cache added next will then have authority only over the selected left arm.

//: 6c Add synchronized zoom_test left-arm layers to both avatars
// Both players are given the same future SystemClock time. They therefore read
// the same clip frame together instead of acquiring a small sequential offset.
(
~leftArmSyncTime = SystemClock.seconds + 0.2;

Bmc.play(
	\zoom_test,
	loop: true,
	playerName: \motherLeftArm,
	avatarName: \Mother,
	compositionRule: \leftArm,
	startTime: ~leftArmSyncTime
);

Bmc.play(
	\zoom_test,
	loop: true,
	playerName: \ishidomaruLeftArmCheck,
	avatarName: \Ishidomaru,
	compositionRule: \leftArm,
	startTime: ~leftArmSyncTime
);
)
// Expected result on Mother:
// - LeftShoulder, LeftUpperArm, LeftLowerArm, and LeftHand come from zoom_test.
// - Every other body bone comes from the live camera cache.
// - Head and facial extension data remain those of the camera frame because
//   the clip's structural rule replaces only the four left-arm bones.
// Expected counter-check on Ishidomaru:
// - The same four left-arm bones come from the same clip frame at the same time.
// - His remaining bones use the reference pose because no full-body source is
//   assigned to Ishidomaru in this exercise.
// Mother's and Ishidomaru's recorded left-arm movements should match exactly.

//: 6d Inspect Mother's newest-first compositor stack
Bmc.avatar(\Mother).sources.do(_.postln);
Bmc.avatar(\Ishidomaru).sources.do(_.postln);
// Expected order: motherLeftArm first, camera source below it.
Bmc.player(\motherLeftArm).compositionRule.postln; // canonical left-arm bones
Bmc.player(\ishidomaruLeftArmCheck).compositionRule.postln;

//: 6e Compare mute, unmute, freeze, and stop
Bmc.mutePlayback(\motherLeftArm);
// Whole Mother now follows the camera; the clip keeps advancing invisibly.
Bmc.unmutePlayback(\motherLeftArm);
// The next clip frame restores recorded control of the left arm.
Bmc.freeze(\motherLeftArm);
// The recorded left arm holds its current pose while the camera-driven body,
// head, and face continue moving.
Bmc.resume(\motherLeftArm);

//: 6f Finish the composition test
Bmc.stopPlayback(\motherLeftArm);
Bmc.stopPlayback(\ishidomaruLeftArmCheck);
// Stop removes only the partial clip cache. Whole Mother follows the camera.
// Restore the standard camera target for the next exercise or shutdown:
Bmc.cameraTarget_(\Ishidomaru);

//: 7 ===== Algorithmically change the positions of avatars on the horizontal plane
// Mother and Ishidomaru move around in circles, always facing in the same
// direction, while Mother is animated from the camera and Ishidomaru from a
// saved clip.
//
// This example modifies each completed frame immediately before Bmc sends it
// to the decoder. It replaces the Hips X/Z coordinates and fixes the Hips
// rotation at the identity quaternion. Hips Y and all local joint rotations
// remain animated. Thus both figures face the same fixed stage direction.
// In Godot's Y-up coordinates, X/Z form the horizontal plane.
//
// IMPORTANT LIMITATION: fixing the Hips quaternion also suppresses root-axis
// rotation from the animation source. For example, if the XR-Animator performer
// turns in a pirouette, the camera-controlled figure continues facing the fixed
// stage direction. This is intentional in this low-level exercise, but is not
// appropriate when source orientation must be preserved. Exercise 8 fixes this:
// BmcPositionModifier changes only Hips position and retains its quaternion.

//: 7a Complete setup after a fresh SuperCollider library compile
// Before evaluating this block:
// 1. Run Godot project Seed_4_Mother_Ishidomaru_E.
// 2. Keep start_bumochi_pipeline.sh running with its defaults.
// 3. Start XR-Animator and send VMC to 127.0.0.1:39537.
//
// A SuperCollider recompile recreates only the default Ishidomaru avatar;
// therefore Mother must be registered again when this exercise is run alone.
(
~ishidomaru = Bmc.avatar(\Ishidomaru);
~ishidomaru.vmcPort_(39540);

~mother = Bmc.avatar(\Mother);
if(~mother.isNil) {
	~mother = Bmc.addAvatar(\Mother, "Mother");
};
~mother.vmcPort_(39539);
)

//: 7b Establish the two independent animation sources
// The default pipeline on this workstation uses source 192-xr-animator.
// Set it explicitly so this exercise does not depend on receiving/discovering
// a frame before the route is established.
(
Bmc.cameraSource_('192-xr-animator');
Bmc.cameraTarget_(\Mother);

Bmc.play(
	\zoom_test,
	loop: true,
	playerName: \ishidomaruCircleClip,
	avatarName: \Ishidomaru,
	compositionRule: \overwrite
);
)
//: Tests
// Expected before continuing: Mother follows the camera and Ishidomaru loops
// zoom_test. Ishidomaru is intentionally NOT camera-controlled in this exercise.
// Wait until both avatars are visibly animated before evaluating 7c.

// Optional diagnostics if either avatar is still:
Bmc.cameraSource.postln;                    // expected: 192-xr-animator
Bmc.cameraTarget.postln;                    // expected: Mother
Bmc.motionSourceRoutes.postln;              // camera route -> Mother
Bmc.player(\ishidomaruCircleClip).inspect;  // clip output/avatar -> Ishidomaru
Bmc.avatar(\Ishidomaru).sources.do(_.postln);
Bmc.avatar(\Mother).sources.do(_.postln);

//: 7c Install an outgoing position modifier for each avatar
(
~avatarCirclePhase = 0.0;
~avatarCircleRadius = 0.8; // metres
~avatarCircleCenterX = -0.4; // shift the entire scene left on the stage
~avatarCircleBasePeriod = 8.0; // Mother's seconds per revolution

~placeAvatarOnCircle = { |message, phaseOffset = 0.0, phaseRate = 1.0|
	var frame = BmcFrame.fromOSC(message);
	var pose = frame.pose.copy;
	var hips = pose.at(\Hips).asArray;
	var angle = (~avatarCirclePhase * phaseRate) + phaseOffset;

	// Preserve the source's vertical position and complete animation, but place
	// its root at an absolute X/Z point on the circle.
	hips[0] = ~avatarCircleCenterX + (angle.cos * ~avatarCircleRadius);
	hips[2] = angle.sin * ~avatarCircleRadius;
	hips[3] = 0.0;
	hips[4] = 0.0;
	hips[5] = 0.0;
	hips[6] = 1.0;
	pose.put(\Hips, hips);
	Bmc.sendOutput(frame.withPose(pose).asOSCMessage);
};

// Ishidomaru moves counter-clockwise at 2/3 of Mother's angular speed.
Bmc.avatar(\Ishidomaru).output_({ |message|
	~placeAvatarOnCircle.(message, 0.0, 2.0/3.0)
});
// PI starts Mother on the opposite side. The negative rate makes her move
// clockwise, in the direction opposite to Ishidomaru.
Bmc.avatar(\Mother).output_({ |message|
	~placeAvatarOnCircle.(message, pi, -1.0)
});
)

//: 7d Start the circular movement clock
(
~avatarCircleRoutine.tryPerform(\stop);
~avatarCircleRoutine = Routine({
	var previousTime = SystemClock.seconds;
	var now, elapsed;
	loop {
		now = SystemClock.seconds;
		elapsed = now - previousTime;
		previousTime = now;
		~avatarCirclePhase = (~avatarCirclePhase
			+ (elapsed * 2pi / ~avatarCircleBasePeriod));
		(1 / 60).wait;
	}
}).play(AppClock);
)
// Expected result:
// - Mother continues performing the live camera motion.
// - Ishidomaru continues performing zoom_test.
// - They begin on opposite sides of the same left-shifted circle.
// - Ishidomaru moves counter-clockwise and Mother moves clockwise.
// - Their angular-speed ratio is 2:3 (Ishidomaru takes 12 seconds per
//   revolution; Mother takes 8 seconds).
// - Both keep the same fixed forward orientation; they do not turn in the
//   direction of travel or turn to face each other.
// Live controls:
// ~avatarCircleRadius = 1.5;
// ~avatarCircleCenterX = -0.6;
// ~avatarCircleBasePeriod = 4.0; // Mother 4 seconds; Ishidomaru 6 seconds

//: 7e Stop the movement and restore normal Bmc output
(
~avatarCircleRoutine.tryPerform(\stop);
~avatarCircleRoutine = nil;
Bmc.avatar(\Ishidomaru).output_({ |message| Bmc.sendOutput(message) });
Bmc.avatar(\Mother).output_({ |message| Bmc.sendOutput(message) });
Bmc.stopPlayback(\ishidomaruCircleClip);
)
// The avatars stop receiving the circular X/Z replacement. Mother remains
// routed to the camera; Ishidomaru's test clip is stopped and removed from
// its compositor stack.

//: 8 ===== Move the avatars with reusable Bmc position modifiers
// This repeats the spatial idea from exercise 7 through the public modifier
// API. Exercise 7 remains above as an explicit low-level frame-transform example.
// Unlike exercise 7, the modifier never replaces the Hips quaternion. Turning
// or pirouetting in XR-Animator therefore remains visible while the figure's
// position is moved algorithmically around the stage.

//: 8a Restore the two animation sources
// Exercise 8 can also be started after a fresh compile, independently of 7.
(
~ishidomaru = Bmc.avatar(\Ishidomaru);
~ishidomaru.vmcPort_(39539);
~mother = Bmc.avatar(\Mother);
if(~mother.isNil) { ~mother = Bmc.addAvatar(\Mother, "Mother") };
~mother.vmcPort_(39540);
)
Bmc.cameraTarget_(\Ishidomaru);
Bmc.play(
	\zoom_test,
	loop: true,
	playerName: \motherModifierClip,
	avatarName: \Mother
);

//: 8b Add one time-dependent absolute-position modifier to each avatar
(
~circleStartTime = SystemClock.seconds;
~circleRadius = 0.8;
~circlePeriod = 8.0;

Bmc.addPositionModifier(
	\ishidomaruOrbit,
	\Ishidomaru,
	{ |time|
		var angle = (time - ~circleStartTime) * 2pi / ~circlePeriod;
		[angle.cos * ~circleRadius, nil, angle.sin * ~circleRadius]
	},
	\replace
);

Bmc.addPositionModifier(
	\motherOrbit,
	\Mother,
	{ |time|
		var angle = ((time - ~circleStartTime) * 2pi / ~circlePeriod) + pi;
		[angle.cos * ~circleRadius, nil, angle.sin * ~circleRadius]
	},
	\replace
);
)
// nil in the Y position preserves each source frame's vertical Hips movement.
// Unlike exercise 7, a positional modifier deliberately does not change root
// rotation. All four Hips quaternion values pass through unchanged, so the
// camera and clip retain their own facing information.

//: 8c Inspect and alter the running modifiers
Bmc.modifierNames.postln;
Bmc.modifier(\ishidomaruOrbit).inspect;
~circleRadius = 1.5;
~circlePeriod = 4.0;

//: 8d Remove the modifiers and finish the test
(
Bmc.removeModifier(\ishidomaruOrbit);
Bmc.removeModifier(\motherOrbit);
Bmc.stopPlayback(\motherModifierClip);
)
// Expected: Ishidomaru follows the camera again on 39539; Mother becomes still.

// If automatic source discovery is ambiguous in a collaborative session, copy
// the exact --source name from the local encoder command/log and set it first:
// Bmc.cameraSource_('192-xr-animator');
// Bmc.cameraTarget_(\Mother);
