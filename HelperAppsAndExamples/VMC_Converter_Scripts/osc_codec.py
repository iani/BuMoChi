"""Small, dependency-free OSC codec used by the BuMoChi VMC converters.

The implementation intentionally covers the OSC types used by VMC and the
BuMoChi envelope. It is not intended to replace a general OSC library.
"""

from __future__ import annotations

import math
import struct
from dataclasses import dataclass
from typing import Any, Iterable


class OscError(ValueError):
    """Raised when an OSC packet is malformed or unsupported."""


@dataclass(frozen=True)
class OscMessage:
    address: str
    type_tags: str
    arguments: tuple[Any, ...]


@dataclass(frozen=True)
class OscBundle:
    timetag: int
    elements: tuple[OscMessage | "OscBundle", ...]


def _pad4(length: int) -> int:
    return (-length) % 4


def _encode_string(value: str) -> bytes:
    raw = value.encode("utf-8") + b"\0"
    return raw + (b"\0" * _pad4(len(raw)))


def _read_string(data: bytes, offset: int) -> tuple[str, int]:
    end = data.find(b"\0", offset)
    if end < 0:
        raise OscError("unterminated OSC string")
    try:
        value = data[offset:end].decode("utf-8")
    except UnicodeDecodeError as exc:
        raise OscError("invalid UTF-8 in OSC string") from exc
    next_offset = end + 1
    next_offset += _pad4(next_offset - offset)
    if next_offset > len(data):
        raise OscError("truncated OSC string padding")
    return value, next_offset


def _take(data: bytes, offset: int, size: int) -> tuple[bytes, int]:
    end = offset + size
    if end > len(data):
        raise OscError("truncated OSC argument")
    return data[offset:end], end


def decode_message(data: bytes) -> OscMessage:
    address, offset = _read_string(data, 0)
    if not address.startswith("/"):
        raise OscError(f"invalid OSC address: {address!r}")
    tag_string, offset = _read_string(data, offset)
    if not tag_string.startswith(","):
        raise OscError("OSC type tag string must begin with ','")

    values: list[Any] = []
    for tag in tag_string[1:]:
        if tag == "i":
            raw, offset = _take(data, offset, 4)
            values.append(struct.unpack(">i", raw)[0])
        elif tag == "f":
            raw, offset = _take(data, offset, 4)
            values.append(struct.unpack(">f", raw)[0])
        elif tag == "s":
            value, offset = _read_string(data, offset)
            values.append(value)
        elif tag == "b":
            raw, offset = _take(data, offset, 4)
            size = struct.unpack(">i", raw)[0]
            if size < 0:
                raise OscError("negative OSC blob size")
            value, offset = _take(data, offset, size)
            offset += _pad4(size)
            if offset > len(data):
                raise OscError("truncated OSC blob padding")
            values.append(value)
        elif tag == "h":
            raw, offset = _take(data, offset, 8)
            values.append(struct.unpack(">q", raw)[0])
        elif tag == "d":
            raw, offset = _take(data, offset, 8)
            values.append(struct.unpack(">d", raw)[0])
        elif tag == "T":
            values.append(True)
        elif tag == "F":
            values.append(False)
        elif tag == "N":
            values.append(None)
        elif tag == "I":
            values.append(math.inf)
        else:
            raise OscError(f"unsupported OSC type tag {tag!r}")

    return OscMessage(address, tag_string[1:], tuple(values))


def encode_message(message: OscMessage) -> bytes:
    if not message.address.startswith("/"):
        raise OscError(f"invalid OSC address: {message.address!r}")
    if len(message.type_tags) != len(message.arguments):
        raise OscError("type tag and argument counts differ")

    payload = bytearray(_encode_string(message.address))
    payload.extend(_encode_string("," + message.type_tags))
    for tag, value in zip(message.type_tags, message.arguments):
        if tag == "i":
            payload.extend(struct.pack(">i", int(value)))
        elif tag == "f":
            payload.extend(struct.pack(">f", float(value)))
        elif tag == "s":
            payload.extend(_encode_string(str(value)))
        elif tag == "b":
            raw = bytes(value)
            payload.extend(struct.pack(">i", len(raw)))
            payload.extend(raw)
            payload.extend(b"\0" * _pad4(len(raw)))
        elif tag == "h":
            payload.extend(struct.pack(">q", int(value)))
        elif tag == "d":
            payload.extend(struct.pack(">d", float(value)))
        elif tag in "TFNI":
            pass
        else:
            raise OscError(f"unsupported OSC type tag {tag!r}")
    return bytes(payload)


def decode_packet(data: bytes) -> OscMessage | OscBundle:
    if data.startswith(b"#bundle\0"):
        if len(data) < 16:
            raise OscError("truncated OSC bundle")
        timetag = struct.unpack(">Q", data[8:16])[0]
        offset = 16
        elements: list[OscMessage | OscBundle] = []
        while offset < len(data):
            raw_size, offset = _take(data, offset, 4)
            size = struct.unpack(">i", raw_size)[0]
            if size <= 0:
                raise OscError("invalid OSC bundle element size")
            element, offset = _take(data, offset, size)
            elements.append(decode_packet(element))
        return OscBundle(timetag, tuple(elements))
    return decode_message(data)


def encode_packet(packet: OscMessage | OscBundle) -> bytes:
    if isinstance(packet, OscMessage):
        return encode_message(packet)
    payload = bytearray(b"#bundle\0")
    payload.extend(struct.pack(">Q", packet.timetag))
    for element in packet.elements:
        encoded = encode_packet(element)
        payload.extend(struct.pack(">i", len(encoded)))
        payload.extend(encoded)
    return bytes(payload)


def flatten_messages(packet: OscMessage | OscBundle) -> tuple[OscMessage, ...]:
    if isinstance(packet, OscMessage):
        return (packet,)
    messages: list[OscMessage] = []
    for element in packet.elements:
        messages.extend(flatten_messages(element))
    return tuple(messages)


def make_bundle(messages: Iterable[OscMessage], timetag: int = 1) -> OscBundle:
    return OscBundle(timetag, tuple(messages))
