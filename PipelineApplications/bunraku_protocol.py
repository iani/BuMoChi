#!/usr/bin/env python3
"""Shared legacy and extended Bunraku Frame protocol primitives."""

from __future__ import annotations

import struct
from dataclasses import dataclass
from typing import Dict, Iterator, List, Sequence, Tuple

BUNRAKU_ADDRESS = "/bunraku/vmc/frame"
BUNRAKU_VERSION = 1
BUNRAKU_ROUTED_VERSION = 2
BUNRAKU_EXTENDED_VERSION = 3
BUNRAKU_EXTENDED_ROUTED_VERSION = 4
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
EXPECTED_TAGS_V1 = ",issif" + ("f" * VALUE_COUNT)
EXPECTED_TAGS_V2 = ",iissif" + ("f" * VALUE_COUNT)
# Retained for clients that import the version-1 signature.
EXPECTED_TAGS = EXPECTED_TAGS_V1


class ProtocolError(ValueError):
    pass


@dataclass(frozen=True)
class BunrakuFrame:
    avatar: str
    source: str
    frame_id: int
    timestamp: float
    transforms: Tuple[Tuple[float, ...], ...]
    target_port: int | None = None
    extra_transforms: Tuple[Tuple[str, Tuple[float, ...]], ...] = ()
    blends: Tuple[Tuple[str, float], ...] = ()


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


def extract_vmc_blends(packet: bytes) -> Dict[str, float]:
    result: Dict[str, float] = {}
    for message in osc_messages(packet):
        address, offset = read_string(message, 0)
        if address != "/VMC/Ext/Blend/Val":
            continue
        tags, offset = read_string(message, offset)
        if tags != ",sf":
            raise ProtocolError(f"unexpected blend type tags {tags!r}")
        name, offset = read_string(message, offset)
        if offset + 4 > len(message):
            raise ProtocolError("truncated blend value")
        result[name] = struct.unpack_from(">f", message, offset)[0]
    return result


def build_frame(frame: BunrakuFrame) -> bytes:
    if len(frame.transforms) != len(BONES) or any(len(item) != 7 for item in frame.transforms):
        raise ProtocolError("wrong number of Bunraku bone transforms")
    values = tuple(value for transform in frame.transforms for value in transform)
    extended = bool(frame.extra_transforms or frame.blends)
    if frame.target_port is None and not extended:
        header = (
            osc_string(BUNRAKU_ADDRESS), osc_string(EXPECTED_TAGS_V1),
            struct.pack(">i", BUNRAKU_VERSION), osc_string(frame.avatar),
        )
    elif frame.target_port is not None and not extended:
        if not 1 <= frame.target_port <= 65535:
            raise ProtocolError(f"invalid routed target port {frame.target_port}")
        header = (
            osc_string(BUNRAKU_ADDRESS), osc_string(EXPECTED_TAGS_V2),
            struct.pack(">ii", BUNRAKU_ROUTED_VERSION, frame.target_port),
            osc_string(frame.avatar),
        )
    else:
        version = (
            BUNRAKU_EXTENDED_VERSION if frame.target_port is None
            else BUNRAKU_EXTENDED_ROUTED_VERSION
        )
        if frame.target_port is not None and not 1 <= frame.target_port <= 65535:
            raise ProtocolError(f"invalid routed target port {frame.target_port}")
        for name, transform in frame.extra_transforms:
            if not name or len(transform) != 7:
                raise ProtocolError("invalid extended bone transform")
        for name, _value in frame.blends:
            if not name:
                raise ProtocolError("invalid facial blend name")
        tags = ",i" + ("i" if frame.target_port is not None else "") + "ssif"
        tags += "f" * VALUE_COUNT
        tags += "i" + "sfffffff" * len(frame.extra_transforms)
        tags += "i" + "sf" * len(frame.blends)
        header_items = [osc_string(BUNRAKU_ADDRESS), osc_string(tags), struct.pack(">i", version)]
        if frame.target_port is not None:
            header_items.append(struct.pack(">i", frame.target_port))
        header_items.extend((osc_string(frame.avatar), osc_string(frame.source)))
        header = tuple(header_items)
    packet = b"".join(header + (
        osc_string(frame.source), struct.pack(">if", frame.frame_id, frame.timestamp),
        struct.pack(f">{len(values)}f", *values),
    ))
    if extended:
        # The extended header already contains source; avoid duplicating it.
        packet = b"".join(header + (
            struct.pack(">if", frame.frame_id, frame.timestamp),
            struct.pack(f">{len(values)}f", *values),
            struct.pack(">i", len(frame.extra_transforms)),
            b"".join(
                osc_string(name) + struct.pack(">7f", *transform)
                for name, transform in frame.extra_transforms
            ),
            struct.pack(">i", len(frame.blends)),
            b"".join(
                osc_string(name) + struct.pack(">f", value)
                for name, value in frame.blends
            ),
        ))
    return packet


def frame_from_vmc(packet: bytes, avatar: str, source: str, frame_id: int, timestamp: float) -> BunrakuFrame:
    source_bones = extract_vmc_bones(packet)
    source_blends = extract_vmc_blends(packet)
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
    canonical_inputs = {alias for _canonical, aliases in BONES for alias in aliases}
    extras = tuple(
        (name, transform) for name, transform in source_bones.items()
        if name not in canonical_inputs
    )
    return BunrakuFrame(
        avatar, source, frame_id, timestamp, tuple(transforms), None,
        extras, tuple(source_blends.items()),
    )


