#!/usr/bin/env python3
"""Receive BuMoChi canonical OSC messages and reconstruct VMC for Godot."""

from __future__ import annotations

import argparse
import socket
import sys

from osc_codec import OscError, OscMessage, decode_packet, encode_packet
from vmc_envelope import unwrap_vmc_packet
from vmc_to_osc import endpoint

MAX_UDP_PAYLOAD = 65_507


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--listen", type=endpoint, default=("0.0.0.0", 57121))
    result.add_argument(
        "--send",
        type=endpoint,
        action="append",
        default=None,
        metavar="HOST:PORT",
        help="Godot VMC destination; repeat for fan-out (default: 127.0.0.1:39539)",
    )
    result.add_argument("--buffer-size", type=int, default=65_535)
    result.add_argument("--verbose", action="store_true")
    return result


def run(args: argparse.Namespace) -> None:
    destinations = args.send or [("127.0.0.1", 39539)]
    receiver = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    receiver.bind(args.listen)
    sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    print(f"canonical OSC input {args.listen[0]}:{args.listen[1]} -> {destinations}", flush=True)

    while True:
        data, origin = receiver.recvfrom(args.buffer_size)
        try:
            envelope = decode_packet(data)
            if not isinstance(envelope, OscMessage):
                raise OscError("canonical input must be one OSC message, not a bundle")
            encoded = encode_packet(unwrap_vmc_packet(envelope))
            if len(encoded) > MAX_UDP_PAYLOAD:
                raise OscError(
                    f"reconstructed packet is {len(encoded)} bytes; UDP maximum is {MAX_UDP_PAYLOAD}"
                )
            for destination in destinations:
                sender.sendto(encoded, destination)
            if args.verbose:
                print(f"in={len(data)} out={len(encoded)} from={origin}")
        except (OscError, OSError) as exc:
            print(f"dropped packet from {origin}: {exc}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    try:
        run(parser().parse_args())
    except KeyboardInterrupt:
        pass
