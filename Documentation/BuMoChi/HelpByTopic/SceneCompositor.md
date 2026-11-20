# SceneCompositor prototype

Open the improvisation window in SuperCollider:

```supercollider
Bmc.sceneCompositor;
```

In SceneCompositor, select one or more animation clips using
Command-click or Shift-click. Below the clips, select a project/scene from the
**Scene** list. Its detected avatars populate the Target menu. Choose the target
avatar and check its destination VMC port.

1. Set the performance length (up to 120 seconds), phrase length, blend length,
   and variation. A blend must be shorter than a phrase.
2. Click **Generate performance**. The phrase list shows the chosen clips,
   excerpt start times, and playback speeds.
3. Click **Play performance** on the right to start the BMC pipeline if needed, inspect and open the selected
   Godot scene, and preview once its VMC listener is
   ready, or **Stop** to cancel pending playback, stop playback, or stop generation.
   Changing the selected scene stops this window's playback. A running scene is
   reused; opening another scene replaces the service's active Godot scene.
4. Use **New variation**, then generate again for another result. The same seed,
   selected clips, and settings reproduce the same performance.
5. Enter a new clip name and click **Save clip** to keep the result in Animation
   clips. Existing clip names are rejected. The Animation clips lists in SceneCompositor
   and an open Asset Editor update immediately after saving.

To preview an existing saved clip without generating anything, select it in the
left Animation clips list and click **Play clip** above that list. With multiple
clips selected for generation, this previews the active selected row (or the
first selected row if there is no active row). **Play performance** on the right
always previews the latest generated performance. Both buttons use the selected
Scene and automatically prepare the pipeline and Godot. **Stop** stops either.
Saved performances can also be previewed using **Play clip** after reopening the
window. Selecting a different source during startup does not change the playback
request already in progress.

The generator samples candidate excerpts and prefers similar poses at their
joins. Variation controls speed changes and randomness in join selection. It
avoids immediately repeating the same clip when alternatives are available.
Body positions and rotations are interpolated during resampling and transitions.
Auxiliary VMC channels, including facial data, come from the nearest source frame.

This is synthesis from recorded gestures, not a trained generative model. It does
not enforce foot contact, balance, collision avoidance, or anatomical constraints;
large differences between recordings can produce sliding or unnatural blends.
Choose recordings with compatible skeletons and coordinate conventions.

Playback uses Bmc's usual destination-port priority: live-only avatar output on
the same port is suppressed during playback and resumes afterward. Other ports
remain active. Stop any other clip players using that port before previewing.
Closing SceneCompositor stops its player and removes its temporary in-memory clip.
The source recordings and explicitly saved performances are preserved.

For scripts, the generator returns an ordinary, unsaved `BmcClip`:

```supercollider
~performance = BmcSceneCompositor.generate(
    [Bmc.clip(\NewClipTania261114)],
    duration: 30, phraseDuration: 4, transition: 0.6,
    variation: 0.25, seed: 42
);
```

Generation uses the calling thread's random seed. Use a dedicated Routine when
integrating it into scripts that maintain their own random sequence. Saved `.scd`
clips contain the generated motion; the phrase plan and seed remain metadata on
the in-memory result and are not stored by the standard `.scd` clip format.

Both Play buttons stay enabled. If a required selection or generated performance
is missing, clicking the button shows an explanatory message. During generation,
the buttons explain that generation must finish (or be stopped) first.
