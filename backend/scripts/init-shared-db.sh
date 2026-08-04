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
  echo "==> Không migrate từ DB cũ — chạy toàn bộ migrations rồi seed."
  # Schema trước (theo số thứ tự), seed sau cùng — seed cần cột từ 009_product_weight, v.v.
  shopt -s nullglob
  files=( "$ROOT"/migrations/*.sql )
  IFS=$'\n' files=( $(printf '%s\n' "${files[@]}" | sort) )
  files+=( "$ROOT/seeds/seed.sql" )
  for f in "${files[@]}"; do
    if [[ -f "$f" ]]; then
      echo "    apply $(basename "$f")"
      docker exec -i "$NOXH_PG_CONTAINER" \
        psql -v ON_ERROR_STOP=1 -U "$HSHN_USER" -d "$HSHN_DB" < "$f" >/dev/null
    fi
  done
fi

echo "==> Done. Kết nối Docker: postgresql://${HSHN_USER}:***@noxh-postgres:5432/${HSHN_DB}"
echo "    Host (apps ngoài Docker): localhost:55432"
echo ""
echo "    Reset sạch (VPS, khi seed/migration lỗi giữa chừng):"
echo "      docker exec -i ${NOXH_PG_CONTAINER} psql -U ${NOXH_SUPERUSER} -d postgres -c \"DROP DATABASE IF EXISTS ${HSHN_DB} WITH (FORCE);\""
echo "      MIGRATE_FROM_OLD=0 ./scripts/init-shared-db.sh"
