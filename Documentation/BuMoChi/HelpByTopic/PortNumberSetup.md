# Port Number Setup

# Ensuring the Port number settings of XR-Animator-SC-Godot pipeline

Use the following settings for the default Ishidomaru recording and monitoring pipeline:

```text
XR-Animator
    → VMC UDP 39537
BunrakuOSCEncoder
    → route-free Bunraku frames UDP 57130
SuperCollider / Bmc
    → routed Bunraku frames UDP 39538
BunrakuOSCDecoder
    → VMC UDP 39539
Godot / Ishidomaru
```

In the right-most column, **default** means that the port number can be omitted from the command or code that starts the application because the application already uses this value by default. **Mandatory** means that the port number must be included in the startup command or saved explicitly in the application's configuration. A saved Godot or XR-Animator project setting satisfies a mandatory entry; it does not have to be entered again on every run.

| Component           | Port function                | Communicates with                        | UDP port | Purpose                                       | Coding status* |
| ------------------- | ---------------------------- | ---------------------------------------- | -------: | --------------------------------------------- | -------------- |
| XR-Animator         | VMC destination              | `BunrakuOSCEncoder`                      |  `39537` | Send captured VMC motion                      | mandatory      |
| `BunrakuOSCEncoder` | VMC listen port              | XR-Animator                              |  `39537` | Receive captured VMC motion                   | default        |
| `BunrakuOSCEncoder` | Bmc destination              | SuperCollider / Bmc                      |  `57130` | Send the local route-free frame copy          | default        |
| SuperCollider / Bmc | Dispatcher listen port       | `BunrakuOSCEncoder` and `OscGroupClient` |  `57130` | Receive local and remote route-free frames    | default        |
| `BunrakuOSCEncoder` | OSCGroups destination        | `OscGroupClient`                         |  `22244` | Send the collaborative route-free frame copy  | default        |
| `OscGroupClient`    | Transmission input port      | `BunrakuOSCEncoder`                      |  `22244` | Receive local frames for network sharing      | mandatory      |
| `OscGroupClient`    | Local output port            | SuperCollider / Bmc                      |  `57130` | Deliver remote frames to local Bmc            | mandatory      |
| SuperCollider / Bmc | Decoder destination          | `BunrakuOSCDecoder`                      |  `39538` | Send locally synthesized routed frames        | default        |
| `BunrakuOSCDecoder` | Routed-frame listen port     | SuperCollider / Bmc                      |  `39538` | Receive locally synthesized routed frames     | default        |
| SuperCollider / Bmc | Ishidomaru frame destination | Godot VMC tracker, via decoder           |  `39539` | Embed the final VMC destination in each frame | default        |
| Godot VMC tracker   | Ishidomaru listen port       | `BunrakuOSCDecoder`                      |  `39539` | Receive reconstructed VMC bundles             | mandatory      |


\* **Coding status:** if the status is **default**, the port number can be omitted from the command or code that starts the application. If the status is **mandatory**, the port number must be included in the startup command or saved explicitly in the application's settings. There are only 2 mandatory port numbers:

1. VMC-Animator.  In the VMC-Animator application settings, you must ensure that it sends its data the port where BunrakuOSCEncoder is listening, namely 39537. This is done by the popup settings window that opens by double-clicking the fifth icon from the left in the bottom control icon strip (see screenshots)
2. In Godot VMC Tracker plugin inside your Godot p

## Setting the mandatory numbers

### 1. XR-Animator VMC output port

![[Pasted image 20260829114306.png]]

You should double click on this icon to open the port settings:
![[Pasted image 20260829114345.png]]

This icon will open the VMC protocol settings that look like this:

![[Pasted image 20260829114448.png]]

Single click on item A opens a window for inputing the port number. 

The `39539` route appears twice because Bmc must embed the destination in every routed frame and Godot must listen on the same destination. Bmc supplies its side by default. The Godot project must have its VMC tracker configured and saved to listen on `39539`.

