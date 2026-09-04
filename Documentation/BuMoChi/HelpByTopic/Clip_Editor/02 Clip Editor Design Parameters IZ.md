# 1. Use a single BuMochi data folder for clips and videos

> **Implementation comment (2026-09-04):** This is now the storage rule being implemented. `Bmc.dataFolder` returns the root and `Bmc.setDataFolder(path)` sets it; calling `Bmc.setDataFolder` without a path opens the folder chooser. The root contains `Clips` and `Videos`. Changing the root updates both the clip library and video-take destination. Existing data is not moved automatically.

Use a single BuMochi data folder for clips and videos, as follows:

BuMoChi_Data 
Subfolders:
	Clips
	Videos

The default location of BuMoChi_Data would be in Platform.userAppSupportDir +/+ "BuMoChi_Data".
The user should be able to set his custom location with a file dialogue for selecting a folder, using method:

Bmc.setDataFolder

As remarked before, it is preferable to keep this location on a separate memory location, which has dedicated space for saving the large amounts of data required by videos.

Keeping the clips on an external disk presents the disadvantage that one depends on having this external disk attached to work with clips. However, since each video recording folder contains metadata regarding which clips it uses, it makes sense to have the clips always available in a standardized location relative to the video recordings folder. That is why Clips and Videos are subdirectories of BuMoChi_Data.

When a new data folder is chosen, Bmc should check if Clips and Videos subdirectories are present. It should create these directories if needed.

# 2. Clip editor tool

> **Implementation comment (2026-09-04): clip and preset are distinct.** A **clip** is the full, immutable recorded motion data. A **preset** is a named description of how that clip is played: inclusive frame range, speed, loop behavior, bone selection, target or targets, sonification code, and frame-modification code. Editing or deleting a preset never edits or deletes its source clip.

Here is a first prototype draft for a clip editor GUI. 

The main window should have 2 lists at the left side. In order from left to right:

1. Clip list.  A list of all clips by name.  This points to the folders that contain the data of the clip. 
2. Preset list for each clip. This lists the presets defined for the clip chosen in the clip list to the left. 

To the right of the preset list is the area for setting the preset parameters for the chosen preset. These are: 
1. start frame index (integer constrained between 0 and numframes - 1)
2. end frame index, (integer constrained between 0 and numframes - 1, must be equal to or larger than start frame index. If it is equal to start frame index, then just a single frame is played. 
3. loop or not, (boolean)
4. speed of playback (float between -100 and 100.  If 0 then the clip is played statically by playing the start frame once)
5. code for sonifying clip frame data. 
6. code for modifying clip frame data - if applicable. 
7. [TO BE DISCUSSED:] bones or body parts that are played back
8. [TO BE DISCUSSED:] name of avatar to which this playback is addressed.

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
	8. Status indication (checkbox), labeled "Animation Data input active:", indicating whether data is incoming from OSCEncoder. 
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
