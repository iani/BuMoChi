# BuMoChi Editors

BuMoChi provides the following creative windows and editor designs:

1. The **Asset Editor** creates, configures, and tests reusable creative material. It includes Scene definitions, Clip browsing and recording, Preset creation and editing, and sonification scripts in one workspace.
2. The **SceneCompositor** window (`Bmc.sceneCompositor;`) generates a performance from selected recorded clips, previews it on a Godot avatar, and saves the result as a new clip. See [SceneCompositor](../SceneCompositor.md).
3. The **Score Editor** design uses those prepared assets to arrange Scene activation, Preset playback, sonification, and live-animation actions on a performance timeline associated with one Godot project.

Clips, Presets, Scenes, and Scores remain distinct data concepts even though the Asset Editor combines several related preparation tasks in one interface. Asset creation and testing belong in the Asset Editor; performance-timeline authoring belongs in the Score Editor. The existing standalone `Bmc.clipEditor` is a prototype inspection and testing utility, not a third required creative tool.

## Open the working windows

```supercollider
Bmc.assetEditor;
Bmc.sceneCompositor;
```

In SceneCompositor, choose clips, a scene and avatar target, adjust duration, phrase and blend settings, then generate, play and save a performance. **Play clip** previews an existing recording; **Play performance** previews the generated result. Both prepare the pipeline and Godot automatically. This prototype synthesizes recorded gestures and does not require XR-Animator for clip-only work.
