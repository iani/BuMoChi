#!/usr/bin/env bash

# Start and supervise the BuMoChi encoder, decoder, and (optionally)
# OscGroupClient. Run this script from any directory.

set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -f "$SCRIPT_DIR/BunrakuOSCEncoder.py" ]; then
  APP_DIR=$SCRIPT_DIR
  REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
else
  REPO_DIR=$SCRIPT_DIR
  APP_DIR=$REPO_DIR/PipelineApplications
fi

PYTHON=${PYTHON:-python3}
LISTEN_IP=127.0.0.1
ENCODER_PORT=39537
BMC_IP=127.0.0.1
BMC_PORT=57130
DECODER_PORT=39538
GODOT_IP=127.0.0.1
OSCGROUPS_INPUT_PORT=22244
SERVER_PORT=22242
SERVER_ADDRESS=
LOCAL_TO_REMOTE_PORT=22243
USER_NAME=
GROUP_NAME=bumochi
PASSWORD=bmc123
AVATAR=Ishidomaru
SOURCE_NAME="$(hostname -s 2>/dev/null || hostname)-xr-animator"
USE_OSCGROUPS=0
VERBOSE=0
DRY_RUN=0
LOG_DIR=${BUMOCHI_LOG_DIR:-"${TMPDIR:-/tmp}/bumochi-pipeline-${USER:-user}"}

PIDS=""
NAMES=""
STOPPING=0

usage() {
  cat <<'EOF'
Usage:
  start_bumochi_pipeline.sh [options]

Local-only default (no arguments required):
  ./PipelineApplications/start_bumochi_pipeline.sh

Collaborative example:
  ./PipelineApplications/start_bumochi_pipeline.sh \
    --oscserver oscgroups.example.org --username PerformerA

OscGroupClient options:
  --oscserver HOST       Enable OSCGroups and use this server address
  --username NAME        Unique OSCGroups user name (required with --oscserver)
  --groupname NAME       OSCGroups group name (default: bumochi)
  --password PASSWORD    User and group password (default: bmc123)
  --server-port PORT     OSCGroups server port (default: 22242)
  --local-port PORT      Unique local network-facing client port (default: 22243)
  --no-oscgroups         Force local-only startup

Pipeline options:
  --avatar NAME          Encoder avatar name (default: Ishidomaru)
  --source NAME          Stable encoder source ID
  --encoder-port PORT    XR-Animator input (default: 39537)
  --bmc-port PORT        Local Bmc input (default: 57130)
  --decoder-port PORT    Routed Bmc input (default: 39538)
  --oscgroups-port PORT  Encoder-to-client input (default: 22244)
  --log-dir PATH         Process log directory
  --verbose              Enable verbose encoder and decoder output
  --dry-run              Validate and display commands without starting them
  -h, --help             Show this help

The default password can also be overridden independently with the
BUMOCHI_USER_PASSWORD and BUMOCHI_GROUP_PASSWORD environment variables.

Press Control-C to stop every process started by this launcher.
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

need_value() {
  [ "$#" -ge 2 ] && [ -n "$2" ] || die "$1 requires a value"
}

valid_port() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

check_port() {
  label=$1
  port=$2
  valid_port "$port" || die "$label must be a number from 1 to 65535 (got: $port)"
}

port_must_be_free() {
  label=$1
  port=$2
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iUDP:"$port" 2>/dev/null | grep -q .; then
    printf 'Port check failed for %s (UDP %s):\n' "$label" "$port" >&2
    lsof -nP -iUDP:"$port" >&2
    die "stop the existing listener or select another port"
  fi
}

find_oscgroup_client() {
  if [ -n "${OSCGROUPCLIENT:-}" ]; then
    printf '%s\n' "$OSCGROUPCLIENT"
    return
  fi

  case "$(uname -s)" in
    Darwin) printf '%s\n' "$REPO_DIR/HelperAppsAndExamples/OSCGroups/bin/macos/OscGroupClient" ;;
    Linux) printf '%s\n' "$REPO_DIR/HelperAppsAndExamples/OSCGroups/bin/linux/arch/OscGroupClient" ;;
    *) die "automatic OscGroupClient selection supports macOS and Linux; set OSCGROUPCLIENT explicitly" ;;
  esac
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

