# URL hiện tại (Cloudflare Tunnel)

Cập nhật: 2026-08-05

## Cấu trúc Docker

| Container | Port host | Vai trò |
|---|---|---|
| `haisanhanoi-api` | 3100 | API Express (thuần API + /uploads) |
| `haisanhanoi-admin` | 3101 | Nginx: web admin + proxy `/api`, `/uploads` → api |

**Dùng chung với NOXH** (không còn `haisanhanoi-db` / `haisanhanoi-redis`):

| Container (NOXH) | Port host | Vai trò cho HSHN |
|---|---|---|
| `noxh-postgres` | 55432 | PostgreSQL — database riêng `haisanhanoi` |
| `noxh-redis` | 56379 | Redis — logical DB index `1` (NOXH dùng `0`) |

API join network Docker `noxh_default` để gọi `noxh-postgres` / `noxh-redis` nội bộ.

Khởi tạo DB lần đầu (từ `backend/`):

```bash
./scripts/init-shared-db.sh
```

## Caddy (HTTPS trên VPS)

| Host | Upstream |
|---|---|
| `apiapp.haisanbay.com` | `127.0.0.1:3100` (API) |

File mẫu: `backend/docker/caddy/Caddyfile` — ghép vào `/etc/caddy/Caddyfile` rồi `sudo systemctl reload caddy`.

Admin (`3101`) chỉ nội bộ / SSH tunnel — chưa gắn domain Caddy.

## API

- **API:** https://apiapp.haisanbay.com/api
- **Health:** https://apiapp.haisanbay.com/api/health

## Ghi chú

- Port app HSHN (`3100` API, `3101` admin, Expo Metro **8002**) và NOXH (`3000–3003`, mobile web `8081`, Expo Metro **8001**, `55432`, `56379`), AppThuêNhà (Expo Metro **8003**) không trùng nhau; ShopManager **3400**, fanpage **3500** (tránh NOXH 3000/3001).
- UFW chỉ mở `22` / `80` / `443`; không public `3100`/`3101`.
