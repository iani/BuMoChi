#!/usr/bin/env python3
"""Implementation used by BunrakuOSCEncoder.py (legacy entry point retained)."""

from __future__ import annotations
import argparse, socket, sys, time, uuid
from dataclasses import dataclass
from bunraku_protocol import (
    BONES,
    MAX_UDP_PAYLOAD,
    BunrakuFrame,
    ProtocolError,
    build_frame,
    extract_vmc_bones,
)

@dataclass
class Stats:
    received: int = 0
    sent: int = 0
    dropped: int = 0
    non_skeleton: int = 0

def status(stats: Stats) -> str:
    return (
        f"received={stats.received}, sent={stats.sent}, dropped={stats.dropped}, "
        f"non_skeleton={stats.non_skeleton}"
    )


def complete_transforms(cache: dict[str, tuple[float, ...]]):
    transforms = []
    missing = []
    for canonical, aliases in BONES:
        transform = next((cache[name] for name in aliases if name in cache), None)
        if transform is None:
            missing.append(canonical)
        else:
            transforms.append(transform)
    return tuple(transforms), missing

def run(args: argparse.Namespace) -> int:
    receive, send = socket.socket(socket.AF_INET, socket.SOCK_DGRAM), socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    stats, source = Stats(), args.source or uuid.uuid4().hex[:16]
    try:
        receive.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
        receive.bind((args.listen_ip, args.listen_port)); receive.settimeout(0.5)
    except OSError as exc:
        receive.close(); send.close()
        print(f"ERROR: cannot listen on {args.listen_ip}:{args.listen_port}: {exc}", file=sys.stderr); return 1
    print("VMC -> Bunraku Frame adapter")
    print(f"  input={args.listen_ip}:{args.listen_port} output={args.target_ip}:{args.target_port}")
    print(f"  avatar={args.avatar!r} source={source!r} maximum={args.max_packet_size} bytes")
    frame_id, started, last_status = 0, time.monotonic(), time.monotonic()
    bone_cache: dict[str, tuple[float, ...]] = {}
    updated_bones: set[str] = set()
    try:
        while True:
            try: packet, _ = receive.recvfrom(MAX_UDP_PAYLOAD)
            except socket.timeout: packet = b""
            if packet:
                stats.received += 1
                packet_bones = {}
                missing = []
                try:
                    packet_bones = extract_vmc_bones(packet)
                    if not packet_bones:
                        stats.non_skeleton += 1
                        continue
                    bone_cache.update(packet_bones)
                    updated_bones.update(packet_bones)
                    transforms, missing = complete_transforms({
                        name: bone_cache[name]
                        for name in updated_bones
                        if name in bone_cache
                    })
                    if missing:
                        if args.verbose and args.log_partial:
                            print(
                                "Waiting for remaining bones: " + ", ".join(missing),
                                file=sys.stderr,
                            )
                        continue
                    frame = BunrakuFrame(
                        args.avatar, source, frame_id,
                        time.monotonic() - started, transforms,
                    )
                    output = build_frame(frame)
                    if len(output) > args.max_packet_size:
                        raise ProtocolError(f"output is {len(output)} bytes (limit {args.max_packet_size})")
                    send.sendto(output, (args.target_ip, args.target_port)); stats.sent += 1
                    updated_bones.clear()
                except (ProtocolError, OSError) as exc:
                    stats.dropped += 1
                    if args.verbose: print(f"WARNING: frame {frame_id} dropped: {exc}", file=sys.stderr)
                if packet_bones and not missing:
                    frame_id = 0 if frame_id == 2_147_483_647 else frame_id + 1
            now = time.monotonic()
            if args.stats_interval and now - last_status >= args.stats_interval:
                print(status(stats)); last_status = now
    except KeyboardInterrupt:
        print("\n" + status(stats)); return 0
    finally:
        receive.close(); send.close()

def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--listen-ip", default="127.0.0.1"); p.add_argument("--listen-port", type=int, default=39538)
    p.add_argument("--target-ip", default="127.0.0.1"); p.add_argument("--target-port", type=int, default=22244)
    p.add_argument("--avatar", default="XRAnimator", help="avatar name included in every frame")
    p.add_argument("--source", help="stable sender ID; default is random per run")
    p.add_argument("--max-packet-size", type=int, default=1200); p.add_argument("--stats-interval", type=float, default=5.0)
    p.add_argument("--verbose", action="store_true")
    p.add_argument(
        "--log-partial", action="store_true",
        help="with --verbose, list bones still awaited while assembling a frame",
    )
    return p

def main() -> int:
    p = parser()
    args = p.parse_args()
    if not args.avatar: p.error("--avatar cannot be empty")
    if not 1 <= args.listen_port <= 65535 or not 1 <= args.target_port <= 65535: p.error("invalid port")
    if not 256 <= args.max_packet_size <= MAX_UDP_PAYLOAD: p.error("invalid maximum packet size")
    if args.stats_interval < 0: p.error("statistics interval cannot be negative")
    return run(args)

if __name__ == "__main__": raise SystemExit(main())
