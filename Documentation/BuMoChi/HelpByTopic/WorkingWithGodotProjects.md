# Working with Godot projects

This document defines how BuMoChi finds, validates, opens, and controls Godot projects. It also specifies the template-project convention intended to give new users a reliable starting point.

## BuMoChi Godot-project guidelines

The following guidelines summarize the required project structure and recommended working practice.

### Required conventions

1. Every BuMoChi asset root must contain the seven standard directories: `AnimationClips`, `AnimationScripts`, `GodotProjects`, `Scores`, `SoundFiles`, `SoundScripts`, and `Videos`.
2. Every Godot project offered by BuMoChi must have `project.godot` at the root of its project directory.
3. Complete Godot Scenes intended for automatic BuMoChi discovery must be saved either as `.tscn` files directly in the project root or beneath the project's top-level `scenes` directory.
4. Reusable avatars, props, user-interface components, and subordinate scene resources must be stored outside `scenes` if they should not be presented as complete performance Scenes.
5. Every VMC-controllable avatar must have a stable BuMoChi identity and a valid VMC listener port.
6. Avatars that may operate simultaneously must use distinct VMC ports.
7. A BuMoChi Scene must identify one Godot project and one of its discovered `.tscn` Scene resources.
8. A Score must be associated with one Godot project, and every Scene used by that Score must belong to that project.

### Recommended project practice

1. Begin with a tested BuMoChi template rather than constructing the VMC and control infrastructure from scratch.
2. Duplicate the closest template—initially one, two, or three avatars—and then customize its Scenes, avatars, props, lighting, and cameras.
3. Keep the BuMoChi controller, avatar markers, VMC receivers, and inspection interface shared and reusable across all templates.
4. Give each avatar explicit BuMoChi metadata. Automatic inference from node names should be treated only as a suggestion requiring confirmation.
5. Keep paths project-relative and avoid absolute filesystem paths.
6. Do not copy the generated `.godot` cache when duplicating a template; allow Godot to reconstruct it.
7. Move or rename referenced project resources through Godot's FileSystem dock whenever possible so dependencies can be updated safely.
8. Keep ports configurable even when templates begin with the standard `39539`, `39540`, `39541`, and subsequent-port convention.
9. Validate a duplicated or customized project before it becomes selectable for Scene or Score playback.

### Recommended BuMoChi behavior

1. `Bmc.setDataFolder` should create `GodotProjects` automatically when it creates the other required asset directories.
2. BuMoChi should use Godot itself in headless mode to inspect and validate projects and their resolved Scene trees.
3. The Asset Editor should show invalid or incomplete projects with useful diagnostic information rather than silently hiding them.
4. BuMoChi should allow Clip recording and unassigned Preset preparation when no valid project exists, but should require a valid project for Scene completion, Godot preview, and Score playback.
5. Godot should confirm project launch, active Scene, detected avatars, port assignments, Scene changes, and errors instead of requiring SuperCollider to assume that an operation succeeded.
6. Graphical Godot launch and headless inspection should remain distinct operations: inspection discovers and validates content; graphical launch displays and performs it.

These guidelines define the intended architecture. Items that depend on project inspection, template distribution, or the persistent Godot controller remain implementation milestones until their corresponding code is complete.

## Godot projects in the BuMoChi asset folder

The selected BuMoChi asset folder has seven standard subdirectories:

```text
BuMoChiAssets/
├── AnimationClips/
├── AnimationScripts/
├── GodotProjects/
├── Scores/
├── SoundFiles/
├── SoundScripts/
└── Videos/
```

`Bmc.setDataFolder` must create all seven directories when necessary. `BuMoChiAssets` is the default root-directory name, but the root itself is user-selectable. Changing the configured root does not move existing data automatically.

The `GodotProjects` directory is structurally mandatory. At least one valid, VMC-controllable Godot project is required before the user can complete a Scene, preview its animation in Godot, or play a Score. BuMoChi should nevertheless permit bottom-up Clip recording and creation of unassigned Presets when no valid Godot project is available.

## Valid Godot project

Each immediate project directory beneath `GodotProjects` is a candidate Godot project. It is recognized as a project only when `project.godot` exists at its root:

```text
GodotProjects/
└── BoyAndBirds/
    ├── project.godot
    ├── scenes/
    ├── avatars/
    ├── props/
    └── addons/
```

The project-directory name is its stable BuMoChi identifier. The application name read from `project.godot` may be shown as a human-readable label.

A project is valid for BuMoChi Scene work when:

1. `project.godot` exists.
2. Its root or top-level `scenes` directory contains at least one loadable `.tscn` resource.
3. Godot can inspect the project without an error.
4. At least one available Scene contains a BuMoChi-compatible VMC avatar.
5. Every reported avatar has a non-empty identity and a valid VMC port.
6. VMC ports used simultaneously within the project do not conflict.
7. The BuMoChi inspection and runtime-controller interface is installed and responds correctly.

If these checks fail, the project should remain visible with a clear explanation of what is missing. It must not silently disappear from the interface.

## Scene-resource convention

Godot does not require a particular project-directory layout. BuMoChi therefore establishes this convention for automatic discovery:

