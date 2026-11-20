# 03 First Run: Move the Avatar

**Goal:** you move, and Ishidomaru moves with you.

Start the programs in this order. It runs from the end of the chain back to the camera, so that every program finds its listener already waiting.

## Step 1. Godot

Open the project `VMC_1_Avatar_M` and press **Play** (the triangle at the top right, or F5). A window shows Ishidomaru standing still. Leave it running.

## Step 2. The two helpers

Open a terminal, go to the BuMoChi folder, and run:

```bash
./start_bumochi_pipeline.sh
```

This starts the encoder and the decoder with the standard ports. Leave the terminal open. Pressing **Ctrl-C** in it later stops both.

> **Windows.** The launcher is a shell script for macOS and Linux. On Windows, open two terminals in the BuMoChi folder and run one command in each:
>
> ```text
> python PipelineApplications\BunrakuOSCDecoder.py --listen-port 39538
> python PipelineApplications\BunrakuOSCEncoder.py --no-oscgroups --avatar Ishidomaru --source workshop-xr
> ```

## Step 3. SuperCollider

Start SuperCollider (or, if it is already open, choose **Language → Recompile Class Library**). BuMoChi starts listening by itself. Open the input monitor:

```supercollider
Bmc.showDispatcherStatus;
```

A small window appears. Keep it visible: its `received` number is your most useful instrument today.

To see all the port numbers BuMoChi is using:

```supercollider
Bmc.help;
```

## Step 4. XR-Animator

1. Start XR-Animator and select your webcam.
2. Start full-body tracking and step back until your whole body is in the picture.
3. Open the VMC protocol settings (double-click the VMC icon in the XR-Animator menu). Screenshots are in [Port Number Setup](../HelpByTopic/PortNumberSetup.md).
4. Set the destination to host `127.0.0.1`, port `39537`.
5. Switch VMC output **on**.

`127.0.0.1` means "this computer". `39537` is the encoder's port, the only port number you type by hand.

## Checkpoint

- The `received` number in the monitor window is climbing.
- Ishidomaru follows your movement in the Godot window.

If not, go to [09 Troubleshooting](09%20Troubleshooting%20and%20Cheat%20Sheet.md) and work through "The character does not move".

## Getting good tracking

- Stand so that the camera sees you from head to feet.
- Light yourself from the front; avoid a bright window behind you.
- Wear clothes that contrast with the background.
- Move slowly at first. Fast movement and crossed limbs confuse the tracker.

## Try it

- Raise one arm slowly, then quickly. How much delay is there? How much detail survives?
- Walk out of the picture and come back. What does the character do while it has no data?
- Find one movement that the tracker follows well and one that it gets wrong. Remember both for chapter 08: the mistakes are material too.

Next: [04 SuperCollider Survival Guide](04%20SuperCollider%20Survival%20Guide.md)
