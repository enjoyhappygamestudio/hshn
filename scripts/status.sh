#!/usr/bin/env bash
# status.sh — trạng thái Hải Sản Hà Nội
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

check_one() {
  local name="$1" port="$2" url="$3"
  local pid state="tắt" http="—" code
  pid="$(read_pid "$name")"
  if is_pid_alive "$pid"; then
    state="chạy (pid $pid)"
  elif port_busy "$port"; then
    state="cổng ${port} listen"
  fi
  if [[ -n "$url" ]]; then
    code="$(curl -sS -o /dev/null --max-time 2 -w '%{http_code}' "$url" 2>/dev/null || true)"
    if [[ -n "$code" && "$code" != "000" && "$code" -lt 500 ]]; then
      http="OK($code)"
    elif port_busy "$port"; then
      http="listen"
    fi
  fi
  printf "  %-8s  %-42s  HTTP:%-6s  %s\n" "$name" "$state" "$http" "$url"
}

bold "Trạng thái Hải Sản Hà Nội"
echo
check_one api   "$PORT_API"   "http://127.0.0.1:${PORT_API}/api/health"
check_one admin "$PORT_ADMIN" "http://127.0.0.1:${PORT_ADMIN}"
check_one expo  "$PORT_EXPO"  "http://127.0.0.1:${PORT_EXPO}"

echo
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  bold "Docker (backend)"
  (cd "$BACKEND_DIR" && docker compose ps) || true
else
  yellow "Docker chưa chạy."
fi

echo
ip="$(lan_ip)"
echo "IP LAN: ${ip}"
echo "Expo:   exp://${ip}:${PORT_EXPO}"
echo "API:    http://${ip}:${PORT_API}/api"
echo
echo "Log: ${LOG_DIR}/"
ls -1 "$LOG_DIR" 2>/dev/null | sed 's/^/  /' || echo "  (chưa có)"
