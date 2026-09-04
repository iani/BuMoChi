// Inspect the first Godot project in the active BuMoChi data folder.
// This is an asynchronous integration test and requires Godot to be installed.
// Start the normal BuMoChi pipeline launcher first. For inspection-only work,
// Bmc.godotServiceStartPath gives the standalone service launcher instead.
(
var projects = Bmc.projects;
var project;

if(projects.isEmpty) {
	Error("No Godot projects found in: %".format(Bmc.projectDirectory)).throw
};

project = projects.first;
("Inspecting Godot project: " ++ project).postln;
Bmc.inspectProject(project, { |json, error, outputPath|
	if(error.notNil) {
		error.warn;
		1.exit;
	} {
	if(json.contains("\"format\": \"bumochiGodotInspection\"").not) {
		Error("Inspector output has an unexpected format").throw
	};
	if(json.contains("\"scenes\"").not) {
		Error("Inspector output does not contain Scenes").throw
	};
	("Bmc Godot inspector test passed. Report: " ++ outputPath).postln;
	0.exit;
	};
});
)
