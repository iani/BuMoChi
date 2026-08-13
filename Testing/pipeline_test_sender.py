#!/usr/bin/env python3
"""Send deterministic moving test poses as VMC bundles or Bunraku OSC frames."""

from __future__ import annotations

import argparse
import math
import socket
import time

from bunraku_protocol import BONE_NAMES, BunrakuFrame, build_frame, vmc_bundle_from_frame


def test_frame(index: int, avatar: str, source: str, rate: float) -> BunrakuFrame:
    """Build a valid pose whose hips and arms move visibly over time."""
    phase = index / rate
    transforms = []
    for bone_index, name in enumerate(BONE_NAMES):
        x = y = z = 0.0
        qx = qy = qz = 0.0
        qw = 1.0
        if name == "Hips":
            x = 0.15 * math.sin(phase * 2.0)
            y = 1.0
        elif name in ("LeftUpperArm", "RightUpperArm"):
            sign = 1.0 if name.startswith("Left") else -1.0
            qz = sign * 0.25 * math.sin(phase * 3.0)
            qw = math.sqrt(max(0.0, 1.0 - qz * qz))
        # A tiny stable offset makes every bone distinguishable in diagnostics.
        z += bone_index * 0.0001
        transforms.append((x, y, z, qx, qy, qz, qw))
    return BunrakuFrame(avatar, source, index, phase, tuple(transforms))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--format", choices=("vmc", "bunraku"), required=True)
    parser.add_argument("--target-ip", default="127.0.0.1")
    parser.add_argument("--target-port", type=int, required=True)
    parser.add_argument("--avatar", default="BunrakuTestAvatar")
    parser.add_argument("--source", default="pipeline-test")
    parser.add_argument("--frames", type=int, default=150)
    parser.add_argument("--rate", type=float, default=30.0)
    args = parser.parse_args()
    if not 1 <= args.target_port <= 65535:
        parser.error("invalid target port")
    if args.frames < 1 or args.rate <= 0:
        parser.error("--frames and --rate must be positive")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    started = time.monotonic()
    try:
        for index in range(args.frames):
            frame = test_frame(index, args.avatar, args.source, args.rate)
            packet = build_frame(frame) if args.format == "bunraku" else vmc_bundle_from_frame(frame)
            sock.sendto(packet, (args.target_ip, args.target_port))
            deadline = started + ((index + 1) / args.rate)
            time.sleep(max(0.0, deadline - time.monotonic()))
    finally:
        sock.close()
    print(f"sent={args.frames}, format={args.format}, target={args.target_ip}:{args.target_port}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
