// BuMoChi Workshop — Oulu
// 01 Setup and Overview
// First goal: open a Godot scene and animate a character with an existing clip.
// Assumes BuMoChi is installed, its class library has compiled successfully,
// and the workshop Godot projects and animation clips are available.
//
// Evaluate one command at a time in the SuperCollider IDE:
// macOS: Cmd-Return. Linux/Windows: Ctrl-Return.
// Emergency stop for sound and scheduled playback: Cmd-Period / Ctrl-Period.

//: 1. Open the Assets window — our first workshop command
// The Asset Editor brings together Godot projects, scenes, avatar targets,
// recorded animation clips and playback presets. We begin by playing an
// existing movement; recording and composing new movements come later.
Bmc.assetEditor;

//: 2. Start the communication pipeline
// In the Asset Editor, click "Start BMC Pipeline" and wait for startup.
// Read the feedback/status area. Continue once the pipeline is ready and
// the assets have reloaded. If startup fails, ask the workshop leader to
// check the Post window and pipeline logs before continuing.

// Optional for later live capture: click "Open XR-Animator", immediately
// to the right of "Start BMC Pipeline". This opens the bundled macOS app.
// Existing animation playback does not require it. When ready to capture,
// select your camera and enable VMC output in XR-Animator.
// The equivalent SuperCollider command is: Bmc.openXRAnimator;

//: 3. Choose and open a Godot scene
// 1. Select a project in the "Godot projects" list.
// 2. Select a scene in the "Godot Scenes" list.
// 3. Wait for Godot inspection to populate "Scene targets / detected avatars".
// 4. Click "Open Scene".
// 5. Check that the Godot game window appears and "Godot Scene running"
//    is checked in the Asset Editor.
// If the project or clip lists are empty, ask the workshop leader to check
// the assets folder shown near the top of the window, then click "Reload".

//: 4. Choose the character and its movement
// 1. Select the intended character in "Scene targets / detected avatars".
// 2. If the camera button reads "Stop Camera Animation", click it.
//    This prevents live camera movement from competing with the recording.
// 3. Select an existing recording in "Animation clips".
// 4. If presets are listed, select the one you want to try.
// 5. Click "Play" and watch the character in the Godot window.
// 6. Click "Stop" to stop this playback.
//
// "Add to Scene" is not required for this first preview. Play uses the
// selected preset when one is available; otherwise it plays the full clip
// on the selected avatar. Presets describe how a recording is played,
// including its frame range, speed, looping and selected body parts.
// A motion clip contains movement data, not a video of the performer.

//: 5. Look, compare and discuss
// Introduce the result: "This movement was recorded earlier. We can now
// give it to this character."
// Stop playback, choose a different clip, and press Play again.
// What does the character seem to be doing, feeling or trying to communicate?
// How does its apparent intention change with the second movement?
// Checkpoint: everyone can open a scene, choose a character, play a clip
// and stop it. No camera capture or audio synthesis is needed for this task.

//: 6. Optional next window — composition after the first successful playback
// Stop the Asset Editor's playback before trying another playback tool.
// SceneCompositor lets you select a repertoire of recorded gesture clips
// and a scene, generate a performance, preview it and save it as a new clip.
// Its current window name is SceneCompositor, not SceneConfiguration.
// Run this command only when the workshop leader introduces composition.
Bmc.sceneCompositor;

//: Next steps
// Continue with BuMoChi_Workshop02_RecordingAndPlayback.scd to record your
// own movement, replay it and explore transformations.
// At the end of this first exercise, click "Stop" in the Asset Editor.
// Leave the scene open for the next exercise, or click "Close Scene" to end.