print_command() {
  label=$1
  shift
  printf '%s:' "$label"
  for arg in "$@"; do
    printf ' '
    shell_quote "$arg"
  done
  printf '\n'
}

start_process() {
  name=$1
  logfile=$2
  shift 2
  "$@" >"$logfile" 2>&1 &
  pid=$!
  PIDS="$PIDS $pid"
  NAMES="$NAMES $name"
  printf 'Started %-18s PID %-7s log: %s\n' "$name" "$pid" "$logfile"
}

stop_all() {
  [ "$STOPPING" -eq 0 ] || return
  STOPPING=1
  trap - INT TERM EXIT
  printf '\nStopping BuMoChi pipeline...\n'
  for pid in $PIDS; do
    kill "$pid" 2>/dev/null || true
  done
  for pid in $PIDS; do
    wait "$pid" 2>/dev/null || true
  done
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --oscserver|--server) need_value "$@"; SERVER_ADDRESS=$2; USE_OSCGROUPS=1; shift 2 ;;
    --server-port) need_value "$@"; SERVER_PORT=$2; shift 2 ;;
    --local-port) need_value "$@"; LOCAL_TO_REMOTE_PORT=$2; shift 2 ;;
    --username|--user) need_value "$@"; USER_NAME=$2; shift 2 ;;
    --groupname|--group) need_value "$@"; GROUP_NAME=$2; shift 2 ;;
    --password) need_value "$@"; PASSWORD=$2; shift 2 ;;
    --avatar) need_value "$@"; AVATAR=$2; shift 2 ;;
    --source) need_value "$@"; SOURCE_NAME=$2; shift 2 ;;
    --encoder-port) need_value "$@"; ENCODER_PORT=$2; shift 2 ;;
    --bmc-port) need_value "$@"; BMC_PORT=$2; shift 2 ;;
    --decoder-port) need_value "$@"; DECODER_PORT=$2; shift 2 ;;
    --oscgroups-port) need_value "$@"; OSCGROUPS_INPUT_PORT=$2; shift 2 ;;
    --log-dir) need_value "$@"; LOG_DIR=$2; shift 2 ;;
    --no-oscgroups) USE_OSCGROUPS=0; shift ;;
    --verbose) VERBOSE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1 (use --help)" ;;
  esac
done

command -v "$PYTHON" >/dev/null 2>&1 || die "Python command not found: $PYTHON"
[ -f "$APP_DIR/BunrakuOSCEncoder.py" ] || die "BunrakuOSCEncoder.py is missing"
[ -f "$APP_DIR/BunrakuOSCDecoder.py" ] || die "BunrakuOSCDecoder.py is missing"

check_port "encoder port" "$ENCODER_PORT"
check_port "Bmc port" "$BMC_PORT"
check_port "decoder port" "$DECODER_PORT"
check_port "OSCGroups input port" "$OSCGROUPS_INPUT_PORT"

ENCODER_ARGS=""
if [ "$USE_OSCGROUPS" -eq 1 ]; then
  [ -n "$SERVER_ADDRESS" ] || die "--oscserver requires a server address"
  [ -n "$USER_NAME" ] || die "--username is required when --oscserver is used"
  check_port "OSCGroups server port" "$SERVER_PORT"
  check_port "OSCGroups local port" "$LOCAL_TO_REMOTE_PORT"
  [ "$LOCAL_TO_REMOTE_PORT" != "$OSCGROUPS_INPUT_PORT" ] || die "--local-port and --oscgroups-port must differ"
  OSCGROUP_CLIENT=$(find_oscgroup_client)
  [ -x "$OSCGROUP_CLIENT" ] || die "OscGroupClient is missing or not executable: $OSCGROUP_CLIENT"

  USER_PASSWORD=${BUMOCHI_USER_PASSWORD:-$PASSWORD}
  GROUP_PASSWORD=${BUMOCHI_GROUP_PASSWORD:-$PASSWORD}
  [ -n "$USER_PASSWORD" ] || die "user password may not be empty"
  [ -n "$GROUP_PASSWORD" ] || die "group password may not be empty"