The decoder option `--allow-target-port 39539` is an optional safety restriction. The decoder does not require it: with no allow-list options, it accepts the valid destination port embedded in each routed frame.

The avatar name carried by the encoder must match a registered Bmc avatar. For the default pipeline, use exactly `Ishidomaru`. Do not use `BunrakuTestAvatar` unless that separate avatar identity has first been registered and assigned a VMC port in Bmc.

### 2. OSCGroupClient port

This section applies when OSCGroups collaboration is enabled. One `OscGroupClient` is sufficient on each workstation.

For the local motion-data pipeline, `OscGroupClient` uses two application-facing UDP ports:

| Port function | Port | Direction |
|---|---:|---|
| Input port | `22244` | `BunrakuOSCEncoder` sends the local route-free frame copy to `OscGroupClient`. |
| Output port | `57130` | `OscGroupClient` sends route-free frames received from remote collaborators to the local Bmc dispatcher. |

These two port numbers are positional arguments in the `OscGroupClient` startup command, so they must be written explicitly. They are the fourth and fifth arguments:

```text
OscGroupClient SERVER_ADDRESS SERVER_PORT LOCAL_TO_REMOTE_PORT INPUT_PORT OUTPUT_PORT USER_NAME USER_PASSWORD GROUP_NAME GROUP_PASSWORD
```

For the recommended BuMoChi configuration:

```text
INPUT_PORT  = 22244
OUTPUT_PORT = 57130
```

For example:

```bash
OscGroupClient \
  oscgroups.example.org 22242 22243 22244 57130 \
  PerformerA USER_PASSWORD ICLC27 GROUP_PASSWORD
```

In this example, `22242` is the shared `OscGroupServer` port and `22243` is this client's local network-facing port. Choose a free and distinct `LOCAL_TO_REMOTE_PORT` for each client on the same computer. Each workstation must also use a unique user name.

The local encoder sends identical route-free frames both to Bmc and to `OscGroupClient`:

```text
BunrakuOSCEncoder ──UDP 57130──> local Bmc
                  └─UDP 22244──> local OscGroupClient ──> remote collaborators
```

The encoder uses `22244` as its default OSCGroups destination. The option can therefore normally be omitted, or stated explicitly:

```bash
BunrakuOSCEncoder --oscgroups-port 22244 --avatar "Ishidomaru" --source "workstation-a-xr-animator" --verbose
```

Do not set the `OscGroupClient` output to decoder port `39538`. Remote route-free source frames must first enter Bmc on `57130`, where they can be selected, combined, recorded, or otherwise synthesized locally.

Before starting the client, check whether another process already owns its input port:

```bash
lsof -nP -iUDP:22244
```

### 3. SuperCollider port listening to OSCGroupClient

After the SuperCollider class library compiles, the active `BmcDispatcher` listens on UDP port `57130` by default.

```supercollider
Bmc.dispatcher.port;      // 57130
Bmc.dispatcher.isRunning; // true
Bmc.dispatcher.status;
```

The same Bmc input port receives route-free frames from two kinds of local sender:

```text
local BunrakuOSCEncoder ────────────────┐
                                       ├──UDP 57130──> BmcDispatcher
local OscGroupClient, remote frames ────┘
```

This does not constitute a port conflict. `BmcDispatcher` is the single process listening on `57130`; the encoder and `OscGroupClient` merely send UDP packets to that destination. The client does not need a second SuperCollider input port.

The network collaboration path is therefore:

```text
remote performer
    -> OSCGroups network
    -> local OscGroupClient
    -> UDP 57130
    -> local BmcDispatcher (on SuperCollider)
    -> local motion synthesis
```

Open the live Bmc input monitor with:

```supercollider
Bmc.showDispatcherStatus;
```

Its static field should report:

```text
Listening for '/bunraku/vmc/frame' on port: 57130
```

Its dynamic `received` count should increase when either the local encoder or a remote collaborator sends frames.

