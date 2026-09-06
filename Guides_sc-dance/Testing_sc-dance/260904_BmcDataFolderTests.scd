// Verify that Bmc.setDataFolder creates every standard data subdirectory.
// The original data-folder setting is restored before this test exits.
(
var originalRoot = Bmc.dataFolder;
var testRoot = "/tmp/bumochi_data_folder_test";
var checkDirectory = { |path|
    if(File.exists(path).not or: { File.type(path) != \directory }) {
        Error("Required Bmc data directory was not created: %".format(path)).throw
    }
};

if(BmcDataFolder.defaultRoot.basename != "BuMoChiAssets") {
    Error("Default Bmc data folder should be named BuMoChiAssets").throw
};

protect {
    Bmc.setDataFolder(testRoot);
    checkDirectory.(testRoot);
	checkDirectory.(testRoot +/+ "AnimationClips");
	checkDirectory.(testRoot +/+ "AnimationScripts");
	checkDirectory.(testRoot +/+ "Videos");
	checkDirectory.(testRoot +/+ "Scores");
	checkDirectory.(testRoot +/+ "GodotProjects");
	checkDirectory.(testRoot +/+ "SoundFiles");
	checkDirectory.(testRoot +/+ "SoundScripts");
	if(Bmc.animationClipDirectory != (testRoot +/+ "AnimationClips").standardizePath) {
		Error("Bmc.animationClipDirectory does not follow Bmc.setDataFolder").throw
	};
	if(Bmc.animationScriptDirectory != (testRoot +/+ "AnimationScripts").standardizePath) {
		Error("Bmc.animationScriptDirectory does not follow Bmc.setDataFolder").throw
	};
	if(Bmc.soundFileDirectory != (testRoot +/+ "SoundFiles").standardizePath) {
		Error("Bmc.soundFileDirectory does not follow Bmc.setDataFolder").throw
	};
	if(Bmc.soundScriptDirectory != (testRoot +/+ "SoundScripts").standardizePath) {
		Error("Bmc.soundScriptDirectory does not follow Bmc.setDataFolder").throw
	};
	if(Bmc.scoreDirectory != (testRoot +/+ "Scores").standardizePath) {
		Error("Bmc.scoreDirectory does not follow Bmc.setDataFolder").throw
	};
	if(Bmc.sequenceDirectory != Bmc.scoreDirectory) {
		Error("Bmc.sequenceDirectory does not follow Bmc.setDataFolder").throw
	};
	if(Bmc.godotProjectDirectory != (testRoot +/+ "GodotProjects").standardizePath) {
		Error("Bmc.godotProjectDirectory does not follow Bmc.setDataFolder").throw
	};
	if(Bmc.projectDirectory != Bmc.godotProjectDirectory) {
		Error("Bmc.projectDirectory does not follow Bmc.setDataFolder").throw
	};
	if(BmcDataFolder.clips != BmcDataFolder.animationClips) {
		Error("BmcDataFolder.clips compatibility shortcut is invalid").throw
	};
	if(BmcDataFolder.sequences != BmcDataFolder.scores) {
		Error("BmcDataFolder.sequences compatibility shortcut is invalid").throw
	};
	if(BmcDataFolder.projects != BmcDataFolder.godotProjects) {
		Error("BmcDataFolder.projects compatibility shortcut is invalid").throw
	};
    "Bmc data-folder tests passed".postln;
} {
    Bmc.setDataFolder(originalRoot);
};

0.exit;
)
