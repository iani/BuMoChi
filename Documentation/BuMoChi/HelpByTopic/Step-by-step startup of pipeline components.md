This detailed step-by-step guide is superseded by [[Full Setup Procedure#Quick start one-command pipeline launcher||The simplifide setup procedure]].  The instructions are provided here for testing and troubleshooting if needed. 

## 1. Start Godot

Open and run the following project:

``` text
AppsAndCode/GodotProjects/Seed_2_Ishidomaru_C/project.godot
```

The path above is relative to the complete ICLC27 workspace root. The project should show Ishidomaru and listen for VMC on UDP port `39539`.

## 2. Start BunrakuOSCDecoder

Open a terminal at the BuMoChi repository root and run:

``` bash
python3 PipelineApplications/BunrakuOSCDecoder.py \
  --listen-port 39538 \
  --allow-target-port 39539 \
  --verbose
```

Leave this terminal open.

## 3. Start SuperCollider and BuMoChi

Start SuperCollider and recompile the class library with **Language → Recompile Class Library**. Bmc should automatically begin listening on port `57130` with Ishidomaru selected and decoder forwarding enabled.

Check the defaults:

``` supercollider
Bmc.status;
Bmc.defaultAvatar.avatarName;
Bmc.defaultAvatar.vmcPort;
Bmc.decoderPort;
```

The avatar name should be `Ishidomaru`, the avatar VMC port should be `39539`, and the decoder port should be `39538`.

Open the input monitor:

``` supercollider
Bmc.showDispatcherStatus;
```

The static line should report that Bmc is listening for `/bunraku/vmc/frame` on port `57130`.

## 4. Start BunrakuOSCEncoder

Open another terminal at the BuMoChi repository root and run:

``` bash
python3 PipelineApplications/BunrakuOSCEncoder.py \
  --no-oscgroups \
  --avatar "Ishidomaru" \
  --source "getting-started-xr" \
  --verbose
```

Leave this terminal open. The stable source name `getting-started-xr` is used by the recording examples below.

## 5. Start XR-Animator

Start XR-Animator, select the webcam, and configure its VMC destination:

``` text
Host: 127.0.0.1
Port: 39537
```

Enable VMC output and stand where the camera can see the body.
