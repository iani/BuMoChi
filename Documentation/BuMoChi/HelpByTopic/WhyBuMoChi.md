---
title: Why BuMoChi?
---

# Why BuMoChi?

## Purpose and status of this assessment

This document asks whether BuMoChi addresses a real need, whether its present architecture is appropriate, and whether existing software could replace part or all of it. It is intended as a critical research note rather than a justification written after the fact. It should be revised as the project is tested and as comparable systems develop.

The survey was last checked on 2 September 2026. It is based primarily on project documentation, source repositories, and official product documentation. The software landscape is large and changes quickly, so the absence of a system from this survey is not evidence that it does not exist. In particular, the conclusion that no close equivalent has yet been identified is provisional and falsifiable.

## What problem is BuMoChi trying to solve?

BuMoChi is not primarily a video editor, motion-capture application, game engine, or sound-synthesis package. All of those already exist in more mature forms. Its proposed contribution is the coordination layer between them for rehearsal and live performance.

The intended workflow currently brings together:

- live and prerecorded VMC/OSC skeletal motion;
- several networked performers and computers;
- named, replayable motion clips and subclip ranges;
- independent playback processes with rate, looping, and frame-range control;
- construction of one avatar movement from multiple sources or anatomical regions;
- algorithmic transformation of movement;
- several avatars and explicit routing to Godot instances;
- mappings from movement data to real-time sound synthesis;
- live modification of those mappings and playback processes;
- synchronized rehearsal takes containing audio, screen video, source motion, playback parameters, and SuperCollider code or code descriptions;
- a workflow accessible to small independent artistic groups using free or open tools.

This combination, rather than any individual feature, is the relevant unit of comparison. A tool that records excellent mocap, edits animation, renders video, or synthesizes sound may still leave the artistic group to construct the connections, timing, data model, and archival workflow themselves.

## Criteria for comparison

A potentially substitutable environment should be assessed against at least these questions:

1. Does it receive and transmit VMC directly, preserving reusable skeletal data rather than only pixels?
2. Can it record and catalogue complete live-motion clips, then use presets to seek, loop, select ranges, choose bones, and address playback targets without altering those clips?
3. Can it combine simultaneous live, recorded, remote, and procedural sources?
4. Can different sources control different anatomical regions of one avatar?
5. Can it transform motion algorithmically and during performance?
6. Can it control several avatars and computers over a network?
7. Does it provide real-time synthesis and mappings between movement and sound?
8. Can artists change those relationships during rehearsal or performance without rebuilding an application?
9. Can it record a synchronized, reproducible take containing image, sound, motion data, settings, and relevant source code?
10. Is it free/libre, cross-platform, inspectable, and practical for artists without institutional infrastructure?

No current BuMoChi release fully satisfies this list either. Several items, including timeline-based clip editing, procedural frame capture, richer motion transformation, and complete source-code provenance, remain incomplete or experimental. The criteria describe the project direction, not a claim of finished capability.

## Existing environments and plausible alternatives