def parse_frame(packet: bytes) -> BunrakuFrame:
    address, offset = read_string(packet, 0)
    tags, offset = read_string(packet, offset)
    if address != BUNRAKU_ADDRESS or not tags.startswith(",i"):
        raise ProtocolError(
            "not a supported Bunraku Frame message "
            f"(address={address!r}, tags={tags!r})"
        )
    if offset + 4 > len(packet):
        raise ProtocolError("truncated version")
    version = struct.unpack_from(">i", packet, offset)[0]
    offset += 4
    if version not in (
        BUNRAKU_VERSION, BUNRAKU_ROUTED_VERSION,
        BUNRAKU_EXTENDED_VERSION, BUNRAKU_EXTENDED_ROUTED_VERSION,
    ):
        raise ProtocolError(f"unsupported Bunraku Frame version {version}")
    if version == BUNRAKU_VERSION and tags != EXPECTED_TAGS_V1:
        raise ProtocolError("protocol-version-1 frame has the wrong OSC signature")
    if version == BUNRAKU_ROUTED_VERSION and tags != EXPECTED_TAGS_V2:
        raise ProtocolError("protocol-version-2 frame has the wrong OSC signature")
    target_port = None
    if version in (BUNRAKU_ROUTED_VERSION, BUNRAKU_EXTENDED_ROUTED_VERSION):
        if offset + 4 > len(packet):
            raise ProtocolError("truncated routed target port")
        target_port = struct.unpack_from(">i", packet, offset)[0]
        offset += 4
        if not 1 <= target_port <= 65535:
            raise ProtocolError(f"invalid routed target port {target_port}")
    avatar, offset = read_string(packet, offset)
    source, offset = read_string(packet, offset)
    minimum_end = offset + 8 + VALUE_COUNT * 4
    if minimum_end > len(packet):
        raise ProtocolError("invalid Bunraku Frame payload length")
    frame_id, timestamp = struct.unpack_from(">if", packet, offset)
    offset += 8
    values = struct.unpack_from(f">{VALUE_COUNT}f", packet, offset)
    transforms = tuple(tuple(values[i:i + 7]) for i in range(0, VALUE_COUNT, 7))
    offset += VALUE_COUNT * 4
    extras: List[Tuple[str, Tuple[float, ...]]] = []
    blends: List[Tuple[str, float]] = []
    if version in (BUNRAKU_VERSION, BUNRAKU_ROUTED_VERSION):
        if offset != len(packet):
            raise ProtocolError("invalid legacy Bunraku Frame payload length")
    else:
        if offset + 4 > len(packet):
            raise ProtocolError("truncated extended-bone count")
        extra_count = struct.unpack_from(">i", packet, offset)[0]
        offset += 4
        if extra_count < 0:
            raise ProtocolError("negative extended-bone count")
        for _ in range(extra_count):
            name, offset = read_string(packet, offset)
            if offset + 28 > len(packet):
                raise ProtocolError("truncated extended bone transform")
            extras.append((name, struct.unpack_from(">7f", packet, offset)))
            offset += 28
        if offset + 4 > len(packet):
            raise ProtocolError("truncated facial-blend count")
        blend_count = struct.unpack_from(">i", packet, offset)[0]
        offset += 4
        if blend_count < 0:
            raise ProtocolError("negative facial-blend count")
        for _ in range(blend_count):
            name, offset = read_string(packet, offset)
            if offset + 4 > len(packet):
                raise ProtocolError("truncated facial blend value")
            blends.append((name, struct.unpack_from(">f", packet, offset)[0]))
            offset += 4
        if offset != len(packet):
            raise ProtocolError("trailing data in extended Bunraku Frame")
        expected_tags = ",i" + ("i" if target_port is not None else "") + "ssif"
        expected_tags += "f" * VALUE_COUNT
        expected_tags += "i" + "sfffffff" * len(extras)
        expected_tags += "i" + "sf" * len(blends)
        if tags != expected_tags:
            raise ProtocolError("extended Bunraku Frame has the wrong OSC signature")
    return BunrakuFrame(
        avatar, source, frame_id, timestamp, transforms, target_port,
        tuple(extras), tuple(blends),
    )


def _vmc_bone_message(name: str, transform: Sequence[float]) -> bytes:
    return b"".join((osc_string("/VMC/Ext/Bone/Pos"), osc_string(",sfffffff"),
                     osc_string(name), struct.pack(">7f", *transform)))


def _vmc_blend_message(name: str, value: float) -> bytes:
    return b"".join((osc_string("/VMC/Ext/Blend/Val"), osc_string(",sf"),
                     osc_string(name), struct.pack(">f", value)))


def vmc_bundle_from_frame(frame: BunrakuFrame, avatar_override: str | None = None) -> bytes:
    avatar = avatar_override or frame.avatar
    metadata = b"".join((osc_string(AVATAR_ADDRESS), osc_string(",ssi"),
                         osc_string(avatar), osc_string(frame.source),
                         struct.pack(">i", frame.frame_id)))
    messages = [metadata] + [
        _vmc_bone_message(name, transform)
        for name, transform in zip(BONE_NAMES, frame.transforms)
    ]
    messages.extend(
        _vmc_bone_message(name, transform)
        for name, transform in frame.extra_transforms
    )
    messages.extend(_vmc_blend_message(name, value) for name, value in frame.blends)
    if frame.blends:
        messages.append(osc_string("/VMC/Ext/Blend/Apply") + osc_string(","))
    return OSC_BUNDLE_PREFIX + OSC_IMMEDIATE + b"".join(
        struct.pack(">I", len(message)) + message for message in messages
    )
