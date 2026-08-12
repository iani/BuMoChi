# BuMoChi VMC converter scripts

These dependency-free Python scripts bridge XR Animator, SuperCollider or an
OscGroups client, and a standard VMC receiver such as the Godot XR VMC Tracker.
The protocol handled here is **VMC: Virtual Motion Capture Protocol**.

## Canonical OSC message

`vmc_to_osc.py` converts each received VMC UDP packet into one OSC message:

```text
/BuMoChi/VMC/Packet
version source frame receiveSeconds receiveMicroseconds
originalKind originalTimetagHex messageCount
address typeTags argumentCount arguments...
...
```

The repeated records retain every VMC message and its OSC argument types. A
bundle containing root, bones, expressions, and status can therefore be
reconstructed rather than reduced to a bone-only representation. SuperCollider
can inspect and change the flattened records before sending an envelope to the
reverse converter.

The envelope can be larger than the original bundle. The script reports and
drops a packet if it exceeds the maximum UDP payload. If real XR Animator data
approaches that limit, the next protocol revision should use an identified
multi-message bundle instead of IP fragmentation.

## XR Animator to SuperCollider

Configure XR Animator to send VMC to UDP port 39539, then run:

```bash
python3 vmc_to_osc.py \
  --listen 0.0.0.0:39539 \
  --source alice \
  --send 127.0.0.1:57120 \
  --verbose
```

Repeat `--send HOST:PORT` to fan out to additional local applications. To use
OscGroups, send to the local OscGroups client port rather than directly to the
remote computer.

In SuperCollider, receive the canonical message with:

```supercollider
OSCdef(\bumochiVmc, { |msg, time, addr, recvPort|
    [time, addr, recvPort, msg].postln;
}, '/BuMoChi/VMC/Packet');
```

## SuperCollider or OscGroups to Godot

Send canonical messages from SuperCollider to port 57121 and run:

```bash
python3 osc_to_vmc.py \
  --listen 0.0.0.0:57121 \
  --send 127.0.0.1:39539 \
  --verbose
```

Repeat `--send` for additional destinations. For independently animated Godot
avatars, run one reverse converter per canonical stream, or route each stream
to a distinct Godot VMC receiver port such as 39539, 39540, and 39541.

## Tests

From this directory:

```bash
python3 -m unittest -v
```
