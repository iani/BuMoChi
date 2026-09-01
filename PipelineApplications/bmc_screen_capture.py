#!/usr/bin/env python3
"""Start and stop a detached FFmpeg macOS screen capture for BuMoChi."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time


def atomic_json(path: Path, data: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def find_ffmpeg(explicit: str | None) -> str:
    candidates = [explicit, shutil.which("ffmpeg"), "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(Path(candidate).resolve())
    raise RuntimeError("FFmpeg was not found; install it or pass --ffmpeg")


def process_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def start_capture(args: argparse.Namespace) -> int:
    output = Path(args.output).expanduser().resolve()
    state = Path(args.state).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    state.parent.mkdir(parents=True, exist_ok=True)
    if state.exists():
        old = json.loads(state.read_text(encoding="utf-8"))
        if old.get("active") and process_exists(int(old["pid"])):
            raise RuntimeError(f"screen capture is already active with pid {old['pid']}")

    ffmpeg = find_ffmpeg(args.ffmpeg)
    log_path = output.with_suffix(".ffmpeg.log")
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "warning",
        "-f",
        "avfoundation",
        "-framerate",
        str(args.fps),
        "-capture_cursor",
        "1",
        "-i",
        f"{args.display}:none",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-y",
        str(output),
    ]
    with log_path.open("ab") as log:
        process = subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=log,
            start_new_session=True,
        )

    deadline = time.monotonic() + args.ready_timeout
    while time.monotonic() < deadline:
        exit_code = process.poll()
        if exit_code is not None:
            raise RuntimeError(
                f"FFmpeg exited during startup with status {exit_code}; see {log_path}"
            )
        if output.exists() and output.stat().st_size > 0:
            break
        time.sleep(0.05)
    else:
        process.send_signal(signal.SIGINT)
        raise RuntimeError(f"FFmpeg did not create {output} before the startup timeout")

    atomic_json(
        state,
        {
            "active": True,
            "pid": process.pid,
            "output": str(output),
            "log": str(log_path),
            "display": args.display,
            "fps": args.fps,
            "ffmpeg": ffmpeg,
            "started_at": time.time(),
        },
    )
    print(f"READY {process.pid}")
    return 0


def mux_audio(data: dict, audio_argument: str, timeout: float) -> None:
    video = Path(data["output"])
    audio = Path(audio_argument).expanduser().resolve()
    ffmpeg = find_ffmpeg(data.get("ffmpeg"))
    log_path = Path(data["log"])
    if not video.is_file() or video.stat().st_size == 0:
        raise RuntimeError(f"captured video is missing or empty: {video}")
    if not audio.is_file() or audio.stat().st_size == 0:
        raise RuntimeError(f"recorded audio is missing or empty: {audio}")
    temporary = video.with_name(video.stem + ".muxing" + video.suffix)
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "warning",
        "-i",
        str(video),
        "-i",
        str(audio),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        "-y",
        str(temporary),
    ]
    try:
        with log_path.open("ab") as log:
            result = subprocess.run(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=log,
                timeout=timeout,
                check=False,
            )
        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg audio mux exited with status {result.returncode}; see {log_path}"
            )
        if not temporary.is_file() or temporary.stat().st_size == 0:
            raise RuntimeError(f"FFmpeg did not create the muxed video: {temporary}")
        os.replace(temporary, video)
    finally:
        if temporary.exists():
            temporary.unlink()


def stop_capture(args: argparse.Namespace) -> int:
    state = Path(args.state).expanduser().resolve()
    if not state.exists():
        print("NOT_RUNNING")
        return 0
    data = json.loads(state.read_text(encoding="utf-8"))
    pid = int(data.get("pid", 0))
    if data.get("active") and pid > 0 and process_exists(pid):
        os.kill(pid, signal.SIGINT)
        deadline = time.monotonic() + args.timeout
        while time.monotonic() < deadline and process_exists(pid):
            time.sleep(0.05)
        if process_exists(pid):
            os.kill(pid, signal.SIGTERM)
            time.sleep(0.5)
        if process_exists(pid):
            raise RuntimeError(f"FFmpeg process {pid} did not stop")
    data["active"] = False
    data["stopped_at"] = time.time()
    atomic_json(state, data)
    if args.audio:
        try:
            mux_audio(data, args.audio, args.mux_timeout)
            data["audio"] = str(Path(args.audio).expanduser().resolve())
            data["muxed"] = True
        except Exception as error:
            data["muxed"] = False
            data["mux_error"] = str(error)
            atomic_json(state, data)
            raise
    else:
        data["muxed"] = False
    atomic_json(state, data)
    print("STOPPED_MUXED" if data["muxed"] else "STOPPED")
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    subparsers = result.add_subparsers(dest="command", required=True)
    start = subparsers.add_parser("start")
    start.add_argument("--output", required=True)
    start.add_argument("--state", required=True)
    start.add_argument("--display", default="Capture screen 0")
    start.add_argument("--fps", type=float, default=30.0)
    start.add_argument("--ready-timeout", type=float, default=5.0)
    start.add_argument("--ffmpeg")
    stop = subparsers.add_parser("stop")
    stop.add_argument("--state", required=True)
    stop.add_argument("--timeout", type=float, default=15.0)
    stop.add_argument("--audio")
    stop.add_argument("--mux-timeout", type=float, default=120.0)
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "start":
            return start_capture(args)
        return stop_capture(args)
    except Exception as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
