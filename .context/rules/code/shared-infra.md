# rules/code/shared-infra.md — Postgres & Redis dùng chung

> **Bắt buộc.** SoT: container NOXH (`noxh-postgres`, `noxh-redis`). Không dựng Postgres/Redis riêng.
> Cổng API/Admin/Expo: [`cong-port.md`](cong-port.md) — **cấm trùng** giữa dự án.

## Endpoint

| | Host | Docker (`noxh_default`) |
|---|---|---|
| PostgreSQL | `localhost:55432` | `noxh-postgres:5432` |
| Redis | `localhost:56379` | `noxh-redis:6379` |

## Phân bổ Hải Sản Hà Nội

| | Giá trị |
|---|---|
| Postgres DB | `haisanhanoi` |
| Role | `hshn_user` |
| Redis index | `/1` |
| Script | `backend/scripts/init-shared-db.sh` (cần `noxh-postgres` healthy) |

## Cấm

- Container `haisanhanoi-db` / `haisanhanoi-redis` riêng
- Redis index `/0` (NOXH), `/2` (RentManager), `/3` (REMP)
- Kết nối `localhost:5432` / `6379`

Compose app: join network `noxh_default`. Bảng toàn workspace: `NOXH/.context/rules/backend/shared-infra.md`.
