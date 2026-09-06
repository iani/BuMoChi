BuMoChi assets are data used to design and perform a piece. All BuMoChi assets are stored in subfolders of a single folder called `BuMoChiAssets`, whose path can be selected by the user. The assets and their folders are:

1. AnimationClips : Motion capture data recorded as OSC messages with timestamps for timing, saved in SuperCollider text format (.scd).
2. AnimationScripts : SuperCollider scripts in .scd files used to configure performance parameters or to generate data and time structures.
3. GodotProjects : Project folders that can be loaded by Godot. A Godot project contains at least one scene which is rendered as animated graphics.
4. Scores : SuperCollider scripts in .scd files used to configure scenes and to play them.  Scores can be divided into part with durations specified in the comment lines between them, to specify the duration of each part and define a timeline that is played automatically.
5. SoundFiles : Audio files that can be used in the performance.  These files are loaded to the SuperCollider sound server (scsynth), when required by configuration scripts.
6. SoundScripts : SuperCollider scripts in .scd files used to configure sound interaction and generate sound during performance.
7. Videos : Video recordings and associated capture metadata produced while documenting or rendering a performance.