| Environment or pipeline | What it already does well | Relation to BuMoChi | Principal difference or gap |
| --- | --- | --- | --- |
| Blender with a VMC add-on | Receives VMC; records and edits armature animation; provides nonlinear animation, rendering, compositing, and video editing in one free/open application | The strongest open-source alternative for recorded animation authoring and finished video production | Primarily an animation-production environment rather than a networked, code-performed motion-and-sound instrument; the desired live multi-source anatomical control would require add-ons or Python development |
| Godot with Godot XR VMC Tracker | Open game engine, direct VMC reception, avatar rendering, scripting, animation tools, and deterministic Movie Maker output with audio | Already serves as BuMoChi's renderer and could absorb more coordination logic | Does not supply BuMoChi's clip library, SuperCollider sonification, rehearsal-oriented live coding, or current source-composition model without custom development |
| Unity with EVMC4U and Unity Recorder/Timeline | Mature avatar/game workflow; direct VMC reception; timeline authoring; movie recording; extensive C# and asset ecosystem | Could implement most of the system inside one engine and may be the most practical mainstream replacement | Unity itself is not a free/libre engine; artistic logic would move to C#/editor tooling; real-time sound and live coding are less central than in SuperCollider |
| Unreal Engine with VMC4UE, Live Link, Take Recorder, Sequencer, and Movie Render tools | Strong virtual-production workflow; records live performances and multiple takes into editable sequences; sophisticated rendering | More mature for cinematic capture, take management, and conventional virtual production | Heavier system, different licensing model, and a less direct fit for lightweight open-source live coding and experimental sonification; VMC4UE's published compatibility information should be checked against current engine versions |
| XR Animator | Webcam/media-file mocap, VRM display, motion recording/export, and VMC output in its native application | Provides an important low-cost motion source and can create reusable motion without BuMoChi | It is a capture/VTubing environment rather than a multi-source network composition, sound, and rehearsal-take system; its source is CC BY-NC-SA rather than an unrestricted open-source licence for software reuse |
| VSeeFace, Warudo, and related VTubing tools | Practical avatar staging, tracking integration, VMC connectivity, cameras, props, streaming output, and—in Warudo—node-based visual scripting | May provide a faster route to polished real-time avatar scenes than a custom Godot project | Primarily proprietary or licence-restricted streaming applications; semantic motion-clip editing, research provenance, SuperCollider sonification, and reproducible anatomical montage are not their central purpose |
| ossia score plus VMC adapters and a game engine | Free/open interactive intermedia timeline; OSC, sound, video, mappings, scripting, automation, conditions, and distributed-media potential | A serious alternative host for future timeline and cueing work, and possibly a better model for scene sequencing than a custom SuperCollider GUI | It has no identified first-class VMC skeletal-clip/body-composition model; an adapter and avatar-specific data layer would still have to be built |
| A custom Python/C++/Rust service plus Godot and an audio engine | Could offer stronger types, testing, deployment, concurrency, and protocol performance than sclang | Architecturally plausible replacement for BuMoChi's coordination core | Recreates substantial infrastructure; needs a separate live-performance language, sound engine, GUI, package format, and user community |
| OBS or FFmpeg combined with any VMC application | Reliable capture and streaming of the visible result; broadly used and scriptable | Appropriate as an output recorder and already used indirectly by BuMoChi | Records pixels and audio, not the semantic motion, playback state, source provenance, or compositional decisions needed to revise a take |

### Blender

Blender is the closest free/open environment if the central task is *making and editing animation videos*. The Blender project describes a complete pipeline covering rigging, animation, rendering, compositing, motion tracking, and video editing, under GPLv3. VMC Link receives live VMC/OSC and applies it to an armature and face mesh; the VMC protocol site also lists VMC4B as a Blender receiver. Blender therefore weakens any broad claim that open-source VMC animation recording and editing do not exist.

The remaining distinction is workflow. Blender's strengths are detailed editing and asset production. BuMoChi is oriented toward repeatedly performing, recombining, sonifying, and networking motion from code. Blender could probably reproduce much of this through Python, drivers, add-ons, actions, and the nonlinear animation editor. That possibility should be taken seriously. A future comparison should prototype one representative BuMoChi scene in Blender and measure the amount of custom code, rehearsal friction, latency, and reproducibility involved.

