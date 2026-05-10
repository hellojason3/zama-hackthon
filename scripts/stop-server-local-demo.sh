#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.demo-logs}"
WEB_PORT="${WEB_PORT:-3000}"
RPC_PORT="${RPC_PORT:-8545}"

stop_tree() {
  local pid="$1"
  local child
  for child in $(pgrep -P "$pid" || true); do
    stop_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

stop_port() {
  local port="$1"
  local pid
  if ! command -v ss >/dev/null 2>&1; then
    return
  fi

  for pid in $(ss -ltnp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u); do
    stop_tree "$pid"
    echo "Stopped process on port $port pid $pid"
  done
}

stop_pid() {
  local name="$1"
  local file="$LOG_DIR/$name.pid"
  if [ ! -f "$file" ]; then
    echo "$name is not running"
    return
  fi

  local pid
  pid="$(cat "$file")"
  if kill -0 "$pid" 2>/dev/null; then
    stop_tree "$pid"
    echo "Stopped $name pid $pid"
  else
    echo "$name pid $pid is not running"
  fi
  rm -f "$file"
}

stop_pid "next"
stop_port "$WEB_PORT"
stop_pid "hardhat"
stop_port "$RPC_PORT"
