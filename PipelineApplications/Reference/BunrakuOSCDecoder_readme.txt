BunrakuOSCDecoder.py — Reference
=================================

PURPOSE
-------

BunrakuOSCDecoder.py receives complete Bunraku Frame OSC messages and
reconstructs standard Virtual Motion Capture (VMC) OSC bundles for Godot or
another VMC-compatible receiver.

The decoder supports:

* protocol version 2: the frame carries its final VMC target port;
* protocol version 1: --target-port supplies a legacy fallback destination.

One decoder can therefore dispatch independently animated figures to several
Godot VMC ports. Every accepted frame contains avatar/source metadata, a frame
number, timestamp, and 21 ordered seven-value bone transforms. The output is
one VMC OSC bundle containing /bunraku/avatar/name followed by 21
/VMC/Ext/Bone/Pos messages.


ROUTED MULTI-AVATAR COMMAND
---------------------------

For a shared decoder on 39538, Mother on Godot port 39539, and Ishidomaru on
Godot port 39540:

    BunrakuOSCDecoder \
      --listen-port 39538 \
      --allow-target-port 39539 \
      --allow-target-port 39540 \
      --verbose

SuperCollider sends every routed frame to 127.0.0.1:39538. Each protocol-v2
frame contains either 39539 or 39540. The decoder sends the reconstructed VMC
bundle to that embedded port on --target-ip, which defaults to 127.0.0.1.

Repeat --allow-target-port for every permitted destination. If no allow-list is
provided, every valid UDP port is accepted. An allow-list is recommended when
the decoder receives packets from anything other than a trusted local process.


LEGACY VERSION-1 COMMAND
------------------------

Version-1 frames have no embedded destination. Supply their fallback port:

    BunrakuOSCDecoder \
      --listen-port 39538 \
      --target-port 39539 \
      --verbose

The fallback does not override a version-2 frame: an embedded version-2 target
always wins.


COMMAND-LINE OPTIONS
--------------------

--listen-ip ADDRESS
    Address on which the decoder receives Bunraku frames. Default: 127.0.0.1.

--listen-port PORT
    Shared UDP input for Bunraku frames. Default: 39538.

--target-ip ADDRESS
    Host receiving reconstructed VMC bundles. Default: 127.0.0.1. All routed
    frames handled by one decoder invocation use this host; version 2 embeds
    the port, not the host.

--target-port PORT
    Fallback VMC destination used only when a version-1 frame has no embedded
    target. There is no default. A version-1 frame is rejected when this option
    is absent.

--allow-target-port PORT
    Permit this embedded or fallback destination. Repeat to form an allow-list.
    With no occurrences, all valid ports are permitted.

--avatar NAME
    Override avatar metadata in emitted VMC bundles. Default: preserve the
    frame's avatar name.

--accept-avatar NAME
    Convert only frames with this avatar name. Usually unnecessary for routed
    multi-avatar operation, but retained for filtering and legacy workflows.

--stats-interval SECONDS
    Status-report interval. Default: 5.0. Use 0 to disable reports.

--verbose
    Print rejected-packet warnings and the route selected for each sent frame.


VALIDATION
----------

The decoder rejects:

* malformed OSC or the wrong OSC address/signature;
* unsupported protocol versions;
* incomplete 21-bone frames;
* target ports outside 1..65535;
* destinations excluded by --allow-target-port;
* version-1 frames when no --target-port fallback is configured.

The reconstructed VMC bundle may exceed 1200 bytes and is intended for the
final local connection to Godot, not retransmission through OSCGroups.


STATUS COUNTERS
---------------

received
    UDP packets received by the decoder.

sent
    Valid frames converted and sent to their selected VMC destination.

filtered
    Valid frames ignored by --accept-avatar.

rejected
    Malformed, unsupported, disallowed, unroutable, or unsendable packets.


PORT TROUBLESHOOTING ON macOS
-----------------------------

If the decoder cannot bind its input, identify the listener with:

    lsof -nP -iUDP:39538

Only one process may normally listen on a particular local UDP address/port.
Press Control-C to stop the decoder and print its final counters.
