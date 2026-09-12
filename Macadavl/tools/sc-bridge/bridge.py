"""WebSocket → OSC bridge for the Dance Stage's SuperCollider engine.

The browser cannot send UDP, so `frontend/src/audio/oscEngine.ts` sends JSON text frames
``{"address": "/dance/A/params", "args": [..7 floats..]}`` over a local WebSocket. This script
turns each frame into one OSC message and forwards it to sclang (UDP 57120 by default).

    python bridge.py [--ws-port 57130] [--osc-port 57120]

Message contract: docs/SUPERCOLLIDER.md.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import socket
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Protocol

from pythonosc.osc_message_builder import OscMessageBuilder
from websockets.asyncio.server import ServerConnection
from websockets.asyncio.server import serve as ws_serve

DEFAULT_WS_HOST = "127.0.0.1"
DEFAULT_WS_PORT = 57130
DEFAULT_OSC_HOST = "127.0.0.1"
DEFAULT_OSC_PORT = 57120

OscArg = str | float


class BridgeError(ValueError):
    """A WebSocket frame that is not a valid ``{"address", "args"}`` message."""


@dataclass(frozen=True)
class Message:
    address: str
    args: list[OscArg]


class UdpSender(Protocol):
    def send(self, data: bytes) -> None: ...


class WebSocketLike(Protocol):
    @property
    def remote_address(self) -> object: ...

    def __aiter__(self) -> AsyncIterator[str | bytes]: ...


@dataclass
class ForwardStats:
    forwarded: int = 0
    dropped: int = 0


def parse_args(raw_args: object) -> list[OscArg]:
    if not isinstance(raw_args, list):
        raise BridgeError("args must be a JSON array")
    args: list[OscArg] = []
    for raw in raw_args:
        if isinstance(raw, str):
            args.append(raw)
        elif isinstance(raw, int | float) and not isinstance(raw, bool):
            args.append(float(raw))
        else:
            raise BridgeError(f"unsupported OSC argument: {raw!r}")
    return args


def parse_message(raw: str) -> Message:
    try:
        data: object = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise BridgeError(f"not JSON: {exc.msg}") from exc
    if not isinstance(data, dict):
        raise BridgeError("message must be a JSON object")
    address = data.get("address")
    if not isinstance(address, str) or not address.startswith("/"):
        raise BridgeError("address must be a string starting with '/'")
    return Message(address=address, args=parse_args(data.get("args")))


def build_datagram(message: Message) -> bytes:
    builder = OscMessageBuilder(message.address)
    for arg in message.args:
        builder.add_arg(arg, "s" if isinstance(arg, str) else "f")
    return builder.build().dgram


def encode(raw: str) -> bytes:
    return build_datagram(parse_message(raw))


async def forward(
    websocket: WebSocketLike, udp: UdpSender, log: Callable[[str], None]
) -> ForwardStats:
    stats = ForwardStats()
    log(f"browser connected from {websocket.remote_address}")
    async for frame in websocket:
        if not isinstance(frame, str):
            stats.dropped += 1
            continue
        try:
            udp.send(encode(frame))
            stats.forwarded += 1
        except BridgeError:
            stats.dropped += 1
    log(f"browser disconnected: {stats.forwarded} forwarded, {stats.dropped} dropped")
    return stats


class UdpTarget:
    """Unconnected UDP so a not-yet-running sclang never turns into a send error."""

    def __init__(self, host: str, port: int) -> None:
        self._target = (host, port)
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    def send(self, data: bytes) -> None:
        self._socket.sendto(data, self._target)


async def serve(ws_host: str, ws_port: int, osc_host: str, osc_port: int) -> None:
    logger = logging.getLogger("sc-bridge")
    udp = UdpTarget(osc_host, osc_port)

    async def handler(connection: ServerConnection) -> None:
        await forward(connection, udp, logger.info)

    async with ws_serve(handler, ws_host, ws_port):
        logger.info(
            "listening on ws://%s:%d → osc udp://%s:%d", ws_host, ws_port, osc_host, osc_port
        )
        await asyncio.get_running_loop().create_future()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ws-port", type=int, default=DEFAULT_WS_PORT)
    parser.add_argument("--osc-port", type=int, default=DEFAULT_OSC_PORT)
    parser.add_argument("--osc-host", default=DEFAULT_OSC_HOST)
    options = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    try:
        asyncio.run(serve(DEFAULT_WS_HOST, options.ws_port, options.osc_host, options.osc_port))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
