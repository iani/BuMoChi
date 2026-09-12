"""Replay an exported Dance Stage timeline as OSC — dance once, iterate on sounds many times.

    python replay.py dance-timeline-....json [--speed 1.0] [--dancer A] [--osc-port 57120]

Reads ``entries[].control`` from the JSON the Record button downloads, waits the real
``control.t`` deltas between frames and sends the same ``/dance/<A|B>/params`` and
``/dance/<A|B>/event`` messages the browser would, straight to sclang (no bridge needed).
Ends with ``/dance/<A|B>/stop``.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path

from bridge import DEFAULT_OSC_HOST, DEFAULT_OSC_PORT, Message, UdpSender, UdpTarget, build_datagram

PARAM_ORDER = ("intensity", "brightness", "pitch", "width", "pan", "density", "space")
EVENT_KINDS = frozenset({"hit", "accent", "sweep", "freeze", "release"})


class ReplayError(ValueError):
    """The file is not a version-1 Dance Stage timeline."""


@dataclass(frozen=True)
class Control:
    t: float
    params: dict[str, float]
    events: list[tuple[str, float]]


def _number(value: object, what: str) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ReplayError(f"{what} must be a number, got {value!r}")
    return float(value)


def _parse_control(raw: object) -> Control:
    if not isinstance(raw, dict):
        raise ReplayError("entry.control must be an object")
    params_raw = raw.get("params")
    if not isinstance(params_raw, dict):
        raise ReplayError("control.params must be an object")
    params = {name: _number(params_raw.get(name), f"params.{name}") for name in PARAM_ORDER}
    events_raw = raw.get("events", [])
    if not isinstance(events_raw, list):
        raise ReplayError("control.events must be an array")
    events: list[tuple[str, float]] = []
    for event in events_raw:
        if not isinstance(event, dict):
            raise ReplayError("event must be an object")
        kind = event.get("kind")
        if not isinstance(kind, str) or kind not in EVENT_KINDS:
            raise ReplayError(f"unknown event kind {kind!r}")
        events.append((kind, _number(event.get("strength"), "event.strength")))
    return Control(t=_number(raw.get("t"), "control.t"), params=params, events=events)


def parse_timeline(data: object) -> list[Control]:
    if not isinstance(data, dict):
        raise ReplayError("timeline must be a JSON object")
    if data.get("version") != 1:
        raise ReplayError("only timeline version 1 is supported")
    entries = data.get("entries")
    if not isinstance(entries, list):
        raise ReplayError("timeline.entries must be an array")
    controls: list[Control] = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ReplayError("entry must be an object")
        controls.append(_parse_control(entry.get("control")))
    return controls


def load_timeline(path: Path) -> list[Control]:
    try:
        data: object = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ReplayError(f"{path}: not JSON ({exc.msg})") from exc
    return parse_timeline(data)


def frame_messages(control: Control, dancer: str) -> list[bytes]:
    prefix = f"/dance/{dancer}"
    params = Message(prefix + "/params", [control.params[name] for name in PARAM_ORDER])
    events = [Message(prefix + "/event", [kind, strength]) for kind, strength in control.events]
    return [build_datagram(m) for m in (params, *events)]


def schedule(controls: list[Control], speed: float) -> list[tuple[float, Control]]:
    """(seconds to wait before this frame, frame) in time order; `speed` 2.0 = twice as fast."""
    if speed <= 0:
        raise ReplayError("speed must be > 0")
    ordered = sorted(controls, key=lambda c: c.t)
    timed: list[tuple[float, Control]] = []
    previous_t: float | None = None
    for control in ordered:
        delay = 0.0 if previous_t is None else (control.t - previous_t) / 1000 / speed
        timed.append((delay, control))
        previous_t = control.t
    return timed


async def replay(
    controls: list[Control],
    udp: UdpSender,
    *,
    dancer: str,
    speed: float,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
) -> int:
    sent = 0
    for delay, control in schedule(controls, speed):
        if delay > 0:
            await sleep(delay)
        for datagram in frame_messages(control, dancer):
            udp.send(datagram)
            sent += 1
    udp.send(build_datagram(Message(f"/dance/{dancer}/stop", [])))
    return sent + 1


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("timeline", type=Path, help="JSON exported by the Record button")
    parser.add_argument("--speed", type=float, default=1.0, help="2.0 = twice as fast")
    parser.add_argument("--dancer", choices=("A", "B"), default="A")
    parser.add_argument("--osc-host", default=DEFAULT_OSC_HOST)
    parser.add_argument("--osc-port", type=int, default=DEFAULT_OSC_PORT)
    options = parser.parse_args(argv)
    controls = load_timeline(options.timeline)
    duration_s = (max(c.t for c in controls) - min(c.t for c in controls)) / 1000 if controls else 0
    print(
        f"replaying {len(controls)} frames ({duration_s / options.speed:.1f} s) as dancer "
        f"{options.dancer} → udp://{options.osc_host}:{options.osc_port}"
    )
    udp = UdpTarget(options.osc_host, options.osc_port)
    sent = asyncio.run(replay(controls, udp, dancer=options.dancer, speed=options.speed))
    print(f"done: {sent} messages")


if __name__ == "__main__":
    main()
