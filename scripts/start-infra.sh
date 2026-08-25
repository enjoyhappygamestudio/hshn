#!/usr/bin/env bash
# start-infra.sh — NOXH Postgres/Redis + Docker API/Admin HSHN
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

require_cmd docker
bold "==> Hạ tầng NOXH (Postgres/Redis)"

if ! docker info >/dev/null 2>&1; then
  if [[ "$(uname)" == "Darwin" ]]; then
    yellow "  Đang mở Docker Desktop…"
    open -a Docker 2>/dev/null || open -a "Docker Desktop" 2>/dev/null || true
    for ((i = 1; i <= 60; i++)); do
      docker info >/dev/null 2>&1 && break
      sleep 2
    done
  fi
  docker info >/dev/null 2>&1 || die "Docker chưa chạy."
fi

if [[ -z "${NOXH_DIR}" || ! -d "${NOXH_DIR}" ]]; then
  die "Không tìm thấy ../NOXH — đặt HaiSanHaNoi cạnh NOXH"
fi

(cd "$NOXH_DIR" && docker compose up -d)

bold "==> Chờ Postgres :${PORT_POSTGRES}"
for ((i = 1; i <= 60; i++)); do
  if port_busy "$PORT_POSTGRES"; then
    green "  ✓ Postgres sẵn sàng"
    break
  fi
  sleep 1
  [[ "$i" -eq 60 ]] && die "Postgres chưa lắng nghe ${PORT_POSTGRES}"
done

bold "==> Docker API + Admin (backend)"
(cd "$BACKEND_DIR" && docker compose up -d --build)
wait_http "http://127.0.0.1:${PORT_API}/api/health" "API HSHN" 60 || true
wait_http "http://127.0.0.1:${PORT_ADMIN}" "Admin HSHN" 40 || true
(cd "$BACKEND_DIR" && docker compose ps) || true