To use a different Bmc input port, restart the dispatcher on that port:

```supercollider
Bmc.dispatcher.start(57131);
```

If this port is changed, both sources that target Bmc must be changed to match:

1. Start `BunrakuOSCEncoder` with `--bmc-port 57131`.
2. Use `57131` as the `OUTPUT_PORT` positional argument when starting `OscGroupClient`.

All three values must agree:

```text
BunrakuOSCEncoder Bmc destination = 57131
OscGroupClient OUTPUT_PORT         = 57131
BmcDispatcher listening port       = 57131
```

### 4. Godot avatar-specific listening port

Each avatar rendered by Godot is assigned its own VMC listening port. This port is encoded in the scene file of the project that contains the avatar, so each project has its own port numbers for its avatars.

For the default Ishidomaru setup saved in project Seed_2_Ishidomaru_C is `39539`. Each avatar must have a different port number, because this is the address where VMC sends its data to animate that avatar. 

To inspect and/or set the port number of an avatar in a project do this:

1. Stop the running Godot scene, if necessary.
2. Open `demo.tscn`.
3. At the top of the Scene tree, select the avatar's VMC receiver node, such as `IshidomaruVMCTracker`.
4. In the panel on the right, select **Inspector**, not **Node**.
5. Find **UDP Listener Port** and enter the required port number.
6. In the same Inspector, verify that **Body Tracker Name** and **Face Tracker Name** belong to the selected avatar.
7. Save the scene with `Command-S`.

![Godot VMC receiver nodes and UDP Listener Port setting](images/mother-ishidomaru-vmc-trackers.png)

The screenshot shows `IshidomaruVMCTracker` selected and its **UDP Listener Port** set to `39540` in the two-avatar `Seed_4_Mother_Ishidomaru_E` project. In the default single-avatar `Seed_2_Ishidomaru_C` project, use `39539` instead. Do not change the port on `XRBodyModifier3D`; that node contains the internal body tracker name, not the network port.



#### Note: Avoid duplicate port numbers

This port (the Ishidomaru port) is different from the `BunrakuOSCDecoder` input port, `39538`. Bmc sends a routed frame to the decoder on `39538`, with the avatar’s destination port embedded in the frame. The decoder reads that value, reconstructs the VMC messages, and forwards them to the specified Godot port.

```
Bmc
    → decoder input: UDP 39538
BunrakuOSCDecoder
    → Ishidomaru VMC input: UDP 39539
Godot / Ishidomaru
```

The port configured for the avatar in Bmc must therefore match the port configured in the corresponding Godot VMC tracker:

```
Bmc.avatar(\Ishidomaru).vmcPort;
```

The expected result is:

```
39539
```

To assign a different destination:

```
Bmc.avatar(\Ishidomaru).vmcPort_(39540);
```

If this value is changed, the Ishidomaru VMC tracker in Godot must also be changed to listen on `39540`.

When a scene contains several independently animated avatars, assign each avatar a different VMC port. For example:

```
Ishidomaru → UDP 39539
Mother     → UDP 39540
```

The decoder can serve all these avatars from one input port because each routed frame carries its own destination port. It is therefore normally unnecessary to run a separate decoder for every avatar.

Do not assign the same UDP listening port to two separate Godot processes running simultaneously. Only one process can normally bind reliably to a particular UDP port.
# Details

## Start the decoder:

```bash
BunrakuOSCDecoder \
    --listen-port 39538 \
    --allow-target-port 39539 \
    --verbose
```

Start the encoder for a local recording test without OSCGroups:

```bash
BunrakuOSCEncoder \
    --listen-port 39537 \
    --bmc-port 57130 \
    --avatar "Ishidomaru" \
    --source "workstation-a-xr-animator" \
    --no-oscgroups \
    --verbose
```

For collaborative use, start `OscGroupClient`, remove `--no-oscgroups`, and optionally state its default input explicitly:

