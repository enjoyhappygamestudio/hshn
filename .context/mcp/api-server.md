# MCP: API Server

## Kết nối

- REST API backend (Node.js / Express hoặc NestJS)
- WebSocket cho real-time tracking
- PostgreSQL database

## Endpoints chính

| Method | Path | Mô tả |
|---|---|---|
| GET | /api/products | Danh sách sản phẩm |
| GET | /api/products/:id | Chi tiết sản phẩm |
| GET | /api/categories | Danh mục |
| POST | /api/orders | Tạo đơn hàng |
| GET | /api/orders | Lịch sử đơn hàng |
| GET | /api/orders/:id/track | Tracking real-time |
| GET | /api/vouchers | Voucher khả dụng |
| POST | /api/auth/login | Đăng nhập |
| POST | /api/auth/register | Đăng ký |

## WebSocket events

| Event | Direction | Payload |
|---|---|---|
| order.status | server → client | { orderId, status, timestamp } |
| driver.location | server → client | { orderId, lat, lng } |
