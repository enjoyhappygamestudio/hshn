#!/usr/bin/env bash
# stop.sh — tắt dịch vụ
# Dùng: ./scripts/stop.sh [all|infra|expo]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

TARGET="${1:-all}"

case "$TARGET" in
  -h|--help)
    echo "Dùng: ./scripts/stop.sh [all|infra|expo]"
    exit 0
    ;;
  expo)
    stop_service expo
    kill_port "$PORT_EXPO" "expo :${PORT_EXPO}"
    ;;
  infra)
    bold "==> Tắt Docker API/Admin HSHN (giữ NOXH)"
    (cd "$BACKEND_DIR" && docker compose down) || true
    ;;
  all)
    bold "==> Tắt app Hải Sản Hà Nội"
    stop_service expo
    kill_port "$PORT_EXPO" "expo"
    (cd "$BACKEND_DIR" && docker compose stop) || true
    yellow "  · Giữ NOXH infra. Tắt container HSHN hẳn: ./scripts/stop.sh infra"
    ;;
  *)
    die "Không biết '$TARGET'. Dùng: all|infra|expo"
    ;;
esac
green "Xong."