```bash
BunrakuOSCEncoder \
    --listen-port 39537 \
    --bmc-port 57130 \
    --oscgroups-port 22244 \
    --avatar "Ishidomaru" \
    --source "workstation-a-xr-animator" \
    --verbose
```

After compiling the SuperCollider class library, inspect the active settings with:

```supercollider
(
(
    bmcInputPort: Bmc.dispatcher.port,
    bmcRunning: Bmc.dispatcher.isRunning,
    decoderPort: Bmc.decoderPort,
    decoderForwarding: Bmc.forwardDecoder,
    avatarName: Bmc.defaultAvatar.avatarName,
    avatarVmcPort: Bmc.defaultAvatar.vmcPort
).postln;
)
```

The expected values are `57130`, `true`, `39538`, `true`, `Ishidomaru`, and `39539`, respectively.

Restore the default Bmc output settings if necessary:

```supercollider
Bmc.decoderPort_(39538);
Bmc.forwardDecoder_(true);
Bmc.avatar(\Ishidomaru).vmcPort_(39539);
```

While XR-Animator is sending, evaluate `Bmc.status` repeatedly and confirm that its `received` count increases:

```supercollider
Bmc.status;
```

An “Address already in use” error usually means that an older instance of the process assigned to that listening port is still running.

# Default forwarding pipeline of BuMoChi after fresh library compile

After SuperCollider’s class library compiles, Bmc automatically forwards matching incoming frames to `BunrakuOSCDecoder`.

It is not a byte-for-byte forward. Bmc:

1. Receives a route-free version-1 Bunraku frame from `BunrakuOSCEncoder`.
2. Matches its avatar name.
3. Completes the pose if necessary.
4. Assigns the selected output avatar name.
5. Embeds the avatar’s Godot/VMC destination port.
6. Sends the resulting routed version-2 frame to `BunrakuOSCDecoder`.

## Current defaults

```
XR-Animator → BunrakuOSCEncoder input: 39537
BunrakuOSCEncoder → Bmc input:         57130
Bmc → BunrakuOSCDecoder input:         39538
BunrakuOSCDecoder → Godot VMC port:    39539

Default avatar ID:                     Ishidomaru
Default avatar name:                   Ishidomaru
Decoder forwarding:                    enabled
```

These defaults are established when the SC class library compiles.

## Inspect the current configuration

Evaluate:

```
(
(
    bmcInputPort: Bmc.dispatcher.port,
    bmcRunning: Bmc.dispatcher.isRunning,
    decoderPort: Bmc.decoderPort,
    decoderForwarding: Bmc.forwardDecoder,
    avatarID: Bmc.defaultAvatar.avatarID,
    avatarName: Bmc.defaultAvatar.avatarName,
    avatarVmcPort: Bmc.defaultAvatar.vmcPort
).postln;
)
```

You can also inspect reception statistics:

```
Bmc.status;
```

Look at:

- `running`: should be `true`
- `port`: should be `57130`
- `received`: should increase while XR-Animator is moving
- `rejected`: should remain `0`
- `dropped`: ideally remains `0`, although occasional dropped frame IDs need not stop animation

## Change the Godot destination port

For Ishidomaru:

```
Bmc.avatar(\Ishidomaru).vmcPort_(39540);
```

Restore the default:

```
Bmc.avatar(\Ishidomaru).vmcPort_(39539);
```

This is the port embedded in each outgoing frame. It must equal the VMC listening port configured in the Godot project.

## Change the decoder input port

```
Bmc.decoderPort_(39538);
```

If you change this, start `BunrakuOSCDecoder` with the corresponding port:

```
BunrakuOSCDecoder --listen-port 39538
```

## Enable or disable live forwarding

Enable:

```
Bmc.forwardDecoder_(true);
```

Disable:

```
Bmc.forwardDecoder_(false);
```

This does not stop Bmc from receiving or recording frames. It only controls whether completed frames are sent onward to the decoder and Godot.

## Use a different avatar

Create and configure it:

