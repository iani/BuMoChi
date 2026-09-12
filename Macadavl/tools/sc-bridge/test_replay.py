"""Replaying an exported dance timeline as OSC, in real time, without the browser."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pytest
from pythonosc.osc_message import OscMessage

from replay import Control, ReplayError, frame_messages, load_timeline, replay, schedule

PARAMS = {
    "intensity": 0.1,
    "brightness": 0.2,
    "pitch": 0.3,
    "width": 0.4,
    "pan": 0.5,
    "density": 0.6,
    "space": 0.7,
}


def entry(t: float, events: list[dict[str, object]] | None = None) -> dict[str, object]:
    return {
        "pose": {"t": t, "landmarks": []},
        "features": {"t": t},
        "control": {"t": t, "params": PARAMS, "events": events or []},
    }


def timeline(*entries: dict[str, object]) -> dict[str, object]:
    return {
        "version": 1,
        "sourceKind": "fixture",
        "mappingId": "direct-v0",
        "startedAt": "2026-01-01T00:00:00.000Z",
        "entries": list(entries),
    }


class FakeUdp:
    def __init__(self) -> None:
        self.sent: list[bytes] = []

    def send(self, data: bytes) -> None:
        self.sent.append(data)


def test_should_load_only_the_control_frames_of_a_timeline(tmp_path: Path) -> None:
    # GIVEN
    path = tmp_path / "timeline.json"
    path.write_text(
        json.dumps(timeline(entry(0), entry(100, [{"kind": "hit", "strength": 0.8, "t": 100}])))
    )
    # WHEN
    controls = load_timeline(path)
    # THEN
    assert [c.t for c in controls] == [0, 100]
    assert controls[0].params == PARAMS
    assert controls[1].events == [("hit", 0.8)]


@pytest.mark.parametrize(
    "data",
    [
        [],
        {"version": 2, "entries": []},
        {"version": 1, "entries": "nope"},
        {"version": 1, "entries": [{"control": {"t": 0, "params": {}, "events": []}}]},
        {"version": 1, "entries": [{"control": {"t": "0", "params": PARAMS, "events": []}}]},
    ],
)
def test_should_reject_timelines_that_do_not_match_the_contract(
    tmp_path: Path, data: object
) -> None:
    # GIVEN
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(data))
    # WHEN / THEN
    with pytest.raises(ReplayError):
        load_timeline(path)


def test_should_send_params_in_order_then_one_message_per_event() -> None:
    # GIVEN
    control = Control(t=0, params=PARAMS, events=[("hit", 1.0), ("release", 0.2)])
    # WHEN
    messages = [OscMessage(d) for d in frame_messages(control, "B")]
    # THEN
    assert [m.address for m in messages] == [
        "/dance/B/params",
        "/dance/B/event",
        "/dance/B/event",
    ]
    assert [round(p, 6) for p in messages[0].params] == [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
    assert messages[1].params == ["hit", 1.0]
    assert messages[2].params == ["release", pytest.approx(0.2)]


def test_should_space_frames_by_control_t_deltas_divided_by_speed() -> None:
    # GIVEN
    controls = [
        Control(t=0, params=PARAMS, events=[]),
        Control(t=100, params=PARAMS, events=[]),
        Control(t=350, params=PARAMS, events=[]),
    ]
    # WHEN
    delays = [delay for delay, _ in schedule(controls, speed=2.0)]
    # THEN
    assert delays == [0.0, 0.05, 0.125]


def test_should_replay_in_time_order_and_finish_with_stop() -> None:
    # GIVEN frames stored out of order
    controls = [
        Control(t=200, params=PARAMS, events=[("accent", 0.5)]),
        Control(t=0, params=PARAMS, events=[]),
        Control(t=50, params=PARAMS, events=[]),
    ]
    udp = FakeUdp()
    slept: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        slept.append(seconds)

    # WHEN
    sent = asyncio.run(replay(controls, udp, dancer="A", speed=1.0, sleep=fake_sleep))
    # THEN
    assert slept == [0.05, 0.15]
    assert [OscMessage(d).address for d in udp.sent] == [
        "/dance/A/params",
        "/dance/A/params",
        "/dance/A/params",
        "/dance/A/event",
        "/dance/A/stop",
    ]
    assert sent == 5
