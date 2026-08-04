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

Cloudflare tunnel trỏ vào **admin (port 3101)** — nginx proxy `/api` & `/uploads` sang api, nên 1 URL dùng được cho cả web admin lẫn API.

## Web Admin + API

- **Web Admin:** https://crest-hypothetical-overnight-trying.trycloudflare.com/admin/
- **API:** https://crest-hypothetical-overnight-trying.trycloudflare.com/api

## App (Expo)

- **Mở bằng Expo Go:** `exp://wgkqz6s-anonymous-8082.exp.direct`

## API cho App

- **App gọi API qua:** https://crest-hypothetical-overnight-trying.trycloudflare.com/api

## Ghi chú

- URL Cloudflare/Expo tunnel là **ngẫu nhiên**, thay đổi mỗi lần restart tunnel.
- `API_BASE_URL` trong `app/src/constants/config.ts` đã trỏ tới URL Cloudflare API ở trên.
- Log tunnel: `/tmp/hshn_tunnel.log` (PID 12023); log Expo: `/tmp/hshn_expo.log` (PID 28726).
- Port app HSHN (`3100` API, `3101` admin) và NOXH (`3000–3003`, `8081`, `55432`, `56379`) không trùng nhau.
