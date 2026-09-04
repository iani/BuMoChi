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

protect {
    Bmc.setDataFolder(testRoot);
    checkDirectory.(testRoot);
    checkDirectory.(testRoot +/+ "Clips");
    checkDirectory.(testRoot +/+ "Videos");
    checkDirectory.(testRoot +/+ "Sequences");
    checkDirectory.(testRoot +/+ "Projects");
    if(Bmc.sequenceDirectory != (testRoot +/+ "Sequences").standardizePath) {
        Error("Bmc.sequenceDirectory does not follow Bmc.setDataFolder").throw
    };
    if(Bmc.projectDirectory != (testRoot +/+ "Projects").standardizePath) {
        Error("Bmc.projectDirectory does not follow Bmc.setDataFolder").throw
    };
    "Bmc data-folder tests passed".postln;
} {
    Bmc.setDataFolder(originalRoot);
};

0.exit;
)
