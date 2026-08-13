#!/usr/bin/env python3
"""Shared Bunraku Frame protocol primitives for the two command-line adapters."""

from __future__ import annotations

import struct
from dataclasses import dataclass
from typing import Dict, Iterator, List, Sequence, Tuple

BUNRAKU_ADDRESS = "/bunraku/vmc/frame"
BUNRAKU_VERSION = 1
AVATAR_ADDRESS = "/bunraku/avatar/name"
MAX_UDP_PAYLOAD = 65_507
OSC_BUNDLE_PREFIX = b"#bundle\x00"
OSC_IMMEDIATE = b"\x00\x00\x00\x00\x00\x00\x00\x01"

# Canonical order is part of Bunraku Frame protocol version 1. The aliases are
# input fallbacks only; output always uses the canonical name.
BONES: Sequence[Tuple[str, Sequence[str]]] = (
    ("Hips", ("Hips",)), ("Spine", ("Spine",)),
    ("Chest", ("UpperChest", "Chest")), ("Neck", ("Neck",)),
    ("Head", ("Head",)), ("LeftShoulder", ("LeftShoulder",)),
    ("LeftUpperArm", ("LeftUpperArm",)),
    ("LeftLowerArm", ("LeftLowerArm",)), ("LeftHand", ("LeftHand",)),
    ("RightShoulder", ("RightShoulder",)),
    ("RightUpperArm", ("RightUpperArm",)),
    ("RightLowerArm", ("RightLowerArm",)), ("RightHand", ("RightHand",)),
    ("LeftUpperLeg", ("LeftUpperLeg",)),
    ("LeftLowerLeg", ("LeftLowerLeg",)), ("LeftFoot", ("LeftFoot",)),
    ("LeftToes", ("LeftToes", "LeftFoot")),
    ("RightUpperLeg", ("RightUpperLeg",)),
    ("RightLowerLeg", ("RightLowerLeg",)), ("RightFoot", ("RightFoot",)),
    ("RightToes", ("RightToes", "RightFoot")),
)
BONE_NAMES = tuple(item[0] for item in BONES)
VALUE_COUNT = len(BONES) * 7
EXPECTED_TAGS = ",issif" + ("f" * VALUE_COUNT)


class ProtocolError(ValueError):
    pass


@dataclass(frozen=True)
class BunrakuFrame:
    avatar: str
    source: str
    frame_id: int
    timestamp: float
    transforms: Tuple[Tuple[float, ...], ...]


def pad4(data: bytes) -> bytes:
    return data + b"\x00" * ((-len(data)) % 4)


def osc_string(value: str) -> bytes:
    return pad4(value.encode("utf-8") + b"\x00")


def read_string(packet: bytes, offset: int) -> Tuple[str, int]:
    try:
        end = packet.index(0, offset)
    except ValueError as exc:
        raise ProtocolError("unterminated OSC string") from exc
    try:
        value = packet[offset:end].decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ProtocolError("invalid UTF-8 OSC string") from exc
    return value, (end + 4) & ~3


def osc_messages(packet: bytes) -> Iterator[bytes]:
    if packet.startswith(b"/"):
        yield packet
        return
    if not packet.startswith(OSC_BUNDLE_PREFIX) or len(packet) < 16:
        raise ProtocolError("input is neither an OSC message nor a valid bundle")
    offset = 16
    while offset < len(packet):
        if offset + 4 > len(packet):
            raise ProtocolError("truncated bundle element size")
        size = struct.unpack_from(">I", packet, offset)[0]
        offset += 4
        if size == 0 or offset + size > len(packet):
            raise ProtocolError("invalid bundle element size")
        yield from osc_messages(packet[offset : offset + size])
        offset += size


