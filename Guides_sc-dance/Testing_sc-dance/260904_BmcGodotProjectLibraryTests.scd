// Filesystem-only Godot project and Scene discovery test.
// The original Bmc data-folder setting is restored before exit.
(
var originalRoot = Bmc.dataFolder;
var testRoot = "/tmp/bumochi_godot_projects_test";
var projectsRoot = testRoot +/+ "Projects";
var rootProject = projectsRoot +/+ "RootProject";
var nestedProject = projectsRoot +/+ "NestedProject";
var invalidProject = projectsRoot +/+ "NotAProject";
var writeEmpty = { |path|
	var file = File(path, "w");
	if(file.isOpen.not) { Error("Could not create test file: %".format(path)).throw };
	file.putString("\n");
	file.close;
};
var check = { |condition, message|
	if(condition.not) { Error(message).throw };
};

protect {
	Bmc.setDataFolder(testRoot);
	[rootProject, nestedProject, invalidProject].do { |path|
		BmcDataFolder.ensureDirectory(path)
	};
	BmcDataFolder.ensureDirectory(rootProject +/+ "avatars");
	BmcDataFolder.ensureDirectory(nestedProject +/+ "scenes");
	BmcDataFolder.ensureDirectory(nestedProject +/+ "scenes" +/+ "act_2");

	writeEmpty.(rootProject +/+ "project.godot");
	writeEmpty.(rootProject +/+ "demo.tscn");
	writeEmpty.(rootProject +/+ "avatars" +/+ "IgnoredAvatar.tscn");
	writeEmpty.(nestedProject +/+ "project.godot");
	writeEmpty.(nestedProject +/+ "scenes" +/+ "Opening.tscn");
	writeEmpty.(nestedProject +/+ "scenes" +/+ "act_2" +/+ "Ending.tscn");
	writeEmpty.(invalidProject +/+ "ignored.tscn");

	check.(Bmc.projects.includes(\RootProject), "Root-level project was not discovered");
	check.(Bmc.projects.includes(\NestedProject), "Nested-Scene project was not discovered");
	check.(Bmc.projects.includes(\NotAProject).not,
		"Folder without project.godot was incorrectly discovered");
	check.(Bmc.projectScenes(\RootProject) == ["res://demo.tscn"],
		"Root-level Scene discovery included the wrong files");
	check.(Bmc.projectScenes(\NestedProject) == [
		"res://scenes/Opening.tscn",
		"res://scenes/act_2/Ending.tscn"
	], "Recursive scenes/ discovery returned the wrong paths");
	check.(Bmc.projectInfo(\NestedProject)[\vmcValidated] == false,
		"Filesystem discovery must not claim VMC validation");

	"Bmc Godot project discovery tests passed".postln;
} {
	Bmc.setDataFolder(originalRoot);
};

0.exit;
)