```
~mother = Bmc.addAvatar(\Mother, "Mother");
~mother.vmcPort_(39540);
Bmc.selectAvatar(\Mother);
```

The encoder must then use the matching source avatar name:

```
BunrakuOSCEncoder \
    --avatar "Mother" \
    --source "workstation-a-xr-animator"
```

`Bmc.selectAvatar(\Mother)` selects Mother for playback and other top-level operations. Live incoming frames are dispatched according to the avatar name contained in each frame, so that encoder name must match a registered Bmc avatar.

## Recommended test configuration

Start the decoder:

```
BunrakuOSCDecoder --verbose
```

Start the encoder:

```
BunrakuOSCEncoder \
    --avatar "Ishidomaru" \
    --source "workstation-a-xr-animator" \
    --no-oscgroups \
    --verbose
```

Configure XR-Animator to send VMC to:

```
127.0.0.1:39537
```

Then verify in SuperCollider:

```
Bmc.status;
```

For this local test, `received` should increase and Ishidomaru should move in Godot. Once this works, remove `--no-oscgroups` to include collaborative transmission:

```
BunrakuOSCEncoder \
    --avatar "Ishidomaru" \
    --source "workstation-a-xr-animator" \
    --verbose
```

This same live forwarding remains active while `Bmc.record` records the incoming motion, so you can monitor the avatar in Godot during recording.

# Connect XR-Animator to SuperCollider via OscEncoder

1.  In XR-Animator, open the VMC/OSC output settings and set the destination to:

    ``` example
    Host: 127.0.0.1
    Port: 39537
    ```

    Enable VMC output. XR-Animator may remain running while the other parts of the pipeline are started.

2.  Open Terminal and change to BuMoChi's testing directory:

    ``` bash
    cd /Users/iani/Obsidian/Iani/Projects/260715_ICLC27/AppsAndCode/BuMoChi/PipelineApplications
    ```

3.  Start the Python encoder in that terminal:

    ``` bash
    python3 BunrakuOSCEncoder.py \
      --no-oscgroups \
      --avatar "BunrakuTestAvatar" \
      --source "xr-animator" \
      --verbose
    ```

    Alternatively, if you have installed a globally accessible copy of BurakuOSCEncoder, try:

    ``` bash
    BunrakuOSCEncoder \
      --no-oscgroups \
      --avatar "BunrakuTestAvatar" \
      --source "xr-animator" \
      --verbose
    ```

    Keep this terminal open. When XR-Animator is sending data, the encoder's received/sent counters should increase.

4.  In SuperCollider, evaluate the following block. Evaluate the entire block by placing the cursor inside it and pressing `Command-Return`.

    ``` supercollider
    (
    Bmc.reset;

    // This identifier must match the encoder's --avatar value.
    Bmc.addAvatar(\BunrakuTestAvatar, "BunrakuTestAvatar");
    Bmc.selectAvatar(\BunrakuTestAvatar);

    // Playback and live frames will be sent to the decoder on this port.
    Bmc.avatar(\BunrakuTestAvatar).vmcPort_(39539);
    // Receive encoded XR-Animator frames here.
    Bmc.start(57130);
    )
    ```

5.  Confirm that SuperCollider is receiving frames:

    ``` supercollider
    Bmc.status;
    ```

    In the Post window, `running` should be `true`, `port` should be `57130`, and `received` should increase while you move in front of XR-Animator.

6.  Optional but recommended: make the live and replayed motion visible in Godot. Run a Godot project whose VMC tracker listens on port `39539`, such as the Mother input of `Seed_4_Mother_Ishidomaru_C`. Then open a second terminal in `PipelineApplications` and start the decoder:

    ``` bash
    python3 BunrakuOSCDecoder.py \
      --listen-port 39538 \
      --accept-avatar "BunrakuTestAvatar" \
      --verbose
    ```

    The avatar in Godot should now follow the live XR-Animator motion. This confirms the complete path before recording.
