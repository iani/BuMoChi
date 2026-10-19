
recorded motion is the better approach for a repeatable, precisely synchronized demo.*

**SuperCollider can compose the motion sequence; Godot should execute it during the final render.**

1. **Load and edit clips in SuperCollider.** Your existing `BmcClip` and `BmcClipPlayer` already support recorded playback, excerpt selection, speed changes, reversal and freezing. No conversion is needed for this stage.
2. **Compose a shared 90-second timeline.** Each entry specifies the avatar, source clip, excerpt, start time, speed and transition. Musical section boundaries, chord onsets and selected motives can come directly from the sound score’s event list.
3. **Export the motion to Godot.** We can bake the retargeted motion into named `Animation` resources in an `AnimationLibrary`, played through `AnimationPlayer`. These are Godot resources rather than SuperCollider scenes. [Godot animation libraries](https://docs.godotengine.org/en/4.5/classes/class_animationlibrary.html)
4. **Render against Godot’s frame clock**, then combine the video with the existing soundtrack.

That last point matters: ordinary SuperCollider playback runs against real time, while Godot’s offline movie rendering may take longer than real time. Independent OSC playback could therefore drift or finish before the video. Baking the sequence—or evaluating recorded poses directly at each render timestamp—avoids that mismatch. [Godot offline rendering](https://docs.godotengine.org/en/4.5/tutorials/animation/creating_movies.html)

For the choreography, I suggest:

- **Introduction:** slow excerpts, restrained movement and gradual emergence.
- **Rhythmic section:** shorter phrases and exchanges between avatars, aligned with selected accents.
- **Chord transition:** longer gestures and smooth pose blends.
- **Final pointillism:** isolated movements separated by held poses, becoming still.

We should select those excerpts after viewing the clips, rather than assigning expressive qualities from their filenames. The first technical milestone is a short converted excerpt playing correctly on both avatars, including root motion and facial data, before assembling the full sequence.