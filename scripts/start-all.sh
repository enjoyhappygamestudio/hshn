#!/usr/bin/env bash
# start-all.sh — bật infra Docker + Expo (1 lệnh)
# Dùng: ./scripts/start-all.sh [--no-expo]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

WITH_EXPO=1
for arg in "$@"; do
  case "$arg" in
    --no-expo) WITH_EXPO=0 ;;
    --expo) WITH_EXPO=1 ;;
    -h|--help)
      cat <<EOF
Dùng: ./scripts/start-all.sh [--no-expo]

  1) NOXH Postgres/Redis
  2) API    http://localhost:3100  (Docker)
  3) Admin  http://localhost:3101  (Docker)
  4) Expo   exp://<IP>:8002        (bỏ qua bằng --no-expo)

Tắt: npm run stop:all
Xem: npm run status
EOF
      exit 0
      ;;
    *) die "Tham số không hợp lệ: $arg" ;;
  esac
done

bash "${ROOT_DIR}/scripts/start-infra.sh"
if [[ "$WITH_EXPO" -eq 1 ]]; then
  bash "${ROOT_DIR}/scripts/start-expo.sh"
fi

print_urls
green "Xong — log Expo trong .run/logs/"
