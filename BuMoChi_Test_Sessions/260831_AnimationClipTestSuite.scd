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
//: 5 ===== Swtitch avatar control from camera
// 5a Control Ishidomaru from camera.

// 5b Control Mother from camera.

// 5c switch back: Control Ichidomaru from camera again.


//: 6 ===== Animate from camera and saved clip - combine camera and clip on 1 avatar 
// Control left arm/hand of Mother from recorded clip, and
// control the rest of Mother's body and head and face from camera.

