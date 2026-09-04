# Working with Godot projects

This document defines how BuMoChi finds, validates, opens, and controls Godot projects. It also specifies the template-project convention intended to give new users a reliable starting point.

## BuMoChi Godot-project guidelines

The following guidelines summarize the required project structure and recommended working practice.

### Required conventions

1. Every BuMoChi data root must contain a `Projects` directory alongside `Clips`, `Videos`, and `Sequences`.
2. Every Godot project offered by BuMoChi must have `project.godot` at the root of its project directory.
3. Complete Godot Scenes intended for automatic BuMoChi discovery must be saved as `.tscn` files beneath the project's top-level `scenes` directory.
4. Reusable avatars, props, user-interface components, and subordinate scene resources must be stored outside `scenes` if they should not be presented as complete performance Scenes.
5. Every VMC-controllable avatar must have a stable BuMoChi identity and a valid VMC listener port.
6. Avatars that may operate simultaneously must use distinct VMC ports.
7. A BuMoChi Scene must identify one Godot project and one of its discovered `.tscn` Scene resources.
8. A Sequence must be associated with one Godot project, and every Scene used by that Sequence must belong to that project.

### Recommended project practice

1. Begin with a tested BuMoChi template rather than constructing the VMC and control infrastructure from scratch.
2. Duplicate the closest template—initially one, two, or three avatars—and then customize its Scenes, avatars, props, lighting, and cameras.
3. Keep the BuMoChi controller, avatar markers, VMC receivers, and inspection interface shared and reusable across all templates.
4. Give each avatar explicit BuMoChi metadata. Automatic inference from node names should be treated only as a suggestion requiring confirmation.
5. Keep paths project-relative and avoid absolute filesystem paths.
6. Do not copy the generated `.godot` cache when duplicating a template; allow Godot to reconstruct it.
7. Move or rename referenced project resources through Godot's FileSystem dock whenever possible so dependencies can be updated safely.
8. Keep ports configurable even when templates begin with the standard `39539`, `39540`, `39541`, and subsequent-port convention.
9. Validate a duplicated or customized project before it becomes selectable for Scene or Sequence playback.

### Recommended BuMoChi behavior

1. `Bmc.setDataFolder` should create `Projects` automatically when it creates the other required data directories.
2. BuMoChi should use Godot itself in headless mode to inspect and validate projects and their resolved Scene trees.
3. The Scene Editor should show invalid or incomplete projects with useful diagnostic information rather than silently hiding them.
4. BuMoChi should allow Clip recording and unassigned Preset preparation when no valid project exists, but should require a valid project for Scene completion, Godot preview, and Sequence playback.
5. Godot should confirm project launch, active Scene, detected avatars, port assignments, Scene changes, and errors instead of requiring SuperCollider to assume that an operation succeeded.
6. Graphical Godot launch and headless inspection should remain distinct operations: inspection discovers and validates content; graphical launch displays and performs it.

These guidelines define the intended architecture. Items that depend on project inspection, template distribution, or the persistent Godot controller remain implementation milestones until their corresponding code is complete.

## Projects in the BuMoChi data folder

The selected BuMoChi data folder has four required subdirectories:

```text
BuMoChiRecordings/
├── Clips/
├── Videos/
├── Sequences/
└── Projects/
```

`Bmc.setDataFolder` must create all four directories when necessary. The directory name of the root itself is user-selectable; `BuMoChiRecordings` is used here as an example.

The `Projects` directory is structurally mandatory. At least one valid, VMC-controllable Godot project is required before the user can complete a Scene, preview its animation in Godot, or play a Sequence. BuMoChi should nevertheless permit bottom-up Clip recording and creation of unassigned Presets when no valid Godot project is available.

## Valid Godot project

Each immediate project directory beneath `Projects` is a candidate Godot project. It is recognized as a project only when `project.godot` exists at its root:

```text
Projects/
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
2. Its top-level `scenes` directory contains at least one loadable `.tscn` resource.
3. Godot can inspect the project without an error.
4. At least one available Scene contains a BuMoChi-compatible VMC avatar.
5. Every reported avatar has a non-empty identity and a valid VMC port.
6. VMC ports used simultaneously within the project do not conflict.
7. The BuMoChi inspection and runtime-controller interface is installed and responds correctly.

If these checks fail, the project should remain visible with a clear explanation of what is missing. It must not silently disappear from the interface.

## Scene-resource convention

Godot does not require a particular project-directory layout. BuMoChi therefore establishes this convention for automatic discovery:

> Every `.tscn` resource beneath a Godot project's top-level `scenes` directory is a candidate complete Scene available to BuMoChi.

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

Complete performance Scenes belong under `scenes`. Reusable avatars, props, user-interface components, and other subordinate scene resources should be stored outside it so they are not mistaken for complete Scenes:

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

The Scene Editor should display discovered avatars and distinguish explicitly identified avatars from uncertain inferred candidates. The user must confirm ambiguous results.

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

A future **Duplicate project template** action in the Scene Editor should copy only source material, omit generated caches, assign a distinct project name, and validate the result before presenting it as available.

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

The conventions and milestone in this document are specifications. The current implementation creates `Clips`, `Videos`, and `Sequences`; creation of `Projects`, Godot inspection, project validation, graphical launch, and the persistent Godot controller are the next implementation stages.
