# Overview: Assets and performance scripts (scores)

There are 2 steps to creating a piece with BuMoChi, associated with corresponding GUI tools:

1. Create clip recordings for prerecorded animation, configurations for live animation, and configurations for sound synthesis, and test these with your selected scenes from a Godot project.  For this, use the [[01 Asset Editor Draft 1]].
2. Create a performance script in SuperCollider code to play selected animations, configurations, animation and sonification scripts in a performance score. Scores can be coded and performed as fixed timelines.  Optionally one can execute parts of the script interactively at any point in the performance. For this, use the [[01 Score Editor Draft 1]].

# Assets

Assets are media files, data files, and code files used to create a performance. There are the following assets, stored in subfolders of `BuMoChiAssets` (see [[BuMoChi Assets]]):

1. AnimationClips : Motion capture data recorded as OSC messages with timestamps for timing, saved in SuperCollider text format (.scd).  Each animation clip is accompanied by presets that describes how to play back a clip or part of a clip, and how to connect it to parts or whole of avatar figures in a scene.  Each clip is stored in a folder together with its presets.
2. AnimationScripts : SuperCollider scripts in .scd files used to configure performance parameters or to generate data and time structures.
3. GodotProjects : Project folders that can be loaded by Godot. A Godot project contains at least one scene which is rendered as animated graphics.
4. Scores : SuperCollider scripts in .scd files used to configure scenes and to play them.  Scores can be divided into part with durations specified in the comment lines between them, to specify the duration of each part and define a timeline that is played automatically.
5. SoundFiles : Audio files that can be used in the performance.  These files are loaded to the SuperCollider sound server (scsynth), when required by configuration scripts.
6. SoundScripts : SuperCollider scripts in .scd files used to configure sound interaction and generate sound during performance.
7. Videos : Video recordings and associated capture metadata produced while documenting or rendering a performance.
unifo

# Scores or performance scripts

A score is a supercollider - sclang - source code file in text format (.scd).  A score is divided into parts or "sections" by comments with the extra character ":". A section of a score begins with a comment like this:

```
//:
```

The duration of a section can be written inside square brackets after the comment, in supercollider integer or float number notation like this:

Play this section for 60 seconds before moving to the next one:
```
//: [60]
```

Inside a score, configuration specifications are written in SuperCollider code as for example:

```
Bmc sessionAssets: (
	clips: (
		man_start: (clip: \ishi1, preset: \playback)
	)
)
```