> A `.tscn` resource is a candidate complete Scene when it is stored directly in the Godot project root or anywhere beneath the project's top-level `scenes` directory.

Thus, BuMoChi searches these two locations:

```text
<project root>/*.tscn
<project root>/scenes/**/*.tscn
```

It does not recursively search every project directory. This avoids incorrectly presenting reusable resources from `avatars`, `props`, `addons`, and similar directories as complete performance Scenes.

The search is recursive, so users may organize Scenes into subdirectories:

```text
scenes/
├── act_1/
│   ├── Opening.tscn
│   └── Duet.tscn
└── act_2/
    └── Ending.tscn
```

BuMoChi stores and displays their project-relative Godot resource paths:

```text
res://scenes/act_1/Opening.tscn
```

For a small or existing project, a complete performance Scene may remain directly in the project root. For a project containing several Scenes, the `scenes` directory is the recommended organization. Reusable avatars, props, user-interface components, and other subordinate scene resources should be stored outside `scenes` and outside the project root so they are not mistaken for complete Scenes:

```text
avatars/Mother.tscn
props/Bird.tscn
```

## Avatar and VMC discovery

The preferred discovery method is to ask Godot to load a Scene and report its resolved node tree. This is more reliable than asking SuperCollider to infer the complete structure from `.tscn` text, because Godot also resolves instantiated and inherited sub-scenes.

Automatic inspection may identify likely avatars through VMC tracker nodes, `XRNode3D`, `XRBodyModifier3D`, tracker properties, and listener ports. Inferred names are suggestions, not guaranteed identities. Compatible template projects should therefore provide explicit BuMoChi metadata for every controllable avatar, including:

- a stable BuMoChi avatar name;
- the relevant node path;
- body and face tracker names where applicable; and
- the VMC listener port.

The Asset Editor should display discovered avatars and distinguish explicitly identified avatars from uncertain inferred candidates. The user must confirm ambiguous results.

## Port convention

The initial template projects use:

```text
39538    shared Bunraku decoder input
39539    avatar 1 VMC input
39540    avatar 2 VMC input
39541    avatar 3 VMC input
...      further avatars on subsequent available ports
```

Ports must remain configurable. Templates must validate that concurrently active avatars have distinct ports and report conflicts before playback.

## Template projects

BuMoChi should provide tested template projects for one, two, three, and eventually more VMC-controlled avatars. These give beginners a known-working project and give BuMoChi stable integration-test fixtures.

Templates should share the same reusable controller and avatar-marker components rather than maintain separate implementations. Each template must provide:

- a valid `project.godot`;
- at least one complete Scene under `scenes`;
- one VMC receiver per avatar on a distinct port;
- explicit BuMoChi avatar metadata;
- a persistent BuMoChi controller;
- a clearly visible test environment;
- a calibration or test pose;
- no absolute filesystem paths;
- documentation for duplication and customization; and
- assets whose licenses permit redistribution.

Development should begin with one thoroughly tested one-avatar template. The two- and three-avatar templates should then be derived from the same components.

## Duplicating and customizing a template

Users may duplicate a template project directory, give the duplicate a new directory and application name, and customize its Scenes, avatars, props, lighting, and cameras.

Godot's generated `.godot` cache should not be included in a template copy; Godot reconstructs it. Files already referenced by Scenes should preferably be moved or renamed through Godot's FileSystem dock so Godot can update resource dependencies.

A future **Duplicate project template** action in the Asset Editor should copy only source material, omit generated caches, assign a distinct project name, and validate the result before presenting it as available.

## Inspection, launch, and live control

BuMoChi uses Godot in two modes:

1. **Headless inspection:** Godot loads the selected project and Scene without a display and returns structured information about Scenes, avatars, trackers, and ports.
2. **Graphical performance:** BuMoChi launches the selected project and `.tscn` Scene normally so the user can preview or perform the animation.

A persistent BuMoChi Godot controller should receive OSC commands, report readiness and errors, and switch Scenes while the project remains running. The controller should survive Scene changes, for example as a Godot Autoload. SuperCollider should not assume that a launch or switch succeeded until Godot confirms it.

The first integration milestone is:

```text
select project
→ inspect it through Godot
→ list Scenes and controllable avatars
→ select a Scene and avatar
→ launch the Scene graphically
→ send a test pose to that avatar
```

## Current implementation status

The first filesystem-discovery draft is implemented:

- `Bmc.setDataFolder` creates all seven standard asset directories.
- `Bmc.godotProjectDirectory` returns the active `GodotProjects` directory; `Bmc.projectDirectory` remains a compatibility shortcut.
- `Bmc.projects` lists immediate child directories containing `project.godot`.
- `Bmc.projectScenes(projectName)` lists root-level `.tscn` files and recursively discovered `.tscn` files beneath `scenes`, returning `res://` paths.
- `Bmc.projectInfo(projectName)` returns the project path, project file, Scene candidates, and preliminary status.

The first headless-inspection draft is also implemented. It asks the installed Godot executable to load every discovered Scene and inspect the resolved node tree:

