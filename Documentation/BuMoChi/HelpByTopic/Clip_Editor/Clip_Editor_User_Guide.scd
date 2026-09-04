// BuMoChi Clip Editor — step-by-step user guide
//
// A clip is the full recorded motion data. A preset describes how a clip is
// played: its frame range, speed, looping, selected bones, and target(s).
// Editing a preset does not change its source clip.

// 1. Set the BuMoChi data folder
//
// Run this line to open a folder-selection dialog. Select the folder that
// should contain all BuMoChi data. BuMoChi creates the Clips and Videos
// subfolders there when necessary.
Bmc.setDataFolder;

// Wait until the folder dialog has closed before running the verification
// block below.

// Alternatively, set the folder directly. Replace this example path with the
// folder on your computer or external disk.
Bmc.setDataFolder("/Volumes/MyExternalDisk/BuMoChi_Data");

// Inspect the currently selected root and its two standard locations.
Bmc.dataFolder.postln;
Bmc.clipDirectory.postln;
Bmc.videoRecordingFolder.postln;

//: Test the selected data folder
//
// Run this block after selecting the folder. It reports each directory and
// throws an error if Bmc did not create the required folder structure.
(
var root = Bmc.dataFolder;
var clips = root +/+ "Clips";
var videos = root +/+ "Videos";
var checkDirectory = { |path, label|
	if(File.exists(path).not) {
		Error("FAIL: % directory was not created: %".format(label, path)).throw
	};
	if(File.type(path) != \directory) {
		Error("FAIL: % path is not a directory: %".format(label, path)).throw
	};
	"PASS: % directory exists: %".format(label, path).postln;
};

checkDirectory.(root, "BuMoChi data root");
checkDirectory.(clips, "Clips");
checkDirectory.(videos, "Videos");

if(Bmc.clipDirectory != clips.standardizePath) {
	Error("FAIL: Bmc.clipDirectory does not use the selected data folder").throw
};
if(Bmc.videoRecordingFolder != videos.standardizePath) {
	Error("FAIL: Bmc.videoRecordingFolder does not use the selected data folder").throw
};

"PASS: Bmc data folder setup is complete".postln;
)

//: Changing the data folder does not move existing clips or videos. Move any
// existing data yourself if it should become available in the new location.

// 2. Open the Clip Editor
//
// This opens the Clip Editor window. Its left list contains full clips. After
// selecting a clip, the next list contains the playback presets for that clip.
Bmc.clipEditor;

// The Clip Editor then lets you select or create a preset and edit its range,
// speed, loop behavior, bone selection, target(s), and processing code without
// changing the full recorded clip.

//: 3. Test the Clip Editor
//
// Before opening it, make sure the Clips directory contains at least one saved
// .scd or .bmc clip. The following returns the clips currently available.
Bmc.listClips;

// Open the editor with the current clip selected:
Bmc.clipEditor;

// Or open it with a particular clip selected:
// Bmc.clipEditor(\take1);

// In the window, test this sequence:
//
// 1. Select a clip in the left list.
// 2. Enter a new preset name.
// 3. Move both RangeSlider handles. Confirm that Start frame and End frame
//    follow the handles.
// 4. Edit either numeric frame field. Confirm that the RangeSlider follows it.
// 5. Set Speed, Loop, Bones, and Targets. Names in Bones and Targets are
//    comma-separated. Enter "all" for the complete skeleton.
// 6. Press Add new preset. Confirm that it appears in the middle list.
// 7. Change a parameter and press Save preset.
// 8. Press Start playback, then Stop playback.
// 9. Test Speed 0: only the preset's start frame should be displayed.
// 10. Test a negative Speed: playback should run backward from the end frame.
// 11. Send animation data from OSCEncoder. "Animation Data input active:"
//     should switch on, then switch off about half a second after input stops.
// 12. Close and reopen the editor. Confirm that the saved preset is restored.
// 13. Confirm that the feedback field at the bottom reports recording, saving,
//     playback, missing clips/presets, invalid names, and loss of animation input.

// Inspect the saved preset names and one preset from code. Replace both names
// with names present in your editor.
// Bmc.clipPresets(\take1).postln;
// Bmc.clipPreset(\take1, \myPreset).asData(Bmc.clip(\take1)).postln;

// Play the persisted preset without opening the editor:
// Bmc.playPreset(\take1, \myPreset);
