BunrakuOSCEncoder.py — Reference
=================================

PURPOSE
-------

BunrakuOSCEncoder.py receives Virtual Motion Capture (VMC) OSC packets from
XR Animator and converts skeletal poses into the Bunraku Frame format.

Each transmitted Bunraku frame is one OSC message with the address:

    /bunraku/vmc/frame

It contains the protocol version, avatar name, source identifier, frame number,
timestamp, and 21 ordered bone transforms. The resulting message is normally
about 800 bytes and is intended to remain below the 1200-byte OSCGroups packet
limit.

The encoder ignores VMC packets that contain no skeletal information. It
accumulates skeletal updates received over multiple packets and transmits only
after all 21 required bones have been collected. This prevents incomplete
skeletal frames from being sent.

Every completed frame is sent to two destinations by default:

    local Bmc:        127.0.0.1:57130
    OscGroupClient:   127.0.0.1:22244

This gives the local SuperCollider process its own copy because OSCGroups sends
traffic to other group members but does not echo it to the originating client.


BASIC MULTIUSER COMMAND
-----------------------

The standard command uses all default ports and enables both outputs:

    python3 BunrakuOSCEncoder.py \
      --avatar "BunrakuTestAvatar" \
      --source "xr-animator" \
      --verbose

Configure XR Animator to send VMC to:

    127.0.0.1:39537

Bmc listens locally on port 57130 and OscGroupClient listens locally on port
22244. For a single-user session without OscGroupClient, add --no-oscgroups.


COMMAND-LINE OPTIONS
--------------------

-h, --help
    Display the command summary and exit.

--listen-ip ADDRESS
    Local network address on which the encoder receives VMC packets.

    Default: 127.0.0.1

    Use 127.0.0.1 when XR Animator runs on the same computer. Use 0.0.0.0 only
    when packets must be accepted from another computer and the firewall is
    configured appropriately.

--listen-port PORT
    UDP port on which the encoder receives VMC packets.

    Default: 39537

--bmc-ip ADDRESS
    Destination address of local Bmc. Default: 127.0.0.1.

--bmc-port PORT
    Destination port of local Bmc. Default: 57130.

--oscgroups-ip ADDRESS
    Destination address of the local OscGroupClient. Default: 127.0.0.1.

--oscgroups-port PORT
    Destination port of the local OscGroupClient. Default: 22244. This must
    equal the client's localtxport argument.

--no-bmc
    Disable the direct local Bmc copy.

--no-oscgroups
    Disable the OSCGroups copy. Use this for the canonical single-user setup.

    At least one of the two outputs must remain enabled. The former encoder
    options --target-ip and --target-port remain compatibility aliases for
    --oscgroups-ip and --oscgroups-port. New commands should use the explicit
    names.

--avatar NAME
    Avatar identity included in every Bunraku frame.

    Default: XRAnimator

    The name cannot be empty. The decoder can use this value to select one
    avatar with its --accept-avatar option.

--source IDENTIFIER
    Stable identifier for this encoder or capture source.

    Default: a random 16-character identifier created when the encoder starts

    Specify this option when recordings, diagnostics, or several simultaneous
    performers must reliably identify the sender. Examples are xr-animator,
    stage-left, performer-a, or macbook-camera.

--max-packet-size BYTES
    Maximum allowed size of an encoded Bunraku OSC message.

    Default: 1200
    Valid range: 256 to 65507

    Frames larger than this value are rejected rather than fragmented. Keep the
    default for OSCGroups and normal Internet transport unless the network has a
    specifically tested requirement for another value.

--stats-interval SECONDS
    Interval between status reports.

    Default: 5.0

    Use 0 to disable periodic reports. Negative values are invalid.

--verbose
    Print individual warnings for malformed packets, output failures, or frames
    rejected because of the maximum packet size. Periodic summary counters are
    printed independently according to --stats-interval.

--log-partial
    When used together with --verbose, list the bones still awaited while the
    encoder accumulates a complete skeleton from multiple incoming packets.

    This is a troubleshooting option. It can produce substantial terminal
    output and should normally remain disabled.


STATUS COUNTERS
---------------

received
    Total UDP packets received from XR Animator. These may include skeletal,
    facial, status, timing, and other VMC packets.

sent
    Complete Bunraku skeletal frames delivered to at least one enabled output.

bmc_sent
    Frame copies sent to the Bmc destination.

oscgroups_sent
    Frame copies sent to the OscGroupClient destination.

dropped
    Packets or completed frames rejected because of malformed OSC, socket
    errors, or the configured maximum packet size. This should remain zero.

non_skeleton
    Valid incoming VMC packets containing no bone transforms. A rising value is
    normal because XR Animator also sends facial, timing, and status messages.

A healthy run resembles:

    received=3000, sent=900, bmc_sent=900, oscgroups_sent=900, dropped=0,
    non_skeleton=1200

The counts do not have to be equal. The important conditions are that sent
continues to rise while the performer moves and dropped remains zero.


REQUIRED BONE ORDER
-------------------

The Bunraku Frame version-1 skeleton contains:

    Hips, Spine, Chest, Neck, Head,
    LeftShoulder, LeftUpperArm, LeftLowerArm, LeftHand,
    RightShoulder, RightUpperArm, RightLowerArm, RightHand,
    LeftUpperLeg, LeftLowerLeg, LeftFoot, LeftToes,
    RightUpperLeg, RightLowerLeg, RightFoot, RightToes

UpperChest may be used as the input source for Chest. LeftFoot and RightFoot may
also provide fallback transforms for missing toe bones.


CURRENT PARTIAL-TRACKING POLICY
-------------------------------

The current implementation uses a strict complete-update policy. Bone updates
are accumulated across packets, but a frame is sent only after all required
bones have received new values. This provides the strongest frame-coherence
guarantee.

A proposed future hold-last policy would start from a neutral/reference pose,
replace only the bones supplied by XR Animator, and retain previous values for
all other bones. That policy and possible options such as --frame-policy and
--neutral-pose are not implemented in the current script and must not yet be
used on the command line.


STOPPING THE ENCODER
--------------------

Press Control-C. The encoder prints its final counters and closes its UDP
sockets.
