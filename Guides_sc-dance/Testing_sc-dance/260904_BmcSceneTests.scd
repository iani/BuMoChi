// BmcScene terminology, serialization, and format test.
// Run this file after compiling the BuMoChi classes.
(
var path = "/tmp/bumochi_bmc_scene_test.scd";
var motions = IdentityDictionary[
    \entrance -> (clip: \completeTake, avatar: \Mother, in: 1.25)
];
var avatars = IdentityDictionary[\Mother -> (vmcPort: 39539)];
var scene = BmcScene(
    \sceneTest,
    motions,
    avatars,
    (host: "127.0.0.1", port: 39538),
    \testProject,
    "res://scenes/Test.tscn"
);
var loaded;
var check = { |condition, message| if(condition.not) { Error(message).throw } };

scene.write(path);
loaded = BmcScene.read(path);

check.value(loaded.name == \sceneTest, "Scene name did not round-trip");
check.value(loaded.project == \testProject, "Godot project did not round-trip");
check.value(loaded.godotScene == "res://scenes/Test.tscn", "Godot Scene did not round-trip");
check.value(loaded.motionSettings(\entrance)[\clip] == \completeTake,
    "Motion lost its Clip reference");
check.value(loaded.motionSettings(\entrance)[\in] == 1.25,
    "Motion in point did not round-trip");
check.value(loaded.asData[\format] == \bmcScene, "Scene format marker is missing");
check.value(loaded.asData[\formatVersion] == 1, "Scene format version is missing");

File.delete(path);
"BmcScene tests passed".postln;
0.exit;
)
