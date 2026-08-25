# rules/code/cong-port.md — Phân bổ cổng workspace VPS

> **Bắt buộc khi chọn/đổi cổng.** Cùng nội dung ở NOXH / AppThueNha / AppBDS /
> HaiSanHaNoi / ShopManager. Đổi bảng này → cập nhật **cả năm** bản copy trong cùng PR/task.

## Mục tiêu

Chạy nhiều dự án song song trên một máy không bị đụng cổng. Cổng trùng = lỗi khó
chẩn đoán (CORS, health check “OK” nhầm app khác, Expo gọi sai API).

## Bảng phân bổ (source of truth)

| Dự án | API | Web / Admin | Expo Metro | Redis DB index |
|---|---|---|---|---|
| **NOXH** | **3000** | Admin **3001** · Website **3002** · Preview **3003** · Mobile Vite **8081** | **8001** | `/0` |
| **HaiSanHaNoi** | **3100** | Admin **3101** | **8002** | `/1` |
| **AppThueNha** (RentManager) | **3200** | Admin **3201** | **8003** | `/2` |
| **AppBDS** (REMP) | **3300** | Web **3301** | **8004** | `/3` |
| **ShopManager** | **3400** | — | — | — |
| **fanpage** | **3500** | — | — | — |

### Shared (không thuộc một app)

| Dịch vụ | Cổng host | Ghi chú |
|---|---|---|
| Postgres `noxh-postgres` | **55432** | Dùng chung — xem `shared-infra.md` |
| Redis `noxh-redis` | **56379** | Dùng chung — mỗi app một DB index |
| Mongo (chỉ AppThueNha) | **57017** | Không dùng cho dự án khác |

## Quy tắc cứng

1. **Cấm** gán API/Web/Expo trùng hàng khác trong bảng trên.
2. **Cấm** dùng cổng mặc định framework nếu đã thuộc dự án khác (`3000` = NOXH API,
   không phải “Next mặc định”).
3. Dự án mới lấy **dải kế tiếp**:
   - API = `3600`, `3700`, … (bước 100)
   - Web/Admin = API + 1 (`3601`, …)
   - Expo Metro = `8005`, `8006`, … (tuần tự)
   - Redis index = `/4`, `/5`, … (chưa dùng)
4. Trước khi đổi cổng: đọc bảng này → cập nhật `.env` / `scripts/lib/common.sh` /
   `package.json` / README / rule môi trường của **đúng** dự án → cập nhật bảng này
   ở **mọi** project.
5. `scripts/lib/common.sh` (`PORT_API`, `PORT_ADMIN`, `PORT_EXPO`) phải khớp bảng;
   không hardcode số lệch nhau giữa script và `.env`.

## Khi nào phải đọc file này

- Thêm dự án / app mới vào workspace VPS
- Đổi `API_PORT`, cổng Next/Vite, Metro Expo
- Viết `start:all` / Docker publish port / Caddy reverse_proxy
- Điều tra “cổng đã bị chiếm” / CORS / Expo không gọi được API
