# 09 Troubleshooting and Cheat Sheet

## The character does not move

Work from the camera towards Godot. Stop at the first step that fails; that is where the problem is.

| # | Check | How | If it fails |
|---|---|---|---|
| 1 | XR-Animator is tracking you | Its own preview character moves with you | Select the right camera; improve light; step back so your whole body is visible |
| 2 | XR-Animator is sending | VMC output is on, host `127.0.0.1`, port `39537` | Correct the port; switch VMC off and on again |
| 3 | The helpers are running | The terminal with `./start_bumochi_pipeline.sh` is still open and shows no error | Start it again. If it reports a port "already in use", an old copy is still running: close other terminals or restart the computer |
| 4 | SuperCollider receives data | `Bmc.showDispatcherStatus;` and watch `received` climb | Recompile the class library, then look again. Run `Bmc.help;` and compare the ports |
| 5 | BuMoChi is not ignoring the camera | Run `Bmc.cameraTarget_(\Ishidomaru);` | You had run `Bmc.stopCameraAnimation;` earlier, which is the most common cause after chapter 05 |
| 6 | Godot is running the scene | The Godot **game window** is open, not only the editor | Press Play (F5) |
| 7 | Godot listens on the right port | Project `VMC_1_Avatar_M` uses `39539` | Check that you opened the right project; in `VMC_2_Avatars` the ports differ (chapter 06, part C) |

Only one program can listen on a port. Two copies of the launcher, or two running Godot scenes, will block each other.

On macOS or Linux you can see which program holds a port:

```bash
lsof -nP -iUDP:39537
lsof -nP -iUDP:57130
lsof -nP -iUDP:39538
lsof -nP -iUDP:39539
```

## Other problems

| Symptom | Likely cause and fix |
|---|---|
| `ERROR: Class not defined` for `Bmc` | BuMoChi is not in the SuperCollider extensions folder, or the class library was not recompiled. Repeat chapter 02, step 3 |
| A recorded clip has 0 frames | No data was arriving while you recorded. Check `received` |
| `Unknown Bmc clip` | Typing mistake in the clip name. Run `Bmc.listClips;` |
| `Bmc is already recording` | Run `Bmc.stopRecording;` or `Bmc.cancelRecording;` |
| The character twitches between two poses | The live camera and a clip are both driving it. Run `Bmc.stopCameraAnimation;` or stop the clip |
| The character is stuck off-centre or circling | A position modifier is still active. Run `Bmc.clearModifiers;` |
| No sound | Sound engine not started (`s.boot;`); instrument block not run; volume or output device |
| Sound is stuck on one pitch | Movement is outside the mapping's input range. Widen it |
| Sound will not stop | Cmd-Period (macOS) or Ctrl-Period |
| The avatar jitters | Tracking is unstable: more light, plainer background, slower movement |
| Godot shows a grey window or errors about add-ons | The project was not fully imported, or Godot is not version 4.5 |
| Everything was working and now nothing is | Recompile the class library; restart the launcher; press Play in Godot again. In that order |

## Cheat sheet

### Start-up order

```text
1. Godot: open project, press Play
2. Terminal: ./start_bumochi_pipeline.sh
3. SuperCollider: start (or recompile), then Bmc.showDispatcherStatus;
4. XR-Animator: camera on, VMC output on, 127.0.0.1 : 39537
```

### Shut-down order

```text
1. XR-Animator: VMC output off
2. SuperCollider: Bmc.stopPlayback;  and Cmd-Period
3. Terminal: Ctrl-C
4. Godot: stop the scene
```

### Ports

```text
XR-Animator -> 39537 -> encoder -> 57130 -> SuperCollider/Bmc -> 39538 -> decoder -> 39539 -> Godot
```

### Keys in SuperCollider

| Action | macOS | Linux / Windows |
|---|---|---|
| Run line or block | Cmd-Return | Ctrl-Return |
| Stop all sound and playback | Cmd-Period | Ctrl-Period |
| Recompile | Language menu → Recompile Class Library | same |

### Commands

```supercollider
// Looking
Bmc.status;                      // everything at a glance
Bmc.help;                        // port numbers in use
Bmc.showDispatcherStatus;        // live input monitor window
Bmc.listClips;                   // clips and their lengths
Bmc.showClips;                   // clip list window

// Camera
Bmc.stopCameraAnimation;         // ignore the camera
Bmc.cameraTarget_(\Ishidomaru);  // camera drives Ishidomaru again

// Recording
Bmc.record(\name);
Bmc.stopRecording;
Bmc.cancelRecording;

// Playback
Bmc.play(\name);
Bmc.play(\name, loop: true, rate: 0.5, startFrame: 60, endFrame: 180);
Bmc.pause;
Bmc.resume;
Bmc.stopPlayback;

// Composition
Bmc.combineClips(\base, \donor, \arms, \result);
Bmc.saveClipScd(\result);
Bmc.addPositionModifier(\name, \Ishidomaru, [x, y, z]);
Bmc.removeModifier(\name);
Bmc.clearModifiers;

// Sound
s.boot;
~sound = BmcLiveSonification(\synthName, [mappings], [\amp, 0.05]).start;   // follows the camera
~sound.stop;
Bmc.sonifyTake(\name, ~clipSound);                                          // follows a clip
Bmc.stopTake;
BmcSonificationMapping.absolute(\Bone, \component, \control, [inMin, inMax], [outMin, outMax]);
BmcSonificationMapping.rate(\Bone, \component, \control, [inMin, inMax], [outMin, outMax]);
```

### Bone names

```text
Hips  Spine  Chest  Neck  Head
LeftShoulder   LeftUpperArm   LeftLowerArm   LeftHand
RightShoulder  RightUpperArm  RightLowerArm  RightHand
LeftUpperLeg   LeftLowerLeg   LeftFoot   LeftToes
RightUpperLeg  RightLowerLeg  RightFoot  RightToes

Groups:      \leftArm \rightArm \arms \leftLeg \rightLeg \legs \torso \upperBody \all
Components:  \x \y \z (position)   \qx \qy \qz \qw (rotation)
```

Back to [00 Start Here](00%20Start%20Here.md)