def extract_vmc_bones(packet: bytes) -> Dict[str, Tuple[float, ...]]:
    result: Dict[str, Tuple[float, ...]] = {}
    for message in osc_messages(packet):
        address, offset = read_string(message, 0)
        if address != "/VMC/Ext/Bone/Pos":
            continue
        tags, offset = read_string(message, offset)
        if tags != ",sfffffff":
            raise ProtocolError(f"unexpected bone type tags {tags!r}")
        name, offset = read_string(message, offset)
        if offset + 28 > len(message):
            raise ProtocolError("truncated bone transform")
        result[name] = struct.unpack_from(">7f", message, offset)
    return result


def build_frame(frame: BunrakuFrame) -> bytes:
    if len(frame.transforms) != len(BONES) or any(len(item) != 7 for item in frame.transforms):
        raise ProtocolError("wrong number of Bunraku bone transforms")
    values = tuple(value for transform in frame.transforms for value in transform)
    return b"".join((
        osc_string(BUNRAKU_ADDRESS), osc_string(EXPECTED_TAGS),
        struct.pack(">i", BUNRAKU_VERSION), osc_string(frame.avatar),
        osc_string(frame.source), struct.pack(">if", frame.frame_id, frame.timestamp),
        struct.pack(f">{len(values)}f", *values),
    ))


def frame_from_vmc(packet: bytes, avatar: str, source: str, frame_id: int, timestamp: float) -> BunrakuFrame:
    source_bones = extract_vmc_bones(packet)
    transforms: List[Tuple[float, ...]] = []
    missing: List[str] = []
    for canonical, aliases in BONES:
        transform = next((source_bones[name] for name in aliases if name in source_bones), None)
        if transform is None:
            missing.append(canonical)
        else:
            transforms.append(transform)
    if missing:
        raise ProtocolError("missing required bones: " + ", ".join(missing))
    return BunrakuFrame(avatar, source, frame_id, timestamp, tuple(transforms))


def parse_frame(packet: bytes) -> BunrakuFrame:
    address, offset = read_string(packet, 0)
    tags, offset = read_string(packet, offset)
    if address != BUNRAKU_ADDRESS or tags != EXPECTED_TAGS:
        raise ProtocolError(
            "not a Bunraku Frame protocol-v1 message "
            f"(address={address!r}, tags={tags!r})"
        )
    if offset + 4 > len(packet):
        raise ProtocolError("truncated version")
    version = struct.unpack_from(">i", packet, offset)[0]
    offset += 4
    if version != BUNRAKU_VERSION:
        raise ProtocolError(f"unsupported Bunraku Frame version {version}")
    avatar, offset = read_string(packet, offset)
    source, offset = read_string(packet, offset)
    if offset + 8 + VALUE_COUNT * 4 != len(packet):
        raise ProtocolError("invalid Bunraku Frame payload length")
    frame_id, timestamp = struct.unpack_from(">if", packet, offset)
    offset += 8
    values = struct.unpack_from(f">{VALUE_COUNT}f", packet, offset)
    transforms = tuple(tuple(values[i:i + 7]) for i in range(0, VALUE_COUNT, 7))
    return BunrakuFrame(avatar, source, frame_id, timestamp, transforms)


def _vmc_bone_message(name: str, transform: Sequence[float]) -> bytes:
    return b"".join((osc_string("/VMC/Ext/Bone/Pos"), osc_string(",sfffffff"),
                     osc_string(name), struct.pack(">7f", *transform)))


def vmc_bundle_from_frame(frame: BunrakuFrame, avatar_override: str | None = None) -> bytes:
    avatar = avatar_override or frame.avatar
    metadata = b"".join((osc_string(AVATAR_ADDRESS), osc_string(",ssi"),
                         osc_string(avatar), osc_string(frame.source),
                         struct.pack(">i", frame.frame_id)))
    messages = [metadata] + [
        _vmc_bone_message(name, transform)
        for name, transform in zip(BONE_NAMES, frame.transforms)
    ]
    return OSC_BUNDLE_PREFIX + OSC_IMMEDIATE + b"".join(
        struct.pack(">I", len(message)) + message for message in messages
    )
