#!/usr/bin/env bash
# scripts/lib/common.sh — start/stop/status (cùng kiểu NOXH / AppThuêNhà)
# shellcheck disable=SC2034

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
APP_DIR="${ROOT_DIR}/app"
RUN_DIR="${ROOT_DIR}/.run"
LOG_DIR="${RUN_DIR}/logs"
mkdir -p "$RUN_DIR" "$LOG_DIR"

PORT_API=3100
PORT_ADMIN=3101
PORT_EXPO=8002
PORT_POSTGRES=55432
NOXH_DIR="$(cd "${ROOT_DIR}/../NOXH" 2>/dev/null && pwd || true)"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }
die() { red "Lỗi: $*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Thiếu lệnh \`$1\`."
}

port_busy() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
  fi
}

pid_file() { echo "${RUN_DIR}/$1.pid"; }
log_file() { echo "${LOG_DIR}/$1.log"; }

is_pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local f
  f="$(pid_file "$1")"
  [[ -f "$f" ]] || { echo ""; return 0; }
  tr -d '[:space:]' <"$f"
}

service_running() {
  is_pid_alive "$(read_pid "$1")"
}

wait_http() {
  local url="$1"
  local label="${2:-$url}"
  local tries="${3:-40}"
  local i code
  for ((i = 1; i <= tries; i++)); do
    code="$(curl -sS -o /dev/null --max-time 2 -w '%{http_code}' "$url" 2>/dev/null || true)"
    if [[ -n "$code" && "$code" != "000" && "$code" -lt 500 ]]; then
      green "  ✓ $label sẵn sàng (HTTP $code)"
      return 0
    fi
    sleep 0.5
  done
  yellow "  ! $label chưa phản hồi — xem log"
  return 1
}

start_bg() {
  local name="$1"
  shift
  local pidf logfile pid
  pidf="$(pid_file "$name")"
  logfile="$(log_file "$name")"
  if service_running "$name"; then
    yellow "  · $name đang chạy (pid $(read_pid "$name")) — bỏ qua"
    return 0
  fi
  rm -f "$pidf"
  cd "$ROOT_DIR"
  if command -v setsid >/dev/null 2>&1; then
    setsid "$@" >>"$logfile" 2>&1 < /dev/null &
    pid=$!
    disown "$pid" 2>/dev/null || true
  elif command -v python3 >/dev/null 2>&1; then
    pid="$(python3 "${ROOT_DIR}/scripts/lib/detach.py" "$logfile" "$@")"
  else
    nohup "$@" >>"$logfile" 2>&1 &
    pid=$!
    disown "$pid" 2>/dev/null || true
  fi
  [[ -n "$pid" ]] || { red "  ✗ Không bật được $name"; tail -n 40 "$logfile" || true; return 1; }
  echo "$pid" >"$pidf"
  sleep 1
  if ! is_pid_alive "$pid"; then
    red "  ✗ $name thoát ngay — xem $logfile"
    tail -n 40 "$logfile" || true
    rm -f "$pidf"
    return 1
  fi
  green "  ✓ $name đã bật (pid $pid) · log: $logfile"
}

already_up() {
  local name="$1" port="$2" url="$3" label="$4"
  if curl -fsS -o /dev/null --max-time 2 "$url" 2>/dev/null; then
    green "$label đã sẵn sàng tại $url"
    return 0
  fi
  return 1
}

stop_service() {
  local name="$1"
  local pidf pid pgid
  pidf="$(pid_file "$name")"
  pid="$(read_pid "$name")"
  if [[ -z "$pid" ]]; then
    yellow "  · $name không có PID — bỏ qua"
    return 0
  fi
  if ! is_pid_alive "$pid"; then
    rm -f "$pidf"
    return 0
  fi
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]')"
  if [[ "$pgid" == "$pid" ]]; then
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  else
    kill "$pid" 2>/dev/null || true
  fi
  local i
  for ((i = 1; i <= 20; i++)); do
    is_pid_alive "$pid" || break
    sleep 0.25
  done
  if is_pid_alive "$pid"; then
    [[ "$pgid" == "$pid" ]] && kill -9 -- "-$pid" 2>/dev/null || true
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$pidf"
  green "  ✓ Đã tắt $name (pid $pid)"
}

kill_port() {
  local port="$1"
  local label="${2:-cổng $port}"
  command -v lsof >/dev/null 2>&1 || return 0
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  [[ -z "$pids" ]] && return 0
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.3
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
  yellow "  · Đã giải phóng $label"
}

lan_ip() {
  ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1"
}

print_urls() {
  local ip
  ip="$(lan_ip)"
  echo
  bold "Địa chỉ (Hải Sản Hà Nội):"
  echo "  API     : http://localhost:${PORT_API}/api/health"
  echo "  Admin   : http://localhost:${PORT_ADMIN}"
  echo "  Expo    : exp://${ip}:${PORT_EXPO}"
  echo "  API LAN : http://${ip}:${PORT_API}/api"
  echo
  echo "  Tắt:  npm run stop:all   |  ./scripts/stop.sh all"
  echo "  Xem:  npm run status     |  ./scripts/status.sh"
}
