// Requires the normal BuMoChi pipeline (including BmcGodotService) to be running.
// Verifies conversion of the Godot JSON report into native SC Event/Array data.
(
var projects = Bmc.projects;
if(projects.isEmpty) { Error("No Godot projects available for inspection").throw };

Bmc.inspectProjectData(projects.first, { |data, error, outputPath|
	if(error.notNil) { error.warn; 1.exit } {
		if(data.isKindOf(Event).not) {
			Error("Inspection result is not a native SuperCollider Event").throw
		};
		if(data[\format] != "bumochiGodotInspection") {
			Error("Unexpected native inspection format").throw
		};
		if(data[\scenes].isArray.not or: { data[\scenes].isEmpty }) {
			Error("Native inspection contains no Scenes").throw
		};
		if(data[\scenes].first[\loadable] != true) {
			Error("First discovered Scene is not loadable").throw
		};
		("Native Godot inspection data test passed: " ++ outputPath).postln;
		0.exit
	};
});
)
