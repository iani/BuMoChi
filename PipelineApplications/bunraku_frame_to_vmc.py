#!/usr/bin/env python3
"""Implementation used by BunrakuOSCDecoder.py (legacy entry point retained)."""

from __future__ import annotations
import argparse, socket, sys, time
from dataclasses import dataclass
from bunraku_protocol import BunrakuFrame, MAX_UDP_PAYLOAD, ProtocolError, parse_frame, vmc_bundle_from_frame

@dataclass
class Stats:
    received: int = 0
    sent: int = 0
    filtered: int = 0
    rejected: int = 0

def status(s: Stats) -> str:
    return f"received={s.received}, sent={s.sent}, filtered={s.filtered}, rejected={s.rejected}"

def destination_port(frame: BunrakuFrame, fallback_port: int | None, allowed_ports: set[int]) -> int:
    port = frame.target_port if frame.target_port is not None else fallback_port
    if port is None:
        raise ProtocolError(
            "protocol-version-1 frame has no destination; supply --target-port"
        )
    if not 1 <= port <= 65535:
        raise ProtocolError(f"invalid destination port {port}")
    if allowed_ports and port not in allowed_ports:
        raise ProtocolError(f"destination port {port} is not in the allow-list")
    return port

def run(args: argparse.Namespace) -> int:
    receive, send, stats = socket.socket(socket.AF_INET, socket.SOCK_DGRAM), socket.socket(socket.AF_INET, socket.SOCK_DGRAM), Stats()
    try:
        receive.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
        receive.bind((args.listen_ip, args.listen_port)); receive.settimeout(0.5)
    except OSError as exc:
        receive.close(); send.close()
        print(f"ERROR: cannot listen on {args.listen_ip}:{args.listen_port}: {exc}", file=sys.stderr); return 1
    print("Bunraku Frame -> VMC adapter")
    fallback = args.target_port if args.target_port is not None else "(routed frames only)"
    allowed = ",".join(str(port) for port in args.allow_target_port) or "(all valid ports)"
    print(f"  input={args.listen_ip}:{args.listen_port} target-host={args.target_ip}")
    print(f"  version-1 fallback-port={fallback} allowed-target-ports={allowed}")
    print(f"  avatar override={args.avatar or '(preserve)'} filter={args.accept_avatar or '(all)'}")
    last_status = time.monotonic()
    try:
        while True:
            try: packet, _ = receive.recvfrom(MAX_UDP_PAYLOAD)
            except socket.timeout: packet = b""
            if packet:
                stats.received += 1
                try:
                    frame = parse_frame(packet)
                    if args.accept_avatar and frame.avatar != args.accept_avatar: stats.filtered += 1
                    else:
                        port = destination_port(frame, args.target_port, set(args.allow_target_port))
                        send.sendto(vmc_bundle_from_frame(frame, args.avatar), (args.target_ip, port)); stats.sent += 1
                        if args.verbose:
                            print(
                                f"frame={frame.frame_id} avatar={frame.avatar!r} "
                                f"target={args.target_ip}:{port}"
                            )
                except (ProtocolError, OSError) as exc:
                    stats.rejected += 1
                    if args.verbose: print(f"WARNING: packet rejected: {exc}", file=sys.stderr)
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
    p.add_argument("--target-ip", default="127.0.0.1", help="VMC destination host for all routed frames")
    p.add_argument("--target-port", type=int, help="fallback VMC port for legacy protocol-version-1 frames")
    p.add_argument(
        "--allow-target-port", type=int, action="append", default=[], metavar="PORT",
        help="permit an embedded/fallback destination port; repeat for an allow-list",
    )
    p.add_argument("--avatar", help="override avatar name in emitted metadata")
    p.add_argument("--accept-avatar", help="only convert frames bearing this avatar name")
    p.add_argument("--stats-interval", type=float, default=5.0); p.add_argument("--verbose", action="store_true"); return p

def main() -> int:
    p = parser()
    args = p.parse_args()
    if not 1 <= args.listen_port <= 65535: p.error("invalid listen port")
    if args.target_port is not None and not 1 <= args.target_port <= 65535: p.error("invalid target port")
    if any(not 1 <= port <= 65535 for port in args.allow_target_port): p.error("invalid allowed target port")
    if args.stats_interval < 0: p.error("statistics interval cannot be negative")
    if args.avatar == "" or args.accept_avatar == "": p.error("avatar names cannot be empty")
    return run(args)

if __name__ == "__main__": raise SystemExit(main())
