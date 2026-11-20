# BuMoChi Workshop Tutorial: Start Here

This tutorial is the introductory material for the BuMoChi workshop in Oulu. It assumes no previous experience with SuperCollider, Godot, or motion capture. By the end you will have moved an animated character with your own body, recorded and replayed that movement, recombined it, and turned it into sound.

BuMoChi is in pre-alpha development. The steps here use only the parts of the library that already work. If something behaves differently from what is written, tell the workshop leader: that is useful feedback, not your mistake.

## What you will do

| Part | Chapter | What you achieve | Approx. time |
|---|---|---|---|
| Orientation | [01 What BuMoChi Does](01%20What%20BuMoChi%20Does.md) | Understand the four programs and how movement travels between them | 10 min reading |
| Preparation | [02 Before the Workshop: Installation](02%20Before%20the%20Workshop%20-%20Installation.md) | Install everything and pass a five-point check | 30–45 min, **at home** |
| Exercise 1 | [03 First Run: Move the Avatar](03%20First%20Run%20-%20Move%20the%20Avatar.md) | Your webcam moves a character in Godot | 20 min |
| Skills | [04 SuperCollider Survival Guide](04%20SuperCollider%20Survival%20Guide.md) | Run code, read the Post window, stop everything | 10 min |
| Exercise 2 | [05 Record and Play Back Movement](05%20Record%20and%20Play%20Back%20Movement.md) | Record clips; replay, loop, slow down, cut | 25 min |
| Exercise 3 | [06 Compose Movement](06%20Compose%20Movement.md) | Mix body parts from two takes; move the character with code | 25 min |
| Exercise 4 | [07 Movement to Sound](07%20Movement%20to%20Sound.md) | Your body, and then a recorded clip, controls a synthesizer | 30 min |
| Exercise 5 | [08 Make a Short Study](08%20Make%20a%20Short%20Study.md) | A 30–60 second piece of your own | 30 min |
| Reference | [09 Troubleshooting and Cheat Sheet](09%20Troubleshooting%20and%20Cheat%20Sheet.md) | Fix common problems; one-page command list | as needed |

All the code in the exercises is collected in one file that you can open in SuperCollider and run block by block:

```text
Documentation/BuMoChi/Tutorial/BuMoChi_Workshop02_RecordingAndPlayback.scd
```

For a window-based composition exercise, open `Bmc.sceneCompositor;` and follow [SceneCompositor](../HelpByTopic/SceneCompositor.md) to generate, preview and save a performance from your recorded clips.

## What you need

- A laptop with a webcam (built-in is fine). macOS or Linux is the tested setup; Windows users see the note in chapter 03.
- Headphones or speakers, for chapter 07.
- Enough room to stand about two metres from the camera so that your whole body is visible, and even lighting from the front.
- The software from chapter 02, installed and checked **before** the workshop.

## How to read the exercises

- Lines marked `supercollider` are run in the SuperCollider editor. Chapter 04 explains how.
- Lines marked `bash` are typed in a terminal, at the root of the BuMoChi folder.
- Each exercise ends with a **Checkpoint**. Do not go on until it passes; every exercise builds on the one before.
- **Try it** boxes are optional variations. Skip them if you are short of time.

## The names you will meet

The default character is called **Ishidomaru**. A second character, **Mother**, appears in the two-avatar project. Both come from the separate BuMoChi_Assets download installed in chapter 02, under `BuMoChiAssets/GodotProjects`:

| Godot project folder | Character(s) |
|---|---|
| `VMC_1_Avatar_M` | Ishidomaru |
| `VMC_1_Avatar_F` | Mother |
| `VMC_2_Avatars` | Mother and Ishidomaru |

Next: [01 What BuMoChi Does](01%20What%20BuMoChi%20Does.md)