fi

if [ "$DRY_RUN" -eq 0 ]; then
  port_must_be_free "BunrakuOSCEncoder" "$ENCODER_PORT"
  port_must_be_free "BunrakuOSCDecoder" "$DECODER_PORT"
  if [ "$USE_OSCGROUPS" -eq 1 ]; then
    port_must_be_free "OscGroupClient input" "$OSCGROUPS_INPUT_PORT"
    port_must_be_free "OscGroupClient local network" "$LOCAL_TO_REMOTE_PORT"
  fi
  trap stop_all INT TERM EXIT
fi

set -- "$PYTHON" -u "$APP_DIR/BunrakuOSCDecoder.py" \
	--listen-ip "$LISTEN_IP" --listen-port "$DECODER_PORT" \
	--target-ip "$GODOT_IP"
[ "$VERBOSE" -eq 0 ] || set -- "$@" --verbose
if [ "$DRY_RUN" -eq 1 ]; then
  print_command BunrakuOSCDecoder "$@"
else
  mkdir -p "$LOG_DIR" || die "cannot create log directory: $LOG_DIR"
  start_process BunrakuOSCDecoder "$LOG_DIR/decoder.log" "$@"
fi

if [ "$USE_OSCGROUPS" -eq 1 ]; then
  if [ "$DRY_RUN" -eq 1 ]; then
    print_command OscGroupClient "$OSCGROUP_CLIENT" "$SERVER_ADDRESS" "$SERVER_PORT" \
      "$LOCAL_TO_REMOTE_PORT" "$OSCGROUPS_INPUT_PORT" "$BMC_PORT" \
      "$USER_NAME" '<user-password>' "$GROUP_NAME" '<group-password>'
  else
    start_process OscGroupClient "$LOG_DIR/oscgroups.log" \
      "$OSCGROUP_CLIENT" "$SERVER_ADDRESS" "$SERVER_PORT" \
      "$LOCAL_TO_REMOTE_PORT" "$OSCGROUPS_INPUT_PORT" "$BMC_PORT" \
      "$USER_NAME" "$USER_PASSWORD" "$GROUP_NAME" "$GROUP_PASSWORD"
  fi
fi

set -- "$PYTHON" -u "$APP_DIR/BunrakuOSCEncoder.py" \
  --listen-ip "$LISTEN_IP" --listen-port "$ENCODER_PORT" \
  --bmc-ip "$BMC_IP" --bmc-port "$BMC_PORT" \
  --avatar "$AVATAR" --source "$SOURCE_NAME"
if [ "$USE_OSCGROUPS" -eq 1 ]; then
  set -- "$@" --oscgroups-ip 127.0.0.1 --oscgroups-port "$OSCGROUPS_INPUT_PORT"
else
  set -- "$@" --no-oscgroups
fi
[ "$VERBOSE" -eq 0 ] || set -- "$@" --verbose
if [ "$DRY_RUN" -eq 1 ]; then
  print_command BunrakuOSCEncoder "$@"
  exit 0
fi
start_process BunrakuOSCEncoder "$LOG_DIR/encoder.log" "$@"

printf '\nBuMoChi pipeline is running. Press Control-C to stop all processes.\n'

# Bash 3 (the macOS system Bash) has no `wait -n`, so supervise portably.
while :; do
  index=1
  for pid in $PIDS; do
    if ! kill -0 "$pid" 2>/dev/null; then
      name=$(printf '%s\n' $NAMES | sed -n "${index}p")
      printf '\n%s (PID %s) stopped unexpectedly. Check %s.\n' "$name" "$pid" "$LOG_DIR" >&2
      exit 1
    fi
    index=$((index + 1))
  done
  sleep 1
done
