# Scene Editor: responsibility and workflow

The Scene Editor is BuMoChi's principal animation-configuration workspace. It combines Scene definition with Clip browsing and Preset editing so that the user does not have to create a Preset in one window and assign it in another.

For an explanation of the Scene, Clip, and Preset concepts, see [[Glossary#Core animation concepts in Godot and SuperCollider]].

## Alternative workflow A: bottom-up material creation

This workflow is useful at the beginning of a project, when the user first needs to record and prepare movement material without having designed a Sequence or its Scenes.

1. Open the Scene Editor in material-preparation mode, without selecting a Sequence or Scene.
2. Record a new Clip or select an existing Clip.
3. Review the complete Clip and select a useful frame range.
4. Create a Preset containing the range, speed, loop behavior, bone selection, and processing code.
5. Save the Preset as currently unassigned. Scene-dependent targets may remain unset at this stage.
6. Repeat these steps to build a collection of Clips and Presets.
7. At a later stage, create or select a Sequence and one of its Scenes.
8. Add an existing Preset to that Scene and select valid figures, avatars, or objects from the Scene as its targets.
9. Place the Scene and Preset playback on the Sequence timeline when appropriate.

An unassigned Preset is valid reusable preparation material, but it cannot be performed as part of a Sequence until it has been assigned to a Scene and its targets have been validated. The Preset's source Clip and playback settings remain unchanged during assignment.

## Alternative workflow B: Sequence-first Scene configuration

This workflow is useful when the Sequence structure and Godot Scenes are already known. The user begins from a Scene and creates material directly in that context.

1. Select a saved Sequence.
2. Select one of the Scenes referenced by that Sequence.
3. Inspect the Scene's associated Godot project and `.tscn` scene resource.
4. Define or edit the Scene's figures, avatars, objects, live sources, and routes.
5. Browse or record a Clip without leaving the Scene Editor.
6. Create or edit a Preset using that Clip.
7. Choose targets offered by the current Scene.
8. Save the Preset. Because a Scene is already current in this workflow, the Preset is assigned to it automatically.

In either workflow, the user should not have to open a separate Preset Editor. The Scene Editor supports both unassigned material preparation and context-aware Scene configuration.

## Main areas

The first Scene Editor should contain:

- optional linked Sequence and Scene selectors, which may remain unselected during bottom-up material preparation;
- the associated Godot project and `.tscn` resource;
- Scene figures, avatars, objects, sources, and routing;
- an embedded Clip and Preset panel;
- Preset range, speed, loop, bones, targets, and processing controls;
- playback and frame-preview controls;
- **Add preset**, **Save preset**, and **Clone preset** actions; and
- a feedback/status line.

The Clip and Preset panel is specified in `02 Scene Editor - Clip and Preset Panel.md` and `03 Scene Editor Design Parameters IZ.md` in this folder. The existing `Bmc.clipEditor` may remain as a lightweight inspection and troubleshooting utility, but it is not a required step in the Scene-building workflow.

## Relationship to the Sequence Editor

The Scene Editor defines what is available in a Scene. The separate Sequence Editor arranges when Scenes become active and when their Presets or live-animation wirings start, change, and stop. Editing the timeline must not be mixed into the first Scene Editor implementation.

Proposed entry points:

```supercollider
Bmc.sceneEditor;
Bmc.sceneEditor(\performanceA, \opening);
```