```supercollider
Bmc.inspectProject(\VMC_1_Avatar_F, { |json, error, outputPath|
	if(error.notNil) {
		error.warn;
	} {
		json.postln;
		("Full inspection saved at: " ++ outputPath).postln;
	};
});
```

For editor code and other programmatic use, request native SuperCollider data instead of JSON:

```supercollider
Bmc.inspectProjectData(\VMC_1_Avatar_F, { |data, error|
	if(error.notNil) {
		error.warn;
	} {
		data[\scenes].do { |scene|
			[scene[\path], scene[\avatarCandidates]].postln;
		};
	};
});
```

`data` is an Event containing Events and Arrays, so the Asset Editor can use it directly without parsing JSON.

## Asset Editor project browser draft

With the pipeline and Godot service running, open the first Asset Editor draft:

```supercollider
Bmc.assetEditor;
```

The initial browser shows Godot project folders, their candidate Scenes, and the avatars discovered in the selected Scene. Filesystem results appear immediately. The editor then runs headless inspection and changes its status to `Godot verified` when the resolved Scene data arrives.

Select an avatar to review its inferred target name. Edit **Target name** and press **Confirm target name** to establish the readable name that Presets will use. The name must be non-empty and unique within the Scene. The current prototype retains confirmations while its window remains open; saving them into a BuMoChi Scene file will be added with Scene persistence.

The names currently offered to Preset playback are available programmatically:

```supercollider
Bmc.assetEditorTargets;
```

Ports remain internal routing information and are not used as Preset target identities. This is the first implemented section of the larger Asset Editor specification; Clip/Preset integration and saved BuMoChi Scene editing remain subsequent work.

Select a verified Scene and press **Play selected Scene** to launch it graphically through the helper service. The editor monitors two separate states:

- **Godot Scene running** means the launched Godot process is still alive.
- **VMC listening** means that process has opened every VMC UDP port expected by the detected avatars.

The second indicator is the meaningful readiness check for animation playback. A Scene can be running while its VMC setup has failed to listen.

### Initial single-project runtime rule

For the current working implementation, the helper service owns at most one graphical Godot project at a time. Playing another Scene closes the previously service-launched Godot project first, including when the new Scene belongs to a different project. The service then checks the new Scene's expected VMC ports. If an unrelated process still owns one of them, launch is refused and the editor reports the conflicting port rather than starting a second receiver with ambiguous routing.

This is an intentional initial limitation, consistent with a Score belonging to one Godot project. Supporting several simultaneous Godot projects may be considered later, but would require explicit cross-project port allocation and lifecycle controls.

Inspection is asynchronous so that the SuperCollider application remains responsive. The callback receives the JSON report, an error string (or `nil`), and the temporary report path. The report contains loadability results, inferred avatar candidates, tracker names, and VMC ports. It also distinguishes Scene-local VMC tracker nodes from the project-wide `VmcPlugin` autoload used by the single-avatar templates.

The Godot inspector itself has been verified against the three current template projects. On macOS, Godot must not be launched directly by the already-running `sclang` process: Apple's process fork-safety rules may terminate it. BuMoChi therefore uses a small, independently started local service as the bridge between SuperCollider and Godot.

The normal BuMoChi pipeline launcher now starts and supervises this service together with the encoder and decoder:

```sh
./PipelineApplications/start_bumochi_pipeline.sh
```

Pressing Control-C stops every service owned by that launcher. If an independently started Godot service is already running, the pipeline reuses it and does not claim ownership of it. Use `--no-godot-service` only when inspection and later Godot-control features are intentionally not needed.

For inspection-only development, the service can still be started separately:

```sh
./PipelineApplications/start_bumochi_godot_service.sh
```

When working from Emacs, either run the normal pipeline launcher or evaluate `Bmc.godotServiceStartPath` to obtain the full standalone-service path. Emacs remains fully compatible because it continues to communicate only with `sclang`; the service owns Godot processes.

Keep that Terminal open. It should print `BuMoChi Godot service ready`. In SuperCollider, verify the connection and then inspect:

```supercollider
Bmc.godotServiceReady; // should return true

Bmc.inspectProject(\VMC_1_Avatar_F, { |json, error, outputPath|
	if(error.notNil) { error.warn } { json.postln };
});
```

The first service protocol implements `inspect`. The service boundary is intentionally reusable: subsequent milestones can add graphical project launch and communicate with a persistent Godot controller for Scene switching and runtime status. Scene switching itself will require that controller inside compatible Godot projects; the inspection service alone does not yet perform it.

`Bmc.godotExecutable` shows the executable used for inspection. On macOS it defaults to `/Applications/Godot.app/Contents/MacOS/Godot`. Set another installation explicitly when needed:

```supercollider
Bmc.godotExecutable = "/path/to/Godot";
```

Avatar discovery remains deliberately conservative. Explicit `bumochi_avatar_name` and `bumochi_vmc_port` metadata take precedence; otherwise the draft infers candidates from `XRNode3D` tracker assignments and reports their confidence as `inferred`. Full compatibility validation, graphical launch, and the persistent Godot controller remain later milestones.
