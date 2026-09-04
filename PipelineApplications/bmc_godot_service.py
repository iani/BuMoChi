#!/usr/bin/env python3
"""Persistent local bridge between SuperCollider and Godot."""
from __future__ import annotations
import argparse
import json
import os
import signal
import subprocess
import time
from pathlib import Path

RUNNING = True
PROJECT_PROCESSES: dict[str, subprocess.Popen[str]] = {}
PROJECT_LOGS: dict[str, object] = {}

def stop(_signal: int, _frame: object) -> None:
    global RUNNING
    RUNNING = False

def atomic_write(path: Path, text: str) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)

def sc_literal(value: object) -> str:
    """Encode inspection JSON as data-only SuperCollider source."""
    if value is None:
        return "nil"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return "[" + ", ".join(sc_literal(item) for item in value) + "]"
    if isinstance(value, dict):
        return "(" + ", ".join(
            f"{key}: {sc_literal(item)}" for key, item in value.items()
        ) + ")"
    raise TypeError(f"Cannot encode {type(value).__name__} for SuperCollider")

def write_report(output_path: str, report: dict[str, object]) -> None:
    output = Path(output_path)
    atomic_write(output, json.dumps(report, indent=2) + "\n")
    atomic_write(Path(output_path + ".scd"), sc_literal(report) + "\n")

def listening_ports(pid: int, ports: list[int]) -> list[int]:
    if not ports:
        return []
    completed = subprocess.run(
        ["lsof", "-nP", "-a", "-p", str(pid), "-iUDP"],
        capture_output=True, text=True, check=False,
    )
    return [port for port in ports if f":{port}" in completed.stdout]

def occupied_ports(ports: list[int]) -> list[int]:
    occupied: list[int] = []
    for port in ports:
        completed = subprocess.run(
            ["lsof", "-nP", f"-iUDP:{port}"],
            capture_output=True, text=True, check=False,
        )
        if completed.stdout.strip():
            occupied.append(port)
    return occupied

def stop_launched_projects() -> None:
    for process in PROJECT_PROCESSES.values():
        if process.poll() is None:
            process.terminate()
    for process in PROJECT_PROCESSES.values():
        if process.poll() is None:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=2)
    for log in PROJECT_LOGS.values():
        log.close()
    PROJECT_PROCESSES.clear()
    PROJECT_LOGS.clear()

def process_request(request: Path) -> None:
    # SuperCollider has no portable atomic-rename primitive. Give its tiny
    # request file time to close before claiming it from the spool directory.
    time.sleep(0.05)
    working = request.with_suffix(".working")
    request.replace(working)
    fields = working.read_text(encoding="utf-8").splitlines()
    request_id = request.stem
    status_path = request.parent / f"{request.stem}.status"
    try:
        if len(fields) != 6:
            raise ValueError("Malformed service request")
        action, executable, project_path, argument, output_path, port_text = fields
        if action == "inspect":
            completed = subprocess.run(
                [executable, "--headless", "--path", project_path, "--script",
                 argument, "--", "--output", output_path],
                capture_output=True, text=True, timeout=60, check=False,
            )
            if completed.returncode != 0:
                details = completed.stderr.strip() or completed.stdout.strip()
                raise RuntimeError(
                    f"Godot exited with status {completed.returncode}: {details}")
            if not Path(output_path).is_file():
                raise RuntimeError("Godot produced no inspection report")
            report = json.loads(Path(output_path).read_text(encoding="utf-8"))
            atomic_write(Path(output_path + ".scd"), sc_literal(report) + "\n")
        elif action == "launch":
            ports = [int(port) for port in port_text.split(",") if port.strip()]
            # The initial BuMoChi workflow permits one active Godot project.
            # Stop our previous project before checking the next project's ports.
            stop_launched_projects()
            time.sleep(0.2)
            conflicts = occupied_ports(ports)
            if conflicts:
                raise RuntimeError(
                    "Required VMC UDP port(s) already in use: "
                    + ", ".join(str(port) for port in conflicts))
            log_path = request.parent / f"godot-{request_id}.log"
            log = log_path.open("w", encoding="utf-8")
            process = subprocess.Popen(
                [executable, "--path", project_path, argument],
                stdout=log, stderr=subprocess.STDOUT, text=True,
            )
            PROJECT_PROCESSES[project_path] = process
            PROJECT_LOGS[project_path] = log
            time.sleep(0.4)
            running = process.poll() is None
            write_report(output_path, {
                "format": "bumochiGodotRuntimeStatus", "formatVersion": 1,
                "action": "launch", "projectPath": project_path,
                "scenePath": argument, "running": running,
                "listening": False, "listeningPorts": [], "pid": process.pid,
                "logPath": str(log_path),
            })
            if not running:
                raise RuntimeError(f"Godot stopped during launch; see {log_path}")
        elif action == "status":
            process = PROJECT_PROCESSES.get(project_path)
            running = process is not None and process.poll() is None
            ports = [int(port) for port in port_text.split(",") if port.strip()]
            open_ports = listening_ports(process.pid, ports) if running else []
            write_report(output_path, {
                "format": "bumochiGodotRuntimeStatus", "formatVersion": 1,
                "action": "status", "projectPath": project_path,
                "scenePath": argument, "running": running,
                "listening": bool(ports) and len(open_ports) == len(ports),
                "listeningPorts": open_ports,
                "expectedPorts": ports,
                "pid": process.pid if running else None,
            })
        elif action == "stop":
            stop_launched_projects()
            write_report(output_path, {
                "format": "bumochiGodotRuntimeStatus", "formatVersion": 1,
                "action": "stop", "projectPath": project_path,
                "scenePath": argument, "running": False,
                "listening": False, "listeningPorts": [], "pid": None,
            })
        else:
            raise ValueError(f"Unsupported service action: {action}")
        atomic_write(status_path, "ok\n")
    except Exception as error:
        atomic_write(status_path, f"error\n{error}\n")
    finally:
        working.unlink(missing_ok=True)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spool-dir", default="/tmp/bumochi-godot-service")
    args = parser.parse_args()
    spool = Path(args.spool_dir).expanduser().resolve()
    spool.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    ready = spool / "service.ready"
    atomic_write(ready, f"{os.getpid()}\n{Path(__file__).resolve()}\n")
    print(f"BuMoChi Godot service ready: {spool}", flush=True)
    try:
        while RUNNING:
            for request in sorted(spool.glob("*.request")):
                process_request(request)
            time.sleep(0.1)
    finally:
        stop_launched_projects()
        ready.unlink(missing_ok=True)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
