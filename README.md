# Hải Sản Hà Nội — Ứng dụng đặt hải sản & API Backend

**Tác giả:** MEH Seafood

## Cấu trúc project

```
├── app/                    # Mobile App (Expo — iOS & Android)
│   ├── src/
│   │   ├── screens/        # 8 màn hình (Home, ProductDetail, Cart...)
│   │   ├── components/     # Shared components (ProductCard, VoucherCard...)
│   │   ├── stores/         # Zustand (cart, checkout)
│   │   ├── constants/      # Theme tokens, data mẫu
│   │   └── app/            # Navigation setup
│   ├── app.json            # Expo config (iOS bundle, Android package)
│   └── App.tsx             # Entry point
├── backend/                # API Server (Express + TypeScript + PostgreSQL)
│   ├── src/
│   │   ├── routes/         # products, orders, vouchers, auth, admin
│   │   ├── middleware/      # auth, errorHandler
│   │   ├── utils/          # db, response, migrate, seed
│   │   └── types/          # TypeScript types
│   ├── migrations/         # SQL migrations
│   ├── seeds/              # Seed data
│   ├── Dockerfile
│   └── docker-compose.yml
├── .context/               # Hệ điều hành ngữ cảnh AI
├── AGENTS.md               # Điểm vào cho AI
├── mo-ta-app-hai-san-ha-noi.md
└── hai-san-ha-noi.html
```

## Mobile App

| Màn hình | Mô tả |
|---|---|
| Trang chủ | Danh mục, bán chạy, gợi ý |
| Chi tiết sản phẩm | Ảnh, quy cách, số lượng, thêm giỏ/mua ngay |
| Giỏ hàng | Danh sách SP, chọn voucher, tổng tiền |
| Thanh toán | Địa chỉ, thời gian giao, phương thức TT |
| Xác nhận & Theo dõi | Trạng thái đơn, vị trí tài xế |
| Tài khoản | Hồ sơ, đơn mua, ưu đãi, cài đặt |

## Backend API

| Endpoint | Mô tả |
|---|---|
| `GET /api/products` | Danh sách sản phẩm (có filter, search, pagination) |
| `GET /api/products/:id` | Chi tiết sản phẩm + variants |
| `GET /api/categories` | Danh mục |
| `POST /api/orders` | Tạo đơn hàng |
| `GET /api/orders` | Lịch sử đơn hàng |
| `GET /api/orders/:id/track` | Tracking real-time |
| `GET /api/vouchers` | Voucher khả dụng |
| `POST /api/auth/login` | Đăng nhập |
| `POST /api/auth/register` | Đăng ký |
| `GET /api/admin/dashboard` | Dashboard thống kê |
| CRUD `/api/admin/*` | Quản lý products, orders, customers, vouchers |

## Chạy

Chuẩn build workspace (3 chế độ): mẫu [`AppThueNha/README.md`](../AppThueNha/README.md) · rule [`.context/rules/doc/build-van-hanh.md`](.context/rules/doc/build-van-hanh.md).

| Thành phần | Local | Production (sau Caddy) |
|---|---|---|
| API | http://localhost:**3100** | *(Caddy — chưa mô tả đầy đủ trong README này)* |
| Admin | http://localhost:**3101** | *(chưa)* |
| Expo | Metro :**8002** | — |
| Postgres (NOXH) | `localhost:55432` → DB `haisanhanoi` | `noxh-postgres:5432` |
| Redis (NOXH) | `localhost:56379` / **/1** | `noxh-redis:6379/1` |

### 1. Local — dev (npm / pnpm trên host)

Yêu cầu: Docker Desktop + repo **NOXH** cạnh thư mục này (Postgres/Redis dùng chung).

```bash
cd /path/to/VPS/HaiSanHaNoi
npm run start:all              # NOXH infra + API :3100 + Admin :3101 + Expo :8002
npm run start:all -- --no-expo # không bật Expo
npm run status
npm run stop:all
```

Lần đầu cần init DB:

```bash
cd backend && ./scripts/init-shared-db.sh
```

### 2. Local — Docker apps

Yêu cầu: NOXH infra đang chạy (`noxh-postgres` :55432, `noxh-redis` :56379).

```bash
cd backend
./scripts/init-shared-db.sh   # lần đầu: tạo DB haisanhanoi + migrate
docker compose up -d --build  # api :3100, admin :3101
docker compose logs -f api
```

| Service | Port host |
|---|---|
| API | **3100** |
| Admin (nginx) | **3101** |

### Mobile App (Expo)

Metro cố định cổng **8002** (tránh trùng NOXH `:8001`, AppThuêNhà `:8003`).

```bash
npm run start:expo            # từ gốc repo
# hoặc:
cd app && npm start           # expo start --port 8002
```

QR / URL dạng `exp://<IP-LAN>:8002`.

### 3. Production — VPS + Caddy

**Chưa hỗ trợ đầy đủ trong README.** Kỳ vọng: Caddy trên host terminate TLS → proxy API/Admin; không dựng Postgres/Redis riêng. Build app native:

```bash
cd app
npx expo run:ios --configuration Release
npx expo run:android --variant release
```

## Brand

| Token | Giá trị |
|---|---|
| Màu chính | `#078C86` (xanh biển ngọc) |
| Màu tiêu đề | `#123A4A` (xanh đậm) |
| Màu hành động | `#FF7A59` (cam san hô) |
| Font chữ | Be Vietnam Pro + Inter |
| Nền | `#FFFFFF`, `#FAF8F3`, `#EAF8F7` |
