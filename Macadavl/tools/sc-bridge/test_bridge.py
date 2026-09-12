"""JSON text (from the browser) → OSC datagram (to sclang) conversion."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator

import pytest
from pythonosc.osc_message import OscMessage

from bridge import BridgeError, encode, forward, parse_args, parse_message


class FakeUdp:
    def __init__(self) -> None:
        self.sent: list[bytes] = []

    def send(self, data: bytes) -> None:
        self.sent.append(data)


class FakeWebSocket:
    def __init__(self, messages: list[str | bytes]) -> None:
        self.messages = messages
        self.remote_address = ("127.0.0.1", 40000)

    def __aiter__(self) -> AsyncIterator[str | bytes]:
        return self._iterate()

    async def _iterate(self) -> AsyncIterator[str | bytes]:
        for message in self.messages:
            yield message


def test_should_encode_seven_params_as_floats_in_order() -> None:
    # GIVEN
    raw = json.dumps({"address": "/dance/A/params", "args": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]})
    # WHEN
    dgram = encode(raw)
    # THEN
    decoded = OscMessage(dgram)
    assert decoded.address == "/dance/A/params"
    assert b",fffffff\x00" in dgram
    assert [round(p, 6) for p in decoded.params] == [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]


def test_should_encode_an_event_as_string_and_float() -> None:
    # GIVEN
    raw = json.dumps({"address": "/dance/B/event", "args": ["hit", 1]})
    # WHEN
    dgram = encode(raw)
    # THEN
    decoded = OscMessage(dgram)
    assert decoded.address == "/dance/B/event"
    assert b",sf\x00" in dgram
    assert decoded.params == ["hit", 1.0]


def test_should_encode_stop_without_arguments() -> None:
    # GIVEN
    raw = json.dumps({"address": "/dance/A/stop", "args": []})
    # WHEN
    decoded = OscMessage(encode(raw))
    # THEN
    assert decoded.address == "/dance/A/stop"
    assert decoded.params == []


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        json.dumps([1, 2, 3]),
        json.dumps({"args": [1]}),
        json.dumps({"address": "no-leading-slash", "args": []}),
        json.dumps({"address": "/dance/A/params", "args": "0.5"}),
        json.dumps({"address": "/dance/A/params", "args": [True]}),
        json.dumps({"address": "/dance/A/params", "args": [None]}),
        json.dumps({"address": "/dance/A/params", "args": [{"a": 1}]}),
    ],
)
def test_should_reject_malformed_messages(raw: str) -> None:
    # WHEN / THEN
    with pytest.raises(BridgeError):
        parse_message(raw)


def test_should_keep_strings_and_coerce_every_number_to_float() -> None:
    # WHEN
    args = parse_args(["sweep", 0, 1, 0.25])
    # THEN
    assert args == ["sweep", 0.0, 1.0, 0.25]
    assert all(isinstance(a, float) for a in args[1:])


def test_should_forward_every_valid_message_and_skip_bad_ones() -> None:
    # GIVEN
    udp = FakeUdp()
    socket = FakeWebSocket(
        [
            json.dumps({"address": "/dance/A/params", "args": [0.0] * 7}),
            "garbage",
            b"\x00binary",
            json.dumps({"address": "/dance/A/event", "args": ["hit", 0.9]}),
            json.dumps({"address": "/dance/A/stop", "args": []}),
        ]
    )
    log: list[str] = []
    # WHEN
    stats = asyncio.run(forward(socket, udp, log.append))
    # THEN
    assert [OscMessage(d).address for d in udp.sent] == [
        "/dance/A/params",
        "/dance/A/event",
        "/dance/A/stop",
    ]
    assert (stats.forwarded, stats.dropped) == (3, 2)
    assert len(log) == 2
    assert "127.0.0.1" in log[0]
    assert "3 forwarded" in log[1] and "2 dropped" in log[1]
