# URL hiện tại (Cloudflare Tunnel)

Cập nhật: 2026-08-04

## Cấu trúc Docker (4 container)

| Container | Port host | Vai trò |
|---|---|---|
| `haisanhanoi-api` | 4000 | API Express (thuần API + /uploads) |
| `haisanhanoi-admin` | 5050 | Nginx: web admin + proxy `/api`, `/uploads` → api |
| `haisanhanoi-db` | 5432 | PostgreSQL 16 |
| `haisanhanoi-redis` | 6379 | Redis 7 |

Cloudflare tunnel trỏ vào **admin (port 5050)** — nginx proxy `/api` & `/uploads` sang api, nên 1 URL dùng được cho cả web admin lẫn API.

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
