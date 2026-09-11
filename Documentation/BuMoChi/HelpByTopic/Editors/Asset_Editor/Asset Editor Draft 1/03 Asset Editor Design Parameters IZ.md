# 1. Use a single BuMoChi asset folder

> **Implementation comment (2026-09-04):** This is now the implemented storage rule. `Bmc.dataFolder` returns the root and `Bmc.setDataFolder(path)` sets it; calling `Bmc.setDataFolder` without a path opens the folder chooser. The root contains `AnimationClips`, `AnimationScripts`, `GodotProjects`, `Scores`, `SoundFiles`, `SoundScripts`, and `Videos`. Changing the root updates the clip library and video-take destination; `Bmc.scoreDirectory` and `Bmc.projectDirectory` return the corresponding directories. Existing data is not moved automatically.

Use a single BuMoChi asset folder as follows:

BuMoChiAssets
Subfolders:
	AnimationClips
	AnimationScripts
	GodotProjects
	Scores
	SoundFiles
	SoundScripts
	Videos

The default location of `BuMoChiAssets` is `Platform.userAppSupportDir +/+ "BuMoChiAssets"`.
The user should be able to set his custom location with a file dialogue for selecting a folder, using method:

Bmc.setDataFolder

As remarked before, it is preferable to keep this location on a separate memory location, which has dedicated space for saving the large amounts of data required by videos.

Keeping the clips on an external disk presents the disadvantage that one depends on having this external disk attached to work with clips. However, since each video recording folder contains metadata regarding which clips it uses, it makes sense to have the clips always available in a standardized location relative to the video recordings folder. Scores likewise refer to the Clips and Scenes they coordinate, and Scenes refer to Godot projects. These asset types are therefore subdirectories of `BuMoChiAssets`.

When a new asset folder is chosen, Bmc checks whether all seven standard subdirectories are present and creates them when needed.

# 2. Clip and Preset panel of the Asset Editor

> **Implementation comment (2026-09-04): clip and preset are distinct.** A **clip** is the full, immutable recorded motion data. A **preset** is a named description of how that clip is played: inclusive frame range, speed, loop behavior, bone selection, target or targets, sonification code, and frame-modification code. Editing or deleting a preset never edits or deletes its source clip.

Here is a first prototype draft for the Clip and Preset panel embedded in the Asset Editor. It browses immutable Clips and creates or changes Presets within the current Scene. The intended principal entry point is `Bmc.assetEditor`; opening another editor merely to assign the resulting Preset is explicitly not required.

The Asset Editor should have four linked lists. In order from left to right:

1. Clip list.  A list of all clips by name.  This points to the folders that contain the data of the clip.
2. Preset list for each clip. This lists the presets defined for the clip chosen in the clip list to the left.
3. Score list. This lists saved Scores found in `Bmc.scoreDirectory`.
4. Scene list. This lists, in timeline order, the Scenes referenced by the selected Score.

To the right of the preset list is the area for setting the preset parameters for the chosen preset. These are:
1. start frame index (integer constrained between 0 and numframes - 1)
2. end frame index, (integer constrained between 0 and numframes - 1, must be equal to or larger than start frame index. If it is equal to start frame index, then just a single frame is played.
3. loop or not, (boolean)
4. speed of playback (float between -100 and 100.  If 0 then the clip is played statically by playing the start frame once)
5. code for sonifying clip frame data.
6. code for modifying clip frame data - if applicable.
7. [TO BE DISCUSSED:] bones or body parts that are played back
8. optional playback target or targets chosen from the figures, avatars, or objects defined by the assigned Scene. These may remain unset while preparing an unassigned Preset.
9. optional assigned Scene, including its associated Godot project. The selected Score is the browsing context used to find the Scene and is not copied into the Preset when the same Scene is shared by several Scores.

When a Scene is current, the editor must display its Godot project and `.tscn` resource, and saving a Preset automatically assigns it to that Scene. Without a current Scene, the editor may save an unassigned Preset for later use. It must refuse to assign or perform a Preset when the Scene is unavailable or when a named target does not exist in that Scene.

At the bottom of the window there should be three additional single lines of items:
1. A line displaying a RangeSlider for selecting the start index and end index of the preset. Selecting either handle automatically updates the numeric start-frame and end-frame fields. Editing either numeric field likewise updates the RangeSlider.
2. A line with a series of buttons for following functions:
	1. Record new clip
	2. Name new clip (must be set before recording, is set as null string, remains same after recording.  If null or clip by the displayed name already exists, prompt the user to enter a different name)
	3. Stop recording
	4. Start playback
	5. Stop playback
	6. Add new preset to selected clip.
	7. Name of new preset (must be set before creating the preset, is set as null string, and remains the same after creation. If null or a preset by the displayed name already exists, prompt the user to enter a different name)
	8. Clone preset. This copies the selected Preset's playback settings, requires a new name and destination Scene, and permits its targets to be changed before saving.
	9. Status indication (checkbox), labeled "Animation Data input active:", indicating whether data is incoming from OSCEncoder.
3. A feedback line, telling the outcome of recent actions.  For example:
	- If there are no presets or clips found, prompt the user to create new presets or clips, as applicable
	- While recording a clip, post "Now recording clip *clip name*".
	- When finishing clip recording Post "Clip saved. *name* Start frame *nr* end frame *nr* Duration *nr*."
	- If data input is inactive (no connection to animation frames), then post "Animation data input off. Check source and OSCDecoder status."
	- After saving a preset, post: "Saved preset *preset name*".

> **Implementation comment:** The status checkbox indicates recent valid animation frames, not only that the OSC port is open. It is on while a valid frame has arrived within the previous 0.5 seconds and turns off when input stops. The indicator is display-only.

> **Implementation comment:** Parameter changes are written with the visible **Save preset** button. **Add new preset** refuses an empty or duplicate name; **Save preset** updates the selected preset without silently creating or renaming one. Sonification and modification code are stored as source text and are not executed merely by loading a preset. Bones and targets use comma-separated names in the first GUI version; `all` means the complete skeleton.

> **Implementation comment:** The feedback line is implemented as a read-only, single-line text field at the very bottom. Successful actions, missing clip/preset guidance, input loss, and validation errors are shown there; errors are also retained in the Post window for diagnosis.

> **Implementation comment:** The first code slice establishes the shared data root and the player operations needed by the editor (immediate frame preview, stepping, and efficient time seeking). The next slice should introduce `BmcClipPreset` and the two-list editor. Negative and zero speeds need explicit player semantics before the full `-100 ... 100` control is enabled: zero means a static preview of `startFrame`; a negative value means reverse traversal, beginning at the preset's `endFrame` unless the user has explicitly sought elsewhere.

> **Revision comment:** The prototype currently has only Clip and Preset lists. These controls should become a panel of the Asset Editor. In bottom-up material-preparation mode, the panel can save unassigned Presets. In Score-first mode, the Asset Editor supplies the linked Score and Scene browsers, Scene and Godot-resource display, target validation, and **Clone preset** workflow. There must be no second assignment step after saving a Preset when a Scene is already current.
