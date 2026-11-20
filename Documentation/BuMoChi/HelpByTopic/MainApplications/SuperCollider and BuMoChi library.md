# SuperCollider and the BuMoChi library

Install [SuperCollider](https://supercollider.github.io/downloads/) separately. Download the ZIP matching your operating system and processor from [BuMoChi Releases](https://github.com/iani/BuMoChi/releases) and extract it. The OS-specific package includes XR-Animator; Git clones and source archives do not.

Evaluate `Platform.userExtensionDir.postln;` in SuperCollider. Move or copy the complete extracted `BuMoChi` folder into that directory, or create a symbolic link there to its permanent location. Install only one copy. Choose **Language → Recompile Class Library**, check for errors, and evaluate `Bmc.status;`.

Open the creative windows with:

```supercollider
Bmc.assetEditor;
Bmc.sceneCompositor;
```

The [Asset Editor](../Editors/README.md) browses and prepares assets and launches the pipeline, Godot scene and bundled XR-Animator. [SceneCompositor](../SceneCompositor.md) generates, previews and saves performances from recorded clips.

Follow [Installation](../../Installation.md) for Python, Godot, the separate starter assets and verification. Motion-only work does not require booting SuperCollider's audio server.
