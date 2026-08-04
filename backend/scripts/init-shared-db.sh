#!/usr/bin/env bash
# Tạo role + database haisanhanoi trên noxh-postgres (dùng chung với NOXH).
# Chạy từ máy host khi noxh-postgres đang healthy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOXH_PG_CONTAINER="${NOXH_PG_CONTAINER:-noxh-postgres}"
NOXH_SUPERUSER="${NOXH_SUPERUSER:-noxh}"
HSHN_DB="${HSHN_DB:-haisanhanoi}"
HSHN_USER="${HSHN_USER:-hshn_user}"
HSHN_PASS="${HSHN_PASS:-hshn_pass}"
MIGRATE_FROM_OLD="${MIGRATE_FROM_OLD:-1}"
OLD_PG_CONTAINER="${OLD_PG_CONTAINER:-haisanhanoi-db}"

if ! docker ps --format '{{.Names}}' | grep -qx "$NOXH_PG_CONTAINER"; then
  echo "ERROR: container $NOXH_PG_CONTAINER chưa chạy. Chạy NOXH infra trước (pnpm infra:up)."
  exit 1
fi

echo "==> Tạo role/database $HSHN_DB trên $NOXH_PG_CONTAINER"
docker exec -i "$NOXH_PG_CONTAINER" psql -U "$NOXH_SUPERUSER" -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${HSHN_USER}') THEN
    CREATE ROLE ${HSHN_USER} LOGIN PASSWORD '${HSHN_PASS}';
  ELSE
    ALTER ROLE ${HSHN_USER} WITH LOGIN PASSWORD '${HSHN_PASS}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${HSHN_DB} OWNER ${HSHN_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${HSHN_DB}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${HSHN_DB} TO ${HSHN_USER};
SQL

docker exec -i "$NOXH_PG_CONTAINER" psql -U "$NOXH_SUPERUSER" -d "$HSHN_DB" <<SQL
GRANT ALL ON SCHEMA public TO ${HSHN_USER};
ALTER SCHEMA public OWNER TO ${HSHN_USER};
SQL

# Nếu còn container DB cũ và có data → dump/restore
if [[ "$MIGRATE_FROM_OLD" == "1" ]] && docker ps --format '{{.Names}}' | grep -qx "$OLD_PG_CONTAINER"; then
  echo "==> Migrate data từ $OLD_PG_CONTAINER → $NOXH_PG_CONTAINER/$HSHN_DB"
  TMP_DUMP="$(mktemp -t hshn-migrate.XXXXXX.sql)"
  docker exec "$OLD_PG_CONTAINER" pg_dump -U "$HSHN_USER" -d "$HSHN_DB" --clean --if-exists --no-owner --no-acl > "$TMP_DUMP"
  docker exec -i "$NOXH_PG_CONTAINER" psql -U "$HSHN_USER" -d "$HSHN_DB" < "$TMP_DUMP"
  rm -f "$TMP_DUMP"
  echo "==> Migrate xong."
else
  echo "==> Không migrate từ DB cũ — chạy migrations SQL (schema trống)."
  for f in \
    "$ROOT/migrations/001_initial.sql" \
    "$ROOT/migrations/002_admin_users.sql" \
    "$ROOT/seeds/seed.sql" \
    "$ROOT/migrations/004_chat_video_shipping.sql" \
    "$ROOT/migrations/006_video_comments.sql" \
    "$ROOT/migrations/007_ahamove_shipping.sql" \
    "$ROOT/migrations/009_product_weight.sql" \
    "$ROOT/migrations/010_hard_to_ship.sql" \
    "$ROOT/migrations/011_order_status_7.sql" \
    "$ROOT/migrations/012_categories.sql"
  do
    if [[ -f "$f" ]]; then
      echo "    apply $(basename "$f")"
      docker exec -i "$NOXH_PG_CONTAINER" psql -U "$HSHN_USER" -d "$HSHN_DB" < "$f" >/dev/null
    fi
  done
fi

echo "==> Done. Kết nối Docker: postgresql://${HSHN_USER}:***@noxh-postgres:5432/${HSHN_DB}"
echo "    Host (apps ngoài Docker): localhost:55432"
