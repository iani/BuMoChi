# BuMoChi Editors

BuMoChi has two principal creative tools with deliberately separate responsibilities:

1. The **Asset Editor** creates, configures, and tests reusable creative material. It includes Scene definitions, Clip browsing and recording, Preset creation and editing, and sonification scripts in one workspace.
2. The **Score Editor** uses those prepared assets to arrange Scene activation, Preset playback, sonification, and live-animation actions on a performance timeline associated with one Godot project.

Clips, Presets, Scenes, and Scores remain distinct data concepts even though the Asset Editor combines several related preparation tasks in one interface. Asset creation and testing belong in the Asset Editor; performance-timeline authoring belongs in the Score Editor. The existing standalone `Bmc.clipEditor` is a prototype inspection and testing utility, not a third required creative tool.
