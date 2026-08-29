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
    bmc_sent: int = 0
    oscgroups_sent: int = 0
    dropped: int = 0
    non_skeleton: int = 0

def status(stats: Stats) -> str:
    return (
        f"received={stats.received}, sent={stats.sent}, "
        f"bmc_sent={stats.bmc_sent}, oscgroups_sent={stats.oscgroups_sent}, "
        f"dropped={stats.dropped}, "
        f"non_skeleton={stats.non_skeleton}"
    )


def destinations(args: argparse.Namespace) -> tuple[tuple[str, str, int], ...]:
    """Return the enabled route-free source-frame destinations."""
    result = []
    endpoints = set()
    if not args.no_bmc:
        result.append(("Bmc", args.bmc_ip, args.bmc_port))
        endpoints.add((args.bmc_ip, args.bmc_port))
    if not args.no_oscgroups and (args.oscgroups_ip, args.oscgroups_port) not in endpoints:
        result.append(("OSCGroups", args.oscgroups_ip, args.oscgroups_port))
    return tuple(result)


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
    outputs = destinations(args)
    try:
        receive.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
        receive.bind((args.listen_ip, args.listen_port)); receive.settimeout(0.5)
    except OSError as exc:
        receive.close(); send.close()
        print(f"ERROR: cannot listen on {args.listen_ip}:{args.listen_port}: {exc}", file=sys.stderr); return 1
    print("VMC -> Bunraku Frame adapter")
    print(f"  input={args.listen_ip}:{args.listen_port}")
    for name, host, port in outputs:
        print(f"  {name.lower()}_output={host}:{port}")
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
                    successful = 0
                    for name, host, port in outputs:
                        try:
                            send.sendto(output, (host, port))
                            successful += 1
                            if name == "Bmc":
                                stats.bmc_sent += 1
                            else:
                                stats.oscgroups_sent += 1
                        except OSError as exc:
                            if args.verbose:
                                print(
                                    f"WARNING: frame {frame_id} could not be sent "
                                    f"to {name} at {host}:{port}: {exc}",
                                    file=sys.stderr,
                                )
                    if successful == 0:
                        raise OSError("frame could not be sent to any destination")
                    stats.sent += 1
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
    p.add_argument("--listen-ip", default="127.0.0.1"); p.add_argument("--listen-port", type=int, default=39537)
    p.add_argument("--bmc-ip", default="127.0.0.1", help="local Bmc destination address")
    p.add_argument("--bmc-port", type=int, default=57130, help="local Bmc destination port")
    p.add_argument("--oscgroups-ip", "--target-ip", dest="oscgroups_ip", default="127.0.0.1", help="local OscGroupClient destination address")
    p.add_argument("--oscgroups-port", "--target-port", dest="oscgroups_port", type=int, default=22244, help="local OscGroupClient transmission port")
    p.add_argument("--no-bmc", action="store_true", help="disable the local Bmc source-frame copy")
    p.add_argument("--no-oscgroups", action="store_true", help="disable the OSCGroups source-frame copy")
    p.add_argument("--avatar", default="Ishidomaru", help="avatar name included in every frame")
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
    ports = (args.listen_port, args.bmc_port, args.oscgroups_port)
    if any(not 1 <= port <= 65535 for port in ports): p.error("invalid port")
    if args.no_bmc and args.no_oscgroups: p.error("at least one output must be enabled")
    if not 256 <= args.max_packet_size <= MAX_UDP_PAYLOAD: p.error("invalid maximum packet size")
    if args.stats_interval < 0: p.error("statistics interval cannot be negative")
    return run(args)

if __name__ == "__main__": raise SystemExit(main())
