The Asset Editor is a tool for previewing and recording animations, and for configuring the playback of recorded animation clips to Godot Project Scenes. 

To open the asset editor, use this code:

```
Bmc.assetEditor;
```

# Asset Editor GUI elements



The first Asset Editor should contain:

- optional linked Score and Scene selectors, which may remain unselected during bottom-up material preparation;
- the associated Godot project and `.tscn` resource;
- Scene figures, avatars, objects, sources, and routing;
- an embedded Clip and Preset panel;
- Preset range, speed, loop, bones, targets, and processing controls;
- playback and frame-preview controls;
- **Add preset**, **Save preset**, and **Clone preset** actions; and
- a feedback/status line.

The Clip and Preset panel is specified in [[02 Asset Editor - Clip and Preset Panel]]  and [[03 Asset Editor Design Parameters IZ.md]] in this folder. The existing `Bmc.clipEditor` may remain as a lightweight inspection and troubleshooting utility, but it is not a required step in the Scene-building workflow.
