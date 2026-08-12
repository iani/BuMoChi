"""Canonical one-message envelope for reversible VMC transport."""

from __future__ import annotations

import time

from osc_codec import OscBundle, OscError, OscMessage, flatten_messages

ADDRESS = "/BuMoChi/VMC/Packet"
VERSION = 1


def wrap_vmc_packet(packet: OscMessage | OscBundle, source: str, frame: int) -> OscMessage:
    messages = flatten_messages(packet)
    now = time.time()
    seconds = int(now)
    microseconds = int((now - seconds) * 1_000_000)
    kind = "bundle" if isinstance(packet, OscBundle) else "message"
    timetag = packet.timetag if isinstance(packet, OscBundle) else 1

    tags = ["i", "s", "i", "i", "i", "s", "s", "i"]
    arguments: list[object] = [
        VERSION,
        source,
        frame,
        seconds,
        microseconds,
        kind,
        f"{timetag:016x}",
        len(messages),
    ]
    for message in messages:
        tags.extend(("s", "s", "i"))
        arguments.extend((message.address, message.type_tags, len(message.arguments)))
        tags.extend(message.type_tags)
        arguments.extend(message.arguments)
    return OscMessage(ADDRESS, "".join(tags), tuple(arguments))


def unwrap_vmc_packet(envelope: OscMessage) -> OscMessage | OscBundle:
    if envelope.address != ADDRESS:
        raise OscError(f"expected {ADDRESS}, received {envelope.address}")
    args = envelope.arguments
    if len(args) < 8:
        raise OscError("truncated BuMoChi VMC envelope")
    version, _source, _frame, _seconds, _usec, kind, timetag_hex, count = args[:8]
    if version != VERSION:
        raise OscError(f"unsupported BuMoChi envelope version {version}")

    cursor = 8
    messages: list[OscMessage] = []
    for _ in range(int(count)):
        if cursor + 3 > len(args):
            raise OscError("truncated message header in BuMoChi envelope")
        address, tags, argument_count = args[cursor : cursor + 3]
        cursor += 3
        argument_count = int(argument_count)
        values = args[cursor : cursor + argument_count]
        if len(values) != argument_count or len(tags) != argument_count:
            raise OscError("invalid typed argument count in BuMoChi envelope")
        cursor += argument_count
        messages.append(OscMessage(str(address), str(tags), tuple(values)))
    if cursor != len(args):
        raise OscError("unexpected trailing arguments in BuMoChi envelope")

    if kind == "message":
        if len(messages) != 1:
            raise OscError("message envelope must contain exactly one OSC message")
        return messages[0]
    if kind != "bundle":
        raise OscError(f"unknown original packet kind {kind!r}")
    try:
        timetag = int(str(timetag_hex), 16)
    except ValueError as exc:
        raise OscError("invalid OSC bundle timetag") from exc
    return OscBundle(timetag, tuple(messages))
