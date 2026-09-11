# Install the bundled Godot projects

This folder contains Godot projects supplied with the BuMoChi library. Copy them into your chosen BuMoChi assets directory so that AssetEditor can find them. Installing the library does not copy these projects automatically.

## Choose your assets directory

Open AssetEditor from SuperCollider:

```supercollider
Bmc.assetEditor;
```

The second row displays the currently used assets path. To choose another location, click **Select Asset Folder** and select your assets root, usually named `BuMoChiAssets`. Select the root itself, not its `GodotProjects` subfolder. BuMoChi saves your choice and creates the standard asset subfolders when needed.

You can also display the active paths:

```supercollider
Bmc.dataFolder.postln;             // Your chosen assets root.
Bmc.godotProjectDirectory.postln;  // Destination for the project folders.
```

The default assets root is `Platform.userAppSupportDir +/+ "BuMoChiAssets"`, but you can choose a different location. Changing this preference does not move existing assets.

## Copy the projects

1. Open this library's `GodotProjects` folder in your file manager.
2. Copy the complete `VMC_1_Avatar_F`, `VMC_1_Avatar_M`, and `VMC_2_Avatars` folders into the `GodotProjects` subfolder of your chosen assets root. Keep all scenes, scripts, avatars, textures, and other resources inside each project; copying only `project.godot` is not enough.
3. If the destination already contains projects, add the new folders without replacing your existing work. If a project name already exists, keep your current version or give the new copy a different folder name.

The result should look like this:

```text
YourChosenAssetsDirectory/
└── GodotProjects/
    ├── VMC_1_Avatar_F/
    │   ├── project.godot
    │   └── ... all other project files and folders
    ├── VMC_1_Avatar_M/
    │   ├── project.godot
    │   └── ... all other project files and folders
    └── VMC_2_Avatars/
        ├── project.godot
        └── ... all other project files and folders
```

You can alternatively copy this entire `GodotProjects` folder directly into the assets root if no destination folder exists yet. Do not place it inside another `GodotProjects` folder: `BuMoChiAssets/GodotProjects/GodotProjects/...` will prevent project discovery.

## Reload AssetEditor

Click **Reload**, immediately to the left of **Select Asset Folder**. The project list and feedback message will update.

If no projects appear, check that you copied them to the assets path displayed in AssetEditor and that each immediate project folder contains `project.godot`. Then click **Reload** again. To list discovered projects in SuperCollider, evaluate:

```supercollider
Bmc.projects.postln;
```

For the full setup instructions, see [Setup: install the bundled Godot projects](../Documentation/BuMoChi/HelpByTopic/Setup.md#first-time-setup-install-the-bundled-godot-projects) in the BuMoChi library. This relative link refers to the library copy of this README; after copying it into your assets directory, open the setup guide from the library's `Documentation` folder.