Sources: [Blender project overview and licence](https://github.com/blender/blender/blob/main/README.md), [Blender animation and rigging manual](https://docs.blender.org/manual/en/latest/animation/index.html), [VMC Link](https://extensions.blender.org/add-ons/vmc-link/), and the [VMC protocol's implementation list](https://protocol.vmc.info/english).

### Godot

Godot is not only a destination renderer. The MIT-licensed Godot XR VMC Tracker decodes VMC into Godot's tracker system and drives humanoid characters. Godot's Movie Maker mode can record a project's rendered output and audio deterministically, avoiding frame drops by slowing execution when necessary. AnimationPlayer, scripts, and editor tools could support clip playback and editing.

An alternative architecture could therefore move motion storage, composition, playback, and recording into Godot and use SuperCollider only as an OSC-connected sound engine. This could simplify synchronization between skeletal animation and rendered video. It would also place complex animation data closer to the engine that understands skeletons, retargeting, cameras, and scenes. Against this, it would divide the live performance logic between GDScript and SuperCollider and would require rebuilding the present code-evaluation and sonification workflow.

Sources: [Godot XR VMC Tracker](https://github.com/Malcolmnixon/GodotXRVmcTracker), [Godot Movie Maker documentation](https://docs.godotengine.org/en/stable/tutorials/animation/creating_movies.html), and [Godot's Movie Maker introduction](https://godotengine.org/article/movie-maker-mode-arrives-in-godot-4/).

### Unity

EVMC4U is an MIT-licensed VMC receiver for Unity. Its release notes describe selective disabling of bones and the use of several receivers with different responsibilities to mix VMC motion from multiple applications. This is directly relevant to BuMoChi's anatomical composition and means that this idea is not unique to BuMoChi. Unity Recorder can be driven from Timeline and can produce MP4, WebM, or ProRes output. Unity's Animation, Timeline, C#, UniVRM, and asset ecosystem make a relatively integrated pipeline possible.

The important qualification is licensing and orientation. EVMC4U is open source, but Unity is not a free/libre engine. A Unity implementation could be more familiar to avatar developers and more mature visually, while being less aligned with the project's aim of an inspectable, freely modifiable toolchain for independent artists. It would also not automatically provide SuperCollider's synthesis and live-coding culture.

Sources: [EVMC4U repository and MIT licence](https://github.com/gpsnmeajp/EasyVirtualMotionCaptureForUnity), [EVMC4U releases](https://github.com/gpsnmeajp/EasyVirtualMotionCaptureForUnity/releases), and [Unity Recorder documentation](https://docs.unity.cn/Packages/com.unity.recorder@latest/).

### Unreal Engine

VMC4UE is an MIT-licensed VMC receiver plug-in. Unreal's Take Recorder records actors, microphones, cameras, and Live Link performance into Sequencer, supports multiple takes and metadata, and allows recorded sources to be edited non-destructively. This is substantially more developed than BuMoChi's take-management and visual-editing tools.

Unreal is therefore a compelling alternative where cinematic virtual production is the priority. Its costs are conceptual and operational: a large engine and project structure, demanding hardware, an engine-specific licensing model, and a workflow centred on Blueprint/C++ and editor tools rather than small live-evaluated musical processes. The VMC4UE repository currently advertises versions through UE5.1, so compatibility and maintenance must be verified before treating it as a dependable current solution.

Sources: [VMC4UE repository](https://github.com/HAL9HARUKU/VMC4UE) and [Unreal Take Recorder documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/take-recorder-in-unreal-engine).

### XR Animator and the broader VMC ecosystem

XR Animator already captures full-body movement from a webcam or media file, records and exports motion as VMD/BVH/glTF, loads several motion formats, and sends VMC to other applications. It solves capture and interchange exceptionally economically. It does not aim to be the whole BuMoChi environment. Its repository describes the code as effectively open for inspection but applies CC BY-NC-SA 4.0 to adaptations, so it is more precise to call it source-available under a non-commercial Creative Commons licence than unqualified open-source software.

The VMC protocol itself is MIT-licensed, OSC-based, cross-platform, and deliberately modular. Its official list includes receivers for Unity, Unreal, Blender, and Godot. This validates BuMoChi's decision to use VMC as an interchange layer, but it also argues against creating unnecessary proprietary intermediate representations. BuMoChi should remain a compositional participant in the VMC ecosystem, not attempt to replace it.

Sources: [XR Animator repository and feature list](https://github.com/ubemotho/XR-MoCap) and [VMC protocol specification](https://protocol.vmc.info/english).

### VSeeFace, Warudo, and related VTubing environments

Specialist VTubing tools should not be dismissed merely because their aims differ from an artistic research system. VSeeFace can send, receive, and combine tracking through VMC. Warudo supports VMC and many other capture systems, VRM characters, scene assets, cameras, and node-based visual scripting. These applications may offer a considerably quicker path to a visually polished live avatar, and their interaction designs are relevant references for BuMoChi's interface.

They are not equivalent to an open research platform. VSeeFace is distributed as a finished application with terms of use rather than as a generally modifiable free/open engine. Warudo has a proprietary EULA, separate conditions for professional use, and output workflows designed around streaming software such as OBS, Spout, NDI, and virtual cameras. Neither has been identified as providing BuMoChi's combination of inspectable skeletal clip data, anatomical source montage, SuperCollider mappings, and take folders preserving code and motion provenance. This is a difference in purpose, not a claim that BuMoChi is more capable overall.

Sources: [VSeeFace official documentation](https://www.vseeface.icu/), [Warudo introduction](https://docs.warudo.app/docs), [Warudo motion-capture overview](https://docs.warudo.app/docs/mocap/overview), and [Warudo EULA](https://warudo.app/eula).

### ossia score

ossia score is a free/open interactive intermedia sequencer. It combines timelines, OSC, audio, video, mappings, automation, conditions, loops, scripting, and external control. It is not identified here as a turnkey VMC animation system, but it overlaps strongly with BuMoChi's proposed Score timeline and rehearsal interface.

Instead of developing every sequencing and timeline facility in SuperCollider, BuMoChi could interoperate with ossia score or adopt ideas from it. A useful experiment would expose BuMoChi clips, players, ranges, and avatar routes as OSC/OSCQuery parameters and let ossia score handle cues and temporal structure. This would test whether BuMoChi's durable contribution is the VMC-aware motion layer rather than a general-purpose timeline.

Sources: [ossia score overview](https://ossia.io/score/about.html) and [ossia score documentation and licence](https://ossia.io/docs.html).

## Why SuperCollider is both reasonable and partial

The choice of SuperCollider is not technically inevitable. It reflects the principal developer's long familiarity with it and the artistic origin of the project in live coding and sonification. This is a legitimate research constraint and a source of practical productivity, but it should not be confused with evidence that SuperCollider is the best general animation architecture.

SuperCollider offers genuine advantages:

- a mature free/open platform for synthesis, analysis, algorithmic composition, and live coding;
- direct OSC communication and a compact language for reacting to network events;
- fast construction of mappings from motion parameters and change rates to sound;
- clocks, patterns, routines, buses, synth graphs, dependency notifications, and GUI classes in one environment;
- the ability to inspect and modify artistic processes during rehearsal rather than recompiling an engine project;
- an existing community and repertoire concerned with sound, embodiment, and performance.

These advantages explain why SuperCollider is a productive *artistic control plane*. They do not make it an ideal skeletal-animation database or video editor. Its disadvantages include:

- skeletal types, quaternion operations, retargeting, animation curves, and non-linear animation are not native concepts;
- sclang is dynamically typed and relatively niche, making large stateful systems harder to test, recruit for, and maintain;
- GUI facilities are adequate for utilities but weaker than specialist timeline and animation editors;
- language-side timing, audio-server timing, network timing, engine-frame timing, and screen-capture timing must be reconciled explicitly;
- storing large motion sequences as language objects may become inefficient compared with specialized binary formats or engine assets;
- video capture and muxing depend on external FFmpeg/Python processes;
- exact recovery of interactively evaluated source code is difficult;
- the learning curve may exclude choreographers and animators who do not already work with code;
- placing too much logic in SuperCollider can duplicate facilities already mature in Blender, Godot, Unity, Unreal, or ossia score.

Source: [SuperCollider project description and GPLv3 licence](https://github.com/supercollider/supercollider).

## What appears distinctive about BuMoChi

The survey does **not** support the claim that BuMoChi uniquely combines VMC, animation recording, editing, and video output. Blender, Unity, Unreal, Godot, and XR Animator cover substantial parts of that territory, sometimes much more effectively.

A narrower claim remains plausible: no directly comparable, ready-to-use environment was identified that combines an open VMC-centred network layer, live and recorded motion as equivalent performable sources, anatomical montage from several sources, SuperCollider-class sonification and live coding, multi-avatar routing, and take folders that preserve rendered media together with motion and process provenance.

That distinction may justify BuMoChi as research software, but only if these integrations produce artistic practices that are materially easier or newly possible. A small custom system is not justified merely because no other package has exactly the same feature list. Its value must be demonstrated through rehearsals and works.

## Risks of continuing the project

1. **Reimplementing mature tools.** Timeline editing, take management, video output, retargeting, and nonlinear animation are deep fields. Weak copies could consume development without serving the art.
2. **Integration burden.** A pipeline made from XR Animator, Python adapters, OSCGroups, SuperCollider, Godot, and FFmpeg has many processes, ports, versions, and failure modes.
3. **Single-developer knowledge.** The system may remain usable only by its author unless installation, diagnostics, interfaces, examples, and data formats become substantially simpler.
4. **Scope expansion.** Capture, networking, animation composition, sonification, editing, recording, metadata, and scene authoring can each become a separate project.
5. **Unverified uniqueness.** A better-supported Blender, Unity, Unreal, Godot, or ossia-based workflow may prove sufficient after a fair prototype comparison.
6. **Premature architecture.** Concepts such as clips, motions, figures, scenes, sources, and takes must be tested through actual works before their formats become rigid.
7. **Performance and synchronization.** UDP loss, independent clocks, GUI work, language garbage collection, and screen capture can compromise repeatability.
8. **Open-source ambiguity in dependencies.** The intended toolchain must distinguish free-to-use, source-available, and OSI-style free/open licences rather than treating them as equivalent.

## The effect of AI-assisted software development

AI-assisted programming is likely to accelerate development of BuMoChi and of its alternatives. This changes the cost of experimentation, but it does not by itself validate the present architecture.

For BuMoChi, AI can reduce the effort required to inspect unfamiliar code, write adapters, generate tests and documentation, translate between VMC/OSC representations, prototype interfaces, and maintain parallel SuperCollider, Python, and Godot components. A small artistic team can attempt integration work that would previously have required a larger software project. This is a genuine reason why a narrowly focused custom system may now be feasible.

The same effect weakens any argument based only on the present absence of a competing package. It may become equally easy to add the missing functions to Blender or Godot, connect ossia score to VMC, or generate a new web-based motion editor. Established platforms have larger communities, stronger data models, and more existing code on which AI tools can operate. Their relevant capabilities may therefore advance faster than BuMoChi's.

AI also introduces risks that are especially serious in a real-time, multi-process performance system:

- plausible code may conceal timing, concurrency, quaternion, resource-management, or data-loss errors;
- generated compatibility layers can increase the number of components without producing a coherent architecture;
- rapid feature production can outpace testing by performers and documentation for users;
- dependence on one developer may be replaced by dependence on code that no participant fully understands;
- generated implementations may reproduce licence-incompatible code or make unsupported claims about third-party systems;
- apparent short-term speed can create long-term maintenance and migration costs.

AI assistance should therefore be used to make alternatives cheaper to test, not to make architectural decisions less critical. Each substantial feature should be considered under three options:

1. **Build:** implement it in BuMoChi because it is VMC-specific, artistically distinctive, or inseparable from live sonification.
2. **Adopt:** use a mature facility in Blender, Godot, FFmpeg, ossia score, or another tool when the feature is generic.
3. **Interoperate:** keep BuMoChi's specialized motion model while exposing stable data and control interfaces to another environment.

This assessment should be revisited at regular milestones, not only when development encounters a crisis. A practical interval would be after each substantial rehearsal cycle or every six months. The review should search again for comparable systems, repeat selected comparative experiments, and ask whether any BuMoChi component has become redundant. AI-assisted migration should remain a legitimate outcome. Preserving documented, human-readable, protocol-based data makes such migration possible.

## Reasons to continue, conditionally

BuMoChi remains worth developing if it is treated as a focused experimental layer rather than a replacement for animation software. It offers a place to investigate questions that conventional animation packages do not foreground: Who controls each region of a virtual body? How can a past gesture argue with a live performer? How can motion become sound and sound become a control signal? How can several coders and dancers share agency over networked figures? How can the data and code of a rehearsal take remain inspectable and reusable?

The strongest practical reason is that the present artistic collaboration needs these operations now and can evaluate them through real production. Situated development with five artists can reveal requirements that a speculative general platform would miss. Even a system later replaced by another implementation can yield useful data models, interaction patterns, failure reports, and artistic knowledge.

Continuation should therefore be conditional on evidence from use: reduced rehearsal friction, successful recovery and reuse of takes, meaningful body-source composition, useful sonification, and participation by artists other than the primary developer.

## Development priorities suggested by this comparison

1. **Do not build a general video editor.** Keep FFmpeg capture simple and export motion to Blender or engine-native tools for detailed finishing.
2. **Make the VMC-aware motion layer the centre.** Prioritize reliable clips, provenance, subclip browsing, anatomical composition, transformations, multi-avatar routing, and live/generated frame capture.
3. **Treat SuperCollider as one control plane, not the universal container.** Keep file formats readable and adapters replaceable so another host could use the motion model later.
4. **Prototype interoperability with Blender.** Test VMC recording, editing, and final rendering there; document what BuMoChi adds and what Blender should own.
5. **Prototype ossia score control.** Expose clip and player state through stable OSC or OSCQuery before building a complex Score timeline from scratch.
6. **Investigate Godot-side recording.** Compare Godot Movie Maker output with real-time screen capture for quality, determinism, audio synchronization, and suitability for live takes.
7. **Separate rehearsal capture from final rendering.** A real-time MP4 is evidence and synchronization material; a deterministic engine or Blender render may be the final artwork.
8. **Build non-programmer interfaces around observed tasks.** Clip audition, range selection, routing, take naming, recording status, and error recovery are higher priorities than broad graphical abstraction.
9. **Preserve reproducibility.** Continue saving source motion, parameters, versions, routes, synthesis/mapping descriptions, and explicit notes about anything that could not be captured.
10. **Measure before optimizing or migrating.** Record CPU use, latency, dropped frames, clock drift, setup time, and artist errors in real rehearsals.

## Comparative experiments

The following small studies would turn this survey into stronger evidence:

- reproduce one two-source anatomical montage in EVMC4U and in BuMoChi;
- record the same VMC performance in Blender and BuMoChi, then compare non-destructive preset ranges, looping, reuse, and final rendering;
- render one take through real-time FFmpeg capture and Godot Movie Maker mode, measuring duration and synchronization;
- control a BuMoChi clip-player rehearsal from ossia score and compare it with the planned native timeline;
- give a new coder and a non-coding performer the same short scene task in two workflows and document setup time, interventions, errors, and artistic choices;
- reconstruct a take one month later using only its archived directory and note every missing dependency or undocumented decision.

## Provisional conclusion

BuMoChi does not need to exist because VMC animation or animation-video editing is otherwise unavailable. Those claims would be inaccurate. It may need to exist because a particular form of collaborative performance requires a VMC-aware, networked, live-codeable bridge between bodily motion, reusable clips, anatomical montage, sound synthesis, avatars, and reproducible rehearsal takes—and because current general-purpose tools leave that bridge to each artist to construct.

The SuperCollider implementation is both an enabling artistic choice and a bias. It should remain open to redistribution of responsibilities: Blender for detailed animation editing, Godot for rendering and possibly deterministic capture, ossia score for timelines, and a more conventional systems language if the coordination core outgrows sclang. BuMoChi's success should be judged not by how much software it contains, but by whether it identifies and implements the smallest missing layer that makes the artistic collaboration practicable.
