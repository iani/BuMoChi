#!/usr/bin/env python3
"""Local Windows pipeline supervisor; no shell or third-party Python packages."""
import argparse
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--spool-dir', required=True)
    parser.add_argument('--bmc-port', type=int, default=57130)
    parser.add_argument('--encoder-port', type=int, default=39537)
    parser.add_argument('--decoder-port', type=int, default=39538)
    parser.add_argument('--status', action='store_true')
    parser.add_argument('--stop', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    for port in (args.bmc_port, args.encoder_port, args.decoder_port):
        if not 1 <= port <= 65535:
            parser.error('Ports must be between 1 and 65535')
    spool = Path(args.spool_dir).resolve()
    state = spool / 'pipeline.ready'
    stop_file = spool / 'pipeline.stop'
    active = state.exists() and time.time() - state.stat().st_mtime < 5
    if args.status:
        return 0 if active else 1
    if args.stop:
        if active:
            stop_file.touch()
        return 0
    if active:
        raise RuntimeError('A pipeline is already running; stop it before restarting.')
    app = Path(__file__).resolve().parent
    commands = [
        ('godot-service', [sys.executable, '-u', str(app / 'bmc_godot_service.py'), '--spool-dir', str(spool)]),
        ('decoder', [sys.executable, '-u', str(app / 'BunrakuOSCDecoder.py'), '--listen-port', str(args.decoder_port)]),
        ('encoder', [sys.executable, '-u', str(app / 'BunrakuOSCEncoder.py'), '--listen-port', str(args.encoder_port),
                     '--bmc-port', str(args.bmc_port), '--no-oscgroups', '--avatar', 'Ishidomaru',
                     '--source', socket.gethostname() + '-xr-animator']),
    ]
    if args.dry_run:
        print(json.dumps(commands, indent=2))
        return 0
    # Refuse to start competing listeners before creating any child processes.
    for port in (args.encoder_port, args.decoder_port):
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as test:
            if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
                test.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            test.bind(('127.0.0.1', port))
    spool.mkdir(parents=True, exist_ok=True)
    stop_file.unlink(missing_ok=True)
    (spool / 'service.stop').unlink(missing_ok=True)
    # Do not overwrite or stop a Godot service managed by another launcher.
    if (spool / 'service.ready').exists():
        raise RuntimeError('Godot service marker already exists. Stop that service first; if it crashed, remove its stale service.ready file.')
    children = []
    logs = []
    stopping = False
    def stop(_signum, _frame):
        nonlocal stopping
        stopping = True
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        for name, command in commands:
            log = (spool / (name + '.log')).open('w', encoding='utf-8')
            logs.append(log)
            children.append(subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT))
        time.sleep(0.5)
        while not stopping and not stop_file.exists():
            if any(p.poll() is not None for p in children):
                raise RuntimeError('A pipeline process stopped. See logs in ' + str(spool))
            state.write_text(str(os.getpid()), encoding='ascii')
            time.sleep(0.5)
    finally:
        # Give the Godot service time to close the projects it launched.
        (spool / 'service.stop').touch()
        if children:
            try:
                children[0].wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass
        for process in children:
            if process.poll() is None:
                process.terminate()
        for process in children:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for log in logs:
            log.close()
        for path in (state, stop_file, spool / 'service.stop'):
            path.unlink(missing_ok=True)
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print('BuMoChi pipeline: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
