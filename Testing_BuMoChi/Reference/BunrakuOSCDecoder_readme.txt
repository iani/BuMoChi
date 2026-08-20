BunrakuOSCDecoder.py — Reference
=================================

PURPOSE
-------

BunrakuOSCDecoder.py receives Bunraku Frame protocol-version-1 OSC messages
and reconstructs standard Virtual Motion Capture (VMC) OSC bundles for Godot
or another VMC-compatible receiver.

Each accepted input packet must contain exactly one OSC message at:

    /bunraku/vmc/frame

The message contains the protocol version, avatar name, source identifier,
frame number, timestamp, and 21 ordered bone transforms. The decoder converts
it into one VMC OSC bundle containing:

    /bunraku/avatar/name

followed by 21 messages at:

    /VMC/Ext/Bone/Pos

Each bone transform consists of seven floating-point values:

    x, y, z, qx, qy, qz, qw

The reconstructed VMC bundle may be larger than 1200 bytes. It is intended for
the final local connection to Godot, not for retransmission through OSCGroups.


BASIC TEST-2 COMMAND
--------------------

When OSCGroups, the decoder, and Godot run on the same Mac:

    python3 BunrakuOSCDecoder.py \
      --listen-port 39538 \
      --target-port 39539 \
      --accept-avatar "BunrakuTestAvatar" \
      --verbose

Configure the OSCGroups receiving client to forward Bunraku frames to:

    127.0.0.1:39538

The canonical Godot VMC project listens on:

    127.0.0.1:39539


TEST-3 COMMAND: SUPERCOLLIDER PLAYBACK TO GODOT
------------------------------------------------

For direct SuperCollider playback through the decoder:

    python3 BunrakuOSCDecoder.py \
      --listen-port 39538 \
      --target-port 39539 \
      --verbose

SuperCollider must send /bunraku/vmc/frame messages to 127.0.0.1:39538.


TEST-4 COMMAND: COMPLETE PIPELINE ON ONE MAC
--------------------------------------------

In the complete pipeline, port 39538 is used by the encoder and port 57130 by
SuperCollider. Use the spare port 39537 between SuperCollider and the decoder:

    python3 BunrakuOSCDecoder.py \
      --listen-port 39537 \
      --target-port 39539 \
      --accept-avatar "BunrakuTestAvatar" \
      --verbose

Configure SuperCollider's output for this test as:

    ~bunrakuGodotAdapter = NetAddr("127.0.0.1", 39537);


COMMAND-LINE OPTIONS
--------------------

-h, --help
    Display the command summary and exit.

--listen-ip ADDRESS
    Local network address on which the decoder receives Bunraku frames.

    Default: 127.0.0.1

    Use 127.0.0.1 when the OSCGroups receiving client or SuperCollider runs on
    the same computer. Use 0.0.0.0 only when packets must be accepted from
    another computer and the firewall is configured appropriately.

--listen-port PORT
    UDP port on which the decoder receives Bunraku frames.

    Default: 39538
    Valid range: 1 to 65535

    This must equal the output destination used by the OSCGroups receiving
    client or SuperCollider. In the single-Mac complete-pipeline Test 4, use
    39537 to avoid a conflict with the encoder on 39538.

--target-ip ADDRESS
    Destination address for reconstructed VMC bundles.

    Default: 127.0.0.1

    Normally this remains 127.0.0.1 because Godot runs on the same computer.
    If Godot runs elsewhere, use that computer's reachable network address.

--target-port PORT
    Destination UDP port for reconstructed VMC bundles.

    Default: 39539
    Valid range: 1 to 65535

    This must equal the VMC input port configured in the Godot project.

--avatar NAME
    Replace the avatar name in the emitted /bunraku/avatar/name metadata.

    Default: preserve the avatar name contained in the Bunraku frame

    This does not change the bone data. Use it when the receiving application
    expects a specific local avatar identity. The name cannot be empty.

--accept-avatar NAME
    Convert only Bunraku frames whose avatar name exactly matches NAME.

    Default: accept all avatar names

    Frames belonging to other avatars increment the filtered counter. They are
    not malformed and therefore do not increment rejected. This option is
    useful when several performers share one OSCGroups session. The name cannot
    be empty.

--stats-interval SECONDS
    Interval between status reports.

    Default: 5.0

    Use 0 to disable periodic reports. Negative values are invalid.

--verbose
    Print an individual warning for each malformed, incompatible, or otherwise
    rejected packet. Periodic counters are printed independently according to
    --stats-interval.


STATUS COUNTERS
---------------

received
    Total UDP packets received by the decoder.

sent
    Valid Bunraku frames converted to VMC bundles and sent to the target.

filtered
    Valid Bunraku frames ignored because their avatar name did not match
    --accept-avatar.

rejected
    Packets rejected because they were malformed, were not Bunraku Frame
    protocol-version-1 messages, used an unsupported version or payload shape,
    or could not be sent.

A healthy single-avatar run resembles:

    received=900, sent=900, filtered=0, rejected=0

With --accept-avatar in a multi-avatar session, filtered may legitimately rise.
The important conditions are that sent continues to increase for the selected
avatar and rejected remains zero.


INPUT VALIDATION
----------------

The decoder accepts only Bunraku Frame protocol-version-1 messages with:

    OSC address: /bunraku/vmc/frame
    Version:     1
    Metadata:    avatar, source, frame ID, timestamp
    Bone data:   21 transforms, seven floats per transform

The decoder rejects raw XR Animator VMC messages, OSCGroups control messages,
messages using another OSC address, unsupported protocol versions, truncated
packets, and packets with the wrong type tags or payload length.

The warning:

    packet rejected: not a Bunraku Frame protocol-v1 message

usually means that the decoder is receiving raw VMC or other OSC traffic
instead of the encoder's /bunraku/vmc/frame output. Check the OSCGroups routing
and local ports before changing the decoder.


OUTPUT BONE ORDER
-----------------

The reconstructed VMC bundle contains these bones:

    Hips, Spine, Chest, Neck, Head,
    LeftShoulder, LeftUpperArm, LeftLowerArm, LeftHand,
    RightShoulder, RightUpperArm, RightLowerArm, RightHand,
    LeftUpperLeg, LeftLowerLeg, LeftFoot, LeftToes,
    RightUpperLeg, RightLowerLeg, RightFoot, RightToes

Every valid Bunraku input frame already contains all 21 transforms. The decoder
does not interpolate bones, hold previous values, or construct a neutral pose;
it reproduces the complete frame supplied by the encoder or SuperCollider.


PORT TROUBLESHOOTING ON macOS
-----------------------------

If the decoder reports that it cannot listen on a port, identify its owner with:

    lsof -nP -iUDP:39538

Replace 39538 with the port in question. Stop the listed application or choose
a free port and update the sending component to use the same number.

Two processes cannot normally listen on the same local UDP address and port.


STOPPING THE DECODER
--------------------

Press Control-C. The decoder prints its final counters and closes its UDP
sockets.
