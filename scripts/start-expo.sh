#!/usr/bin/env bash
# start-expo.sh — Metro Expo :8002
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

FG=0
TUNNEL=0
for arg in "$@"; do
  case "$arg" in
    --fg) FG=1 ;;
    --tunnel) TUNNEL=1 ;;
    -h|--help)
      echo "Dùng: ./scripts/start-expo.sh [--tunnel] [--fg]"
      exit 0
      ;;
    *) die "Tham số không hợp lệ: $arg" ;;
  esac
done

require_cmd npm

if [[ ! -d "${APP_DIR}/node_modules" ]]; then
  bold "==> Cài deps app"
  (cd "$APP_DIR" && npm install)
fi

if already_up expo "$PORT_EXPO" "http://127.0.0.1:${PORT_EXPO}" "Expo Metro"; then
  echo "  exp://$(lan_ip):${PORT_EXPO}"
  exit 0
fi

if service_running expo && [[ "$FG" -eq 0 ]]; then
  yellow "Expo đã chạy (pid $(read_pid expo))."
  echo "  exp://$(lan_ip):${PORT_EXPO}"
  exit 0
fi

CMD=(npx expo start --lan --port "$PORT_EXPO")
[[ "$TUNNEL" -eq 1 ]] && CMD=(npx expo start --tunnel --port "$PORT_EXPO")

bold "==> Bật Expo Metro :${PORT_EXPO}"
ip="$(lan_ip)"

if [[ "$FG" -eq 1 ]]; then
  (cd "$APP_DIR" && "${CMD[@]}")
  exit $?
fi

: >"$(log_file expo)"
start_bg expo bash -c "cd '${APP_DIR}' && exec ${CMD[*]}"
wait_http "http://127.0.0.1:${PORT_EXPO}" "Expo Metro" 60 || true
echo "  QR / URL: exp://${ip}:${PORT_EXPO}"
echo "  API LAN:  http://${ip}:${PORT_API}/api"
echo "  Log:      $(log_file expo)"
echo "  Tắt:      ./scripts/stop.sh expo"
