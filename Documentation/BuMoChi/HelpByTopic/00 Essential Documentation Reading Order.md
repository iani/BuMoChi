# Essential BuMoChi documentation: suggested reading order

BuMoChi combines motion capture, SuperCollider, OSC/VMC routing, Godot rendering, recording, and live collaboration. New users should not try to read every technical note before beginning. The following order introduces the essential ideas first and then leads into practical operation.

## First reading: orientation and vocabulary

1. [Why BuMoChi?](WhyBuMoChi.md)
   Read this first for the artistic and technical purpose of the system.

2. [BuMoChi Terminology Glossary](Glossary.md)
   Learn the meanings of Project, Sequence, Scene, Clip, Preset, Motion, Figure, and Avatar. These terms have precise meanings in the documentation.

3. [Component Applications and Sources](Component%20Applications%20and%20Sources.md)
   See which responsibilities belong to XR-Animator, the OSC encoder and decoder, SuperCollider/BuMoChi, OSCGroups, and Godot.

## First installation and launch

4. [Installation](../Installation.md)
   Install the required applications and the BuMoChi SuperCollider library.

5. [Getting Started](../Getting%20Started.md)
   Follow the main beginner walkthrough.

6. [Setup](Setup.md)
   Learn the current pipeline launcher and its standard configuration.

7. [Step-by-step startup of pipeline components](Step-by-step%20startup%20of%20pipeline%20components.md)
   Use this when learning what each running process does or when starting components separately.

# Creating a piece

- [Creating a Piece](Creating%20a%20Piece.md)
  Read this to learn about the top-level tools and workflow for creating animation material, sonification material and structuring it into animation and interaction sequences.
## Projects, Scenes, Clips, and Presets

8. [Working with Godot projects](WorkingWithGodotProjects.md)
   Read the project-directory convention, Scene discovery rules, VMC avatar requirements, template-project policy, and planned inspection-and-launch workflow.

9. [Recording and Playback](RecordingAndPlayback.md)
   Learn how complete Clips are recorded, stored, loaded, and played.

10. [Scene Data Objects and Terminology](SceneDataObjectsAndTerminology.md)
    Read the more detailed Scene, Motion, Figure, Avatar, and routing design after understanding the Glossary.

11. [Editors overview](Editors/README.md)
    Understand the division between the integrated Asset Manager and the timeline-oriented Sequence Editor.

12. [Asset Manager draft](Editors/Asset_Manager/01%20Asset%20Manager%20Draft%201.md)
    Read the bottom-up material-preparation and Sequence-first Scene workflows.

13. [Sequence Editor draft](Editors/Sequence_Editor/01%20Sequence%20Editor%20Draft%201.md)
    Learn how Scenes and their Presets will be arranged over time.

## Routing and multiple avatars

14. [Avatar Port Numbers](Avatar_Port_Numbers.md)
    Understand the shared decoder and the separate VMC destination port for each avatar.

15. [Port Number Specification](PortNumberSpecification.md)
    Consult the complete port assignments when configuring or troubleshooting applications.

16. [OSC Encoder and Decoder Use and Configuration](OSCEncoder-DecoderUseAndConfiguration.md)
    Read this before changing the standard OSC pipeline or running its components manually.

## Continue according to the task

- For one performer, continue with [Single-user setup](SetupInstructions/SingleUserSetup.md).
- For collaboration, continue with [Multi-user setup](SetupInstructions/MultiUserSetup.md) and [OSCGroups Use and Configuration](OSCGroupsUseAndConfiguration.md).
- For live camera control, continue with [Controlling avatars from a camera](ControllingAvatarsFromCamera.md).
- For audio and screen capture, continue with [Recording audio and screen video](RecordingAudioAndVideo.md).
- For sonification, continue with the [Sonification Guide](Sonification/Sonification_Guide.md).
- For method-level details, consult the [Bmc method reference](../Bmc%20method%20reference.md).
## Documentation status

BuMoChi is in pre-alpha development. Some documents describe the working pipeline, while Editor and automated Godot-project documents also contain forward-looking specifications. Each specification should state clearly when its corresponding API is not yet implemented.
