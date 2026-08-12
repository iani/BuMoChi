#!/usr/bin/env python3
"""Receive XR Animator VMC packets and emit one identified OSC message each."""

from __future__ import annotations

import argparse
import socket
import sys

from osc_codec import OscError, decode_packet, encode_message
from vmc_envelope import wrap_vmc_packet

MAX_UDP_PAYLOAD = 65_507


def endpoint(value: str) -> tuple[str, int]:
    try:
        host, port = value.rsplit(":", 1)
        return host, int(port)
    except (ValueError, TypeError) as exc:
        raise argparse.ArgumentTypeError("endpoint must be HOST:PORT") from exc


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--listen", type=endpoint, default=("0.0.0.0", 39539))
    result.add_argument("--source", default="performer-1", help="stable performer/source name")
    result.add_argument(
        "--send",
        type=endpoint,
        action="append",
        default=None,
        metavar="HOST:PORT",
        help="destination; repeat for fan-out (default: 127.0.0.1:57120)",
    )
    result.add_argument("--buffer-size", type=int, default=65_535)
    result.add_argument("--verbose", action="store_true")
    return result


def run(args: argparse.Namespace) -> None:
    destinations = args.send or [("127.0.0.1", 57120)]
    receiver = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    receiver.bind(args.listen)
    sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    frame = 0
    print(f"VMC input {args.listen[0]}:{args.listen[1]} -> {destinations}", flush=True)

    while True:
        data, origin = receiver.recvfrom(args.buffer_size)
        try:
            packet = decode_packet(data)
            encoded = encode_message(wrap_vmc_packet(packet, args.source, frame))
            if len(encoded) > MAX_UDP_PAYLOAD:
                raise OscError(
                    f"canonical packet is {len(encoded)} bytes; UDP maximum is {MAX_UDP_PAYLOAD}"
                )
            for destination in destinations:
                sender.sendto(encoded, destination)
            if args.verbose:
                print(f"frame={frame} in={len(data)} out={len(encoded)} from={origin}")
            frame = (frame + 1) & 0x7FFF_FFFF
        except (OscError, OSError) as exc:
            print(f"dropped packet from {origin}: {exc}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    try:
        run(parser().parse_args())
    except KeyboardInterrupt:
        pass
