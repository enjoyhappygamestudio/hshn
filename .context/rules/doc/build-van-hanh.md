# rules/doc/build-van-hanh.md — Chuẩn build & vận hành (theo AppThueNha)

> **Mẫu bắt buộc cho workspace VPS.**  
> Bản tham chiếu: [`AppThueNha/README.md`](../../../../AppThueNha/README.md).  
> PG/Redis: [`../code/shared-infra.md`](../code/shared-infra.md).  
> Cổng workspace: [`../code/cong-port.md`](../code/cong-port.md).

## Ba chế độ (README phải phản ánh)

| Chế độ | Ý nghĩa |
|---|---|
| Local — pnpm/npm | Dev trên host; infra DB/Redis = NOXH shared |
| Local — Docker apps | `docker compose` profile apps; join `noxh_default`; `.env.docker` |
| Production — VPS + Caddy | TLS trên Caddy host; reverse proxy tới api/admin |

## Lệnh một phát `start:all` (BẮT BUỘC)

Dự án PHẢI bật/tắt/kiểm tra cả stack bằng một lệnh (đã có `scripts/start-all.sh`):

| Lệnh | Ý nghĩa |
|---|---|
| `npm run start:all` | NOXH infra + API :3100 + Admin :3101 + Expo :8002 |
| `npm run stop:all` | Tắt app — giữ Postgres/Redis NOXH |
| `npm run status` | PID + cổng + health |

Quy ước script đồng nhất workspace (mẫu AppThueNha): `scripts/` + lib chung, pid/log tách riêng,
`start-infra` chỉ bật NOXH shared, không dựng PG/Redis riêng.

## Cấu trúc README chuẩn

Yêu cầu → Chuẩn bị một lần (NOXH `infra:up` → `backend/scripts/init-shared-db.sh` → env → migrate/seed) →  
Local dev → Local Docker → Production Caddy → Seed → Lệnh → Sự cố → Tóm tắt nhanh 3 khối.

## Quy tắc

- Không dựng `haisanhanoi-db` / `haisanhanoi-redis` riêng
- `.env` dùng `localhost:55432` / `56379/1`; container dùng `noxh-postgres` / `noxh-redis`
- `infra:down` app không tắt shared NOXH nếu dự án khác còn chạy
- Production: Caddy trên host (có thể merge Caddyfile với NOXH / RentManager)

Khi sửa README/Docker: đối chiếu AppThueNha trước khi viết lệnh.
