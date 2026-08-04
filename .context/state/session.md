# Session: 2026-08-04

## Hành động

```
Mã: SHP-09
Mô tả: Tách R2 thành 3 bucket (media/documents/backups) + cơ chế backup tự động
```

## File đã tạo/sửa (2026-08-04)

- `backend/src/config/index.ts` — `config.r2.buckets` (media=ảnh+video, documents, backups; `R2_MEDIA_BUCKET` fallback về `R2_BUCKET` cũ) + `config.backup` (enabled/hourUtc/keepDays)
- `backend/src/services/storage.ts` — thêm `BucketKind`; `uploadBuffer`/`deleteObject` nhận `bucket`; thêm `listObjects`, `copyObject`, `getObject` (phục vụ backup)
- `backend/src/services/backup.ts` — **file mới**: `dumpDatabase` (dump toàn bộ bảng → gzip JSON), `restoreDatabase`, `runBackup` (DB dump + snapshot media/documents sang backups + prune cũ), `startBackupScheduler` (1 lần/ngày theo `BACKUP_HOUR_UTC`, giữ `BACKUP_KEEP_DAYS`)
- `backend/src/index.ts` — gọi `startBackupScheduler()` sau khi start server
- `backend/src/routes/admin/index.ts` — video/ảnh upload & delete gắn bucket `media`; **thêm** `POST /admin/upload/document` (bucket `documents`, key `documents/<ngày>/...`, PDF/Word/Excel/TXT/CSV ≤20MB); **thêm** `POST /admin/backups` (chạy backup thủ công)
- `backend/src/scripts/backup.ts` + `restore.ts` — **file mới**: backup/restore thủ công qua CLI
- `backend/package.json` — thêm script `backup`, `backup:restore`
- `backend/.env` + `.env.example` — `R2_MEDIA_BUCKET=hsb-media`, `R2_DOCUMENTS_BUCKET=hsb-documents`, `R2_BACKUPS_BUCKET=hsb-backups`, `BACKUP_ENABLED=false`, `BACKUP_HOUR_UTC=3`, `BACKUP_KEEP_DAYS=30`
- `backend/docker-compose.yml` — thêm env mới vào service api

## Test (2026-08-04)

- `npm run build` backend pass (tsc, không lỗi type)

## Khi có key R2 (todo)

- Tạo 3 bucket trong Cloudflare dashboard: **hsb-media**, **hsb-documents**, **hsb-backups** (chưa tạo — trả lời câu hỏi "đã chia bucket chưa": chưa, chỉ mới code)
- Điền `R2_ENABLED=true` + key + `R2_PUBLIC_URL` vào `backend/.env` → `docker compose up -d --build api`
- Bật backup: `BACKUP_ENABLED=true`; chạy thử `npm run backup`; restore thử `npm run backup:restore -- db/<key>.json.gz` (lưu ý: restore TRUNCATE + INSERT theo thứ tự bảng dump, chưa xử lý phức tạp FK)

# Session: 2026-08-03

## Hành động

```
Mã: SHP-08
Mô tả: Chuyển upload ảnh & video sang Cloudflare R2 (code xong, chờ key)
```

## File đã tạo/sửa (2026-08-03)

- `backend/package.json` — thêm `@aws-sdk/client-s3`
- `backend/src/services/storage.ts` — **file mới**: `uploadBuffer` (R2 PutObject hoặc fallback local `/uploads/...`), `deleteObject`, `publicUrl`, `keyFromUrl`, `safeFilename`
- `backend/src/config/index.ts` — thêm `config.r2` (enabled/endpoint/accountId/accessKeyId/secretAccessKey/bucket/publicUrl)
- `backend/.env` + `.env.example` — thêm block `R2_*` (mặc định `R2_ENABLED=false`)
- `backend/docker-compose.yml` — thêm env `R2_*` vào service api
- `backend/src/routes/admin/index.ts` — multer đổi `diskStorage` → `memoryStorage`; video upload ghi lên R2 (key `videos/...`); PUT/upload + DELETE video tự xóa object cũ (best-effort); thêm endpoint `POST /admin/upload/image` (key `images/...`, giới hạn 10MB, JPG/PNG/WebP/GIF)
- `backend/admin/app.js` — chọn ảnh sản phẩm giờ **upload lên R2** qua `/admin/upload/image` (trả URL) thay vì nhúng base64 vào DB

## Test (2026-08-03)

- Với `R2_ENABLED=false` (fallback local): `POST /api/admin/upload/image` → `/uploads/images/...` (file có trong container, GET qua nginx 5050 + api 4000 đều 200); video upload → `/uploads/videos/...` OK. Đã xóa data test.
- Build backend + Docker rebuild api & admin OK.

## Khi có key R2

- Điền vào `backend/.env` + export qua shell khi `docker compose up`: `R2_ENABLED=true`, `R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (r2.dev hoặc domain) → rebuild `docker compose up -d --build api`
- File cũ đang nằm local trong volume `api_uploads` (xem `docker exec haisanhanoi-api ls /app/uploads/videos`), URL trong DB là `/uploads/...` — **chưa backfill tự động**, cần script migrate nếu muốn chuyển hết sang R2 (ghi chú tồn đọng).
- App không cần đổi: đã hỗ trợ URL tuyệt đối http/https cho video & ảnh.

# Session: 2026-08-03

## Hành động

```
Mã: SHP-07
Mô tả: Tách Docker thành 4 container riêng: api, admin, db, redis
```

## File đã tạo/sửa (2026-08-03)

- `backend/admin/Dockerfile` — **file mới**: nginx:alpine phục vụ web admin (index.html/app.js/styles.css)
- `backend/admin/nginx.conf` — **file mới**: root admin + proxy `/api` & `/uploads` → api:4000, client_max_body_size 100m
- `backend/Dockerfile` — bỏ `COPY --from=builder /app/admin ./admin` (admin tách riêng, image api gọn hơn)
- `backend/src/app.ts` — bỏ block "Serve admin frontend" (route `/admin` static + fallback) — giờ API thuần, `/admin/` trả 404
- `backend/docker-compose.yml` — 4 service: `api` (4000, có `REDIS_URL`, depends_on db+redis healthy), `admin` (nginx **5050**:80, depends_on api), `db` (5432, giữ nguyên init scripts), `redis` (redis:7-alpine, **6379**, appendonly, volume redis_data, healthcheck)
- `backend/.env.example` — thêm `REDIS_URL=redis://localhost:6379`
- `backend/src/config/index.ts` — thêm `redisUrl`
- `app/src/constants/config.ts` — API_BASE_URL dev → `https://filme-highways-asset-rendering.trycloudflare.com/api`
- `URLS.md` — cập nhật cấu trúc 4 container + URL mới

## Trạng thái (2026-08-03)

- 4 container chạy: api 4000, admin 5050 (nginx), db 5432, redis 6379 (PONG)
- Verify: `api/health` 200, `api/admin/` 404 (đã tách), `admin/` + `admin/admin/` 200, `admin/api/categories` 200 (nginx proxy), `uploads` proxy 404 từ api
- Cloudflare tunnel (PID 95624) trỏ **admin 5050**: `https://filme-highways-asset-rendering.trycloudflare.com` — 1 URL dùng cho cả web admin lẫn API
- Expo: `--tunnel --port 8082` → `exp://f5mi5k0-anonymous-8082.exp.direct`
- Port 5000 bị macOS AirPlay chiếm → admin dùng 5050

# Session: 2026-08-03

## Hành động

```
Mã: SHP-06
Mô tả: Mở lại app + web, cập nhật URL tunnel
```

## File đã sửa (2026-08-03)

- `app/src/constants/config.ts` — `API_BASE_URL` dev đổi sang `https://jewelry-grant-simpsons-pump.trycloudflare.com/api`
- `URLS.md` — cập nhật URL mới (admin/API/Expo)

## Trạng thái (2026-08-03)

- Cloudflare tunnel mới: `https://jewelry-grant-simpsons-pump.trycloudflare.com` (PID 78885) — API + admin đều 200
- Expo dev server: `--tunnel --port 8082` (PID 79008, 8081 bị container noxh-mobile chiếm) — tunnel `exp://f5mi5k0-anonymous-8082.exp.direct`

# Session: 2026-08-01

## Hành động

```
Mã: SHP-05
Mô tả: Chỉnh danh mục + hiển thị biến thể + bỏ nhãn tươi sống
```

## File đã tạo/sửa (2026-08-01)

- `backend/migrations/012_categories.sql` — **file mới**: đổi tên "Khô hải sản"→"Hải Sản Khô", xóa danh mục "Cua, ghẹ" & "Bạch tuộc, mực" (0 sản phẩm), thêm "Hải sản cấp đông" (🧊, sort_order 5, reuse id ...005). Đã áp psql + thêm vào docker-compose init.
- `backend/seeds/seed.sql` — cập nhật danh mục theo migration 012 (bỏ 2 danh mục cũ, đổi tên, thêm cấp đông)
- `backend/docker-compose.yml` — thêm `012_categories.sql` vào initdb
- `backend/src/routes/products.ts` — thêm public `GET /api/products/:id/variants` (trước chỉ có bản admin → app gọi `/variants` 404 → màn chi tiết không bao giờ load được biến thể)
- `app/src/services/api.ts` — `mapProduct` đọc `p.variants` (fallback `p.product_variants`) thay vì chỉ `p.product_variants` (detail API trả tên field `variants` → trước đây variants bị bỏ)
- `app/src/screens/ProductDetailScreen.tsx` — lấy biến thể từ `p.variants` của detail (bỏ gọi `fetchProductVariants` 404); click biến thể → đổi price đã có sẵn
- `app/src/components/ProductCard.tsx` — bỏ badge "Tươi" (isFresh) trên card
- `app/src/screens/ProductDetailScreen.tsx` — bỏ chip "Tươi sống trong ngày / Sản phẩm khô" + styles chip/chipPulse/chipText

## Test (2026-08-01)

- `/api/categories` trả 5 danh mục đúng tên/icon; 2 danh mục cũ đã xóa
- `GET /api/products/:id` trả `variants` đủ; `GET /api/products/:id/variants` 200
- Backend build + Docker rebuild OK; typecheck app pass

## Ghi chú

- Mục 2: nguyên nhân variants không hiển thị — (1) app gọi `/products/:id/variants` không tồn tại public; (2) `mapProduct` đọc `product_variants` nhưng detail trả `variants`. Đã sửa cả 2.
- Mục 3: bỏ hiển thị "Tươi sống mỗi ngày" trên ProductCard (badge Tươi) và ProductDetailScreen (chip). Data `is_fresh` vẫn giữ ở DB.

# Session: 2026-07-31

## Hành động

```
Mã: SHP-02
Mô tả: Trang theo dõi đơn hàng map thật + dữ liệu live AhaMove
```

## Hành động (tiếp)

```
Mã: SHP-03
Mô tả: Nút hủy đơn (hủy luôn đơn vận chuyển AhaMove)
```

## Hành động (hoàn thành)

```
Mã: SHP-04
Mô tả: Quy trình xác nhận của admin — khách đặt → đơn 'pending' → alert admin → admin xác nhận đủ hàng → mới gọi AhaMove tạo đơn vận chuyển
```

## File đã tạo/sửa

- `backend/src/services/carrier.ts` — thêm `decodePolyline` (Google polyline → points); mở rộng `CarrierTrackResult` + `AhaMoveCarrier.trackOrder` trả pickup/delivery (lat/lng/address), route (đã decode ~230 điểm), driver (supplier_id/name/phone/rating), accept, shareLink, trackingCode, distanceKm, durationSec, timestamps (accepted/boarded/pickedUp/completed)
- `backend/src/routes/orders.ts` — `GET /:id` và `GET /:id/track` nhận **code HOẶC id** (cast `o.id::text`); track endpoint thêm authenticate + filter theo customer, trả payload chuẩn + `live` (gọi trackShipOrder AhaMove) + `liveError` + timeline order_tracking
- `app/src/types/index.ts` — Order thêm `address` + `shippingTrackingCode`; thêm `TrackPoint`, `CarrierLive`, `OrderTrackingPayload`
- `app/src/services/api.ts` — `mapOrder` map address_snapshot + shipping_tracking_code; `fetchOrderTracking` trả `OrderTrackingPayload`
- `app/src/screens/TrackingScreen.tsx` — **viết lại hoàn toàn**: map Leaflet thật (WebView, tiles OSM) với marker cửa hàng/điểm giao, polyline route AhaMove, marker tài xế 🛵 di chuyển theo tiến độ (nội suy trên route), auto-fit bounds; poll tracking mỗi 15s; steps động theo status; card tài xế (tên/rating/gọi điện); nút "Xem bản đồ trực tiếp" mở shareLink AhaMove; card đơn hàng (code, mã vận chuyển, tổng tiền, địa chỉ); timeline lịch sử
- `app/src/screens/CheckoutScreen.tsx` — truyền `order.code` sang Success
- `app/src/screens/SuccessScreen.tsx` — hiện mã đơn thật, truyền orderCode sang Tracking
- `backend/src/services/carrier.ts` — thêm `cancelOrder` cho `CarrierService` (optional) + AhaMove `DELETE /v3/orders/<id>` với `comment`; thêm helper `cancelShipOrder`
- `backend/src/routes/orders.ts` — thêm `POST /api/orders/:id/cancel` (auth, nhận code/id): chỉ hủy khi status confirmed/preparing; hủy đơn AhaMove trước, nếu lỗi thì chặn (400); set status=cancelled + ghi order_tracking
- `backend/src/routes/orders.ts` — cancel chặn phía server: kiểm tra live trạng thái AhaMove, chỉ cho hủy khi **chưa có tài xế nhận** (`live.driver` null) và status thuộc ASSIGNING/IDLE/CONFIRMING/PAYING; nếu có tài xế → 400 "Đã có tài xế nhận đơn, không thể hủy"
- `app/src/services/api.ts` — thêm `cancelOrder(orderId, reason?)`
- `app/src/screens/TrackingScreen.tsx` — nút "Hủy đơn hàng" (viền đỏ) chỉ hiện khi đơn confirmed/preparing **và chưa có tài xế nhận** (ASSIGNING), xác nhận bằng Alert, gọi cancelOrder + reload; ẩn khi có tài xế/đã hủy/giao
- `backend/migrations/008_order_pending_status.sql` — thêm `'pending'` vào `orders_status_check` (đã áp manual qua psql)
- `backend/src/services/orderShipping.ts` — **file mới**: `createShippingForOrder(orderId)` — đọc order + partner active; nếu đã có `shipping_tracking_code` thì bỏ qua; build request giống cũ (COD fallback 0 khi lỗi COD trên staging); update shipping_carrier/tracking_code/status='created'/fee + ghi order_tracking `shipping_created`
- `backend/src/routes/orders.ts` — POST tạo đơn với **status='pending'**, bỏ gọi AhaMove ngay; ghi order_tracking `pending` "Đơn hàng đang chờ cửa hàng xác nhận"; cancel endpoint mở thêm `pending` (khách hủy được khi chưa tạo vận chuyển)
- `backend/src/routes/admin/index.ts` — thêm `GET /orders/pending-count`, `POST /orders/:id/confirm` (chỉ khi pending; gọi `createShippingForOrder` → nếu lỗi set `shipping_error` + order_tracking `shipping_failed` + 502; thành công set `confirmed`), `POST /orders/:id/reject` (chỉ khi pending; set `cancelled` + ghi lý do); `PUT /orders/:id/status` thêm status 'pending' + tự tạo shipping khi set confirmed
- `backend/admin/app.js` — badge `orders-badge` trên sidebar Đơn hàng; `pollPendingOrders` (10s, poll `/admin/orders/pending-count`, beep + toast + `Notification` khi count tăng); `statusBadge`/filter thêm `pending`; `renderOrders` hiển thị 🔔 + nút "✓ Xác nhận"/"✕ Từ chối" cho từng dòng pending; `confirmOrder`/`rejectOrder` (gọi API, toast kết quả, về detail)
- `app/src/types/index.ts` — `OrderStatus` thêm `'pending'`
- `app/src/screens/OrderListScreen.tsx` — STATUS_LABELS/COLORS thêm `pending: 'Chờ xác nhận'` (amber)
- `app/src/screens/TrackingScreen.tsx` — steps: `pending` → bước "Chờ xác nhận" active; etaText: "Chờ cửa hàng xác nhận đơn hàng"; canCancel thêm `pending`

## Quyết định

- AhaMove **không có GPS tài xế liên tục** qua API → map app nội suy vị trí tài xế dọc route từ timestamps (accepted→pickup, boarded→delivery), poll trạng thái 15s; khi staging không có tài xế (ASSIGNING) hiện marker tài xế tại cửa hàng + banner "Đang tìm tài xế"
- Bản đồ live thật do AhaMove cung cấp qua `share_link` → thêm nút mở ngoài

## Vấn đề còn tồn đọng

- **Rà soát payload gửi AhaMove (đã audit 2026-07-31)**: (1) items `price:0` — order.items có price nhưng `orderShipping` bỏ price; (2) lat/lng fallback trung tâm HN khi snapshot thiếu coords (bằng chứng DB: 26KHBZMN `599 thụy khuê`, 26H1IKN7 `Số 12, Nguyễn Trãi` không có coords → pin sai); (3) COD = `order.total` gồm cả phí ship (nên là subtotal−discount); (4) `order_time:0` + `group_service_id:'BIKE'` cố định bỏ qua delivery_date/mode; (5) weight hardcode 1kg/sp. **ĐÃ SỬA HẾT 2026-07-31 (xem Ghi chú mục cuối).** AhaMove staging không cho xem chi tiết đơn (403 DENY_ACCESS_ORDER_DETAIL).
- Khi có key production, cần đổi `AHAMOVE_API_URL=https://partner-api.ahamove.com` và đăng ký account production
- Sản phẩm chưa có cột weight → mặc định 1kg/sản phẩm khi tạo đơn carrier
- Checkout mặc định chọn partner đầu tiên (Be) — Be chưa có tích hợp carrier, phải chọn AhaMove mới tạo đơn thật
- Webhook AhaMove hiện mới ghi order_tracking, chưa cập nhật `orders.shipping_status` (app poll trực tiếp AhaMove nên không bị ảnh hưởng)
- Map dùng Leaflet CDN + tile OSM public — với production nên cân nhắc tile server riêng (chính sách OSM) hoặc Google Maps
- AhaMove chỉ hủy được ở trạng thái IDLE/ASSIGNING/ACCEPTED/CONFIRMING/PAYING — khi tài xế đã lấy hàng, hủy local sẽ bị chặn kèm lỗi từ API

## Ghi chú

- Xác minh render map bằng Chrome headless: tiles OSM load, polyline + 3 marker đều có trong DOM
- `GET /api/orders/HSHN-260731-47293/track` trả live: status ASSIGNING, route 230 điểm (điểm đầu = pickup, điểm cuối ≈ delivery), shareLink https://expressstg.ahamove.com/s/2607317C65FM
- Test hủy end-to-end: tạo `HSHN-260731-39486` (AhaMove `26D0LDU7`, ASSIGNING) → `POST /orders/HSHN-260731-39486/cancel` → order cancelled + AhaMove CANCELLED + timeline ghi nhận; hủy lại lần 2 bị chặn 400
- Test sau khi giới hạn "chưa có tài xế": tạo `HSHN-260731-84878` (ASSIGNING) → hủy OK, AhaMove CANCELLED; nhánh chặn khi có tài xế (`live.driver` tồn tại) chưa test được trên staging vì không có tài xế thật nhận đơn
- **Test SHP-04 end-to-end (đã pass)**: tạo đơn `HSHN-260731-65949` → status `pending`, chưa gọi AhaMove; `pending-count` = 1; admin confirm → status `confirmed`, AhaMove `26H1IKN7` fee 41000, track trả live ASSIGNING; tạo `HSHN-...` (payment `card`) → admin reject → `cancelled`, không tạo AhaMove; `pending-count` = 0; khách hủy đơn pending (`ba463e6f`) → `cancelled` OK
- Backend đã rebuild + deploy Docker (`docker compose up -d --build api`); typecheck pass cả app lẫn backend
- **Fix bug admin order detail**: (1) `renderOrderDetail` trước đây fetch `/admin/orders?limit=1` + `find` → chỉ đúng khi đơn là mới nhất, đơn cũ hiện sai số tiền của đơn khác → thêm endpoint `GET /admin/orders/:id` và dùng nó; (2) địa chỉ không hiển thị vì đọc `address_snapshot.full_address` nhưng snapshot là `{name, phone, full}` → sửa thành `.full` + hiện tên/SĐT người nhận. Đã rebuild + test API OK.
- **Fix admin "Thông tin giao hàng"**: chỉ phân biệt `hoatoc` vs còn lại → `express2h`/`interprovince` hiển thị sai "Hẹn giờ" → map đủ 4 mode (hoatoc=⚡ Hỏa tốc, express2h=🚀 Giao 2-4h, interprovince=🚛 Liên tỉnh, appointment=📅 Hẹn ngày giao). Đã rebuild.
- **Fix bug màn theo dõi đơn hàng (app)**: `GET /api/orders/:id` khi gọi bằng **code** thì query order OK nhưng query `order_tracking WHERE order_id = $1` truyền code vào cột uuid → lỗi `invalid input syntax for type uuid` → app `fetchOrderDetail(code)` fail (order=null → total hiện 0đ, không có nút hủy), trong khi `loadTracking` (cùng code) thành công và clear error nên màn hình vẫn render. Fix: dùng `result.rows[0].id` cho tracking query. Đã rebuild + test: `GET /orders/HSHN-260731-65949` trả total 280000 + timeline 4 mốc.
- **Đổi thông tin shop AhaMove** (`.env`, `.env.example`, `config/index.ts` default): `AHAMOVE_MOBILE=0936141757`, `AHAMOVE_SHOP_PHONE=0936141757`, `AHAMOVE_SHOP_ADDRESS=47 ngõ 16 Phan Văn Trường, Cầu Giấy, Hà Nội`. Đã rebuild + xác nhận env trong container. (`normalizePhone` tự đổi 0→84 khi gửi AhaMove.)
- **VideoPlayerScreen**: thêm tính năng **tap 2 lần** vào màn hình để tạm dừng/phát video (phân biệt với tap 1 lần = toggle UI qua timer 300ms; hiện overlay ⏸/▶ animation). Reset paused khi đổi video. Typecheck pass.
- **Default checkout**: `checkoutStore` — `delivery.mode` mặc định `express2h` (Giao 2-4h), `paymentMethod` mặc định `cod` (reset cũng về giá trị này); `CheckoutScreen` — mặc định chọn đơn vị **AhaMove** (find theo tên, fallback `partners[0]`) thay vì partner đầu tiên. Typecheck pass.
- **Date picker Hẹn ngày giao**: thay Alert 14 ngày bằng Modal chọn **Ngày/Tháng/Năm** (3 cột scroll, Năm hiện tại→+5; tự clamp ngày cuối tháng, vd 31/2→28/2). Typecheck pass. — Đã nhỏ nút "Ngày giao" thành pill (padding 6/12, radius 8, font 11) bằng các mốc khung giờ.
- **Phí ship thực tế từ API**: `/shipping/partners` gọi carrier API với `fromLat/fromLng` (shop AhaMove 21.0324,105.7975) → `toLat/toLng` (địa chỉ nhận); `simulateFee` cũng đo từ shop. `CheckoutScreen` geocode địa chỉ nhận (expo-location) + weight theo giỏ hàng → gọi API; lưu `lat/lng` vào `address_snapshot`; `orderShipping` tạo AhaMove dùng tọa độ thật. Config mới `AHAMOVE_SHOP_LAT/LNG`. Test: Long Biên 52k, gần shop 16k (`isReal:true`).
- **Hiển thị phí ship theo lựa chọn**: bỏ tự chọn AhaMove khi vào màn hình; `currentShipFee()` trả 0 khi chưa chọn đơn vị (hết fee mặc định 20k/35k); dòng "Phí giao hàng" chỉ hiện sau khi chọn đơn vị (tích thời gian giao + đơn vị); summary "Phí giao hàng"/"Tổng thanh toán" hiện "—" khi chưa chọn; đơn vị chưa tích hợp API (`isReal:false`) ẩn fee + label "Chưa tích hợp API đặt ship" + disabled (opacity 0.5); `handlePlaceOrder` chặn nếu chưa chọn đơn vị (`partnerWarn`). Typecheck pass.
- **Phí ship theo thời gian giao**: mode `hoatoc` ×1.5 (làm tròn 1.000đ) so với `express2h`/khác. `effFee(partner)` dùng cho hiển thị danh sách + lưu `customShipFee`; có effect tự cập nhật fee khi đổi mode sau khi chọn đơn vị; thêm ghi chú "Giao hoả tốc — phí ship cao hơn 50%". Typecheck pass.
- **Gọi API lấy phí khi chọn đơn vị**: `/shipping/partners` mặc định `with_fee=0` → không gọi carrier API (fee=0, `isReal` tính từ active carriers); khi chọn đơn vị → app gọi `POST /shipping/calculate` (có `fromLat/fromLng` shop) → lưu `baseFee`, `selectedFee=effFee(baseFee)` theo mode, feeLoading hiện "Đang tính phí..."; chọn đơn vị khác dùng `feeReqRef` chống stale response; đổi địa chỉ reset selection+fee; `handlePlaceOrder` chặn khi chưa có fee (`partnerOk = selectedPartner && baseFee && !feeLoading`). Test: list no-fee OK, AhaMove calculate 57k, Be (không API) trả [] → hiện "Chưa tích hợp API đặt ship". Typecheck pass.
- **Tự tính phí khi mở màn hình + tính lại khi đổi mode**: mở màn hình mặc định chọn **AhaMove** (giao 2-4h `express2h`) → gọi `/shipping/calculate` ngay để hiện phí ban đầu; effect theo `delivery.mode` (`prevModeRef` bỏ lần đầu) → khi chuyển sang **hoả tốc** (hoặc đổi mode bất kỳ) gọi lại API tính phí cho đúng, `effFee` ×1.5 áp cho hoatoc; `loadFee(partner, lat, lng)` dùng chung cho auto-select/select/mode-change. Typecheck pass.
- **Fix phí giao hàng hiện 0đ**: nguyên nhân component subscribe `useCheckoutStore((s) => s.currentShipFee)` (hàm ổn định) → không re-render khi `customShipFee` thay đổi → hiển thị 0đ vĩnh viễn. Đã bỏ subscribe đó; hiển thị dùng `selectedFee` local (`shipFeeToDisplay = selectedFee ?? 0`, `total` cộng `selectedFee`) — re-render theo `baseFee` state; vẫn giữ sync effect `setCustomShipFee` để `handlePlaceOrder` đọc store đúng lúc submit. Typecheck pass.
- **Fix phí sai địa chỉ (đơn 599 Thụy Khuê 37k thay vì 22k)**: nguyên nhân "599 thụy khuê" không geocode được → rơi về tọa độ mặc định trung tâm HN (21.0285,105.8542) → AhaMove tính 37k; coords thật (21.043,105.822) chỉ 22-24k. Đã sửa: (1) backend `/shipping/calculate` chỉ tính phí khi `toLat/toLng` là số, thiếu → trả `[]`; (2) app tạo `utils/geocode.ts` geocode với suffix ", Hà Nội, Việt Nam" + fallback **Nominatim** (test OK: "599 thụy khuê" → 21.0430646,105.8218397); (3) `geoFailed` state → chặn đặt hàng khi không xác định được vị trí, cảnh báo rõ ràng; (4) phân biệt message "Không xác định được vị trí giao hàng" vs "Chưa tích hợp API đặt ship". Typecheck pass.
- **Màn Địa chỉ giao hàng (AddressScreen)**: xác định vị trí địa chỉ trên bản đồ rõ ràng — dùng chung util `geocodeAddress` (expo-location + Nominatim fallback, tự nối Hà Nội); 4 trạng thái `idle|loading|found|failed` với UI tương ứng ("Đang tìm vị trí..." / "✓ Đã xác định vị trí trên bản đồ" / "✕ Không xác định được vị trí. Nhập đầy đủ số nhà, phường/quận, Hà Nội." / chờ nhập); map OSM marker theo tọa độ tìm được; **chặn Lưu** khi address không rỗng mà `geoStatus=failed` (Alert hướng dẫn). Đã rename local `geocodeAddress`→`findLocation` để tránh shadow import. Typecheck pass.
- **Đổi form địa chỉ sang nhập cấu trúc + lấy toạ độ (AddressScreen)**: bỏ kiểu nhập text tự do + gợi ý Nominatim. Form mới: Thành phố (Hà Nội cố định) → **Quận/Huyện** (picker modal 30 quận/huyện) → **Phường/Xã** (picker modal lọc theo quận, 579 phường/xã) → **Đường/Phố** (autocomplete local 13.950 tên đường nội thành, không cần mạng) → **Số nhà** (text). Tự ghép địa chỉ đầy đủ → `geocodeAddress` (expo-location + Nominatim) → marker bản đồ + trạng thái ✓/✕; hiển thị preview địa chỉ đã ghép. Chặn Lưu khi thiếu quận/phường/đường hoặc geocode fail. **Dữ liệu**: `app/src/data/hanoi-admin.json` (30 quận + 579 phường/xã, nguồn Tổng Cục Thống Kê qua package `hanhchinhvn`) + `app/src/data/hanoi-streets.json` (13.950 đường/ngõ, lọc từ OSM bbox nội thành, bỏ quốc lộ/tỉnh lộ/đường mòn), import qua `app/src/data/hanoi.ts`. Prefill tự parse địa chỉ đã lưu (tách số nhà khỏi đường). Typecheck pass.
- **Fix "nhập đầy đủ vẫn không xác định được vị trí"**: Nominatim **không geocode được** địa chỉ dài cấu trúc "Số 12, Ngõ 88 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội" (NOT FOUND) nhưng geocode được dạng rút gọn "Ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội". Đã sửa `utils/geocode.ts::geocodeAddress` → sinh **các biến thể rút gọn dần** rồi thử lần lượt qua expo-location rồi Nominatim (`countrycodes=vn`); trả kết quả đầu tiên tìm được.
- **Fix lần 2 cùng bug (599 Thuỵ Khuê, Tây Hồ)**: `buildVariants` ban đầu dùng **index cố định** [số nhà, đường, phường, quận] → khi không có số nhà riêng ("599 Thuỵ Khuê" là cả đường) thì sinh biến thể sai ("Bưởi, Tây Hồ..." → NOT FOUND). Đã viết lại bằng **`splitRoles`**: nhận diện vai trò theo pattern (số nhà = "Số 12"/số thuần; phường = "Phường/Xã"; quận = "Quận/Huyện"; đường = chứa "Phố/Đường/Ngõ/Ngách/Hẻm/Kiệt"; fallback phần còn lại). Sinh biến thể theo thứ tự: đầy đủ → bỏ số nhà → bỏ phường → **street+quận** → chỉ street → bỏ tiền tố → chuẩn hóa bỏ dấu → raw. Test thật: "599 Thuỵ Khuê, Phường Bưởi, Quận Tây Hồ, Hà Nội" → variant "599 Thuỵ Khuê, Quận Tây Hồ, Hà Nội" (21.04031) / "599 Thuỵ Khuê, Tây Hồ, Hà Nội" (21.04306); trường hợp Trần Duy Hưng vẫn ra ("Ngõ 88 Trần Duy Hưng, Quận Cầu Giấy, Hà Nội").
- **Fix nhập thường/không dấu**: Nominatim geocode được chữ thường và không dấu, nhưng autocomplete đường local thì không (so dấu chính xác). Đã thêm `stripDiacritics`/`normalizeVietnamese` trong `utils/geocode.ts`; `buildVariants` thêm các biến thể chuẩn hóa (bỏ dấu + lowercase) cho bộ street+district; `hanoi.ts` export `HANOI_STREETS_NORM`; AddressScreen filter theo norm → gõ "thuy khue" vẫn gợi ý "Đường Thụy Khuê". Test: "599 thuy khue, phường bưởi, quận tây hồ, hà nội" → variant "599 thuy khue, quận tây hồ, hà nội" (21.04158) / "599 thuy khue, tay ho, hà nội" (21.04306) đều ra. Typecheck pass.
- **Fix "app vẫn báo không tìm thấy địa chỉ"**: nguyên nhân thật — **Nominatim trả HTTP 403** với User-Agent `okhttp/3.12.1` mà React Native (Android) gửi mặc định → trên Android mọi request Nominatim đều fail ⇒ `geocodeAddress` trả null ⇒ map báo không tìm thấy. (Test: curl `-A "okhttp/3.12.1"` → 403; `CFNetwork`/default → 200.) Đã sửa `utils/geocode.ts`: (1) thêm geocoder dự phòng **Photon** (`photon.komoot.io/api` — không chặn UA, test okhttp 200; lưu ý `lang=vi` gây 400 nên bỏ); (2) thêm `User-Agent: HaiSanHaNoiApp/1.0` cho Nominatim; (3) thứ tự thử mỗi biến thể: **expo-location → Android: Photon** (skip Nominatim vì chắc chắn 403) / **iOS: Nominatim → Photon**. Photon chính xác cấp phố (vd "Ngõ 88 Đường Trần Duy Hưng", "2B ngõ 396 Thụy Khuê" → 21.0469,105.8117) — đủ dùng tính phí. Typecheck pass.
- **Sửa payload gửi AhaMove cho đầy đủ (2026-07-31)**: (1) **items price** — `CarrierOrderRequest.items` thêm `price?`; `orderShipping` chuyển `i.price` từ order.items; AhaMove `createOrder` gửi `price: i.price || 0` (bỏ hardcode 0). (2) **Chặn thiếu tọa độ/phone** — bỏ fallback trung tâm HN: `orderShipping` throw `Thiếu tọa độ địa chỉ giao hàng`/`Thiếu số điện thoại người nhận hợp lệ` → admin confirm trả 502 + ghi `shipping_error`. (3) **COD** = `subtotal − discount` (tiền hàng), không gồm phí ship. (4) **order_time** — `computeOrderTime`: mode `appointment` + delivery_date/slot → epoch giây (+07:00, giờ bắt đầu khung, vd `2026-08-05`+`08-10` → 1785891600); các mode khác `0`. (5) **weight thật** — migration `009_product_weight.sql` thêm `products.weight NUMERIC(6,2) DEFAULT 1` (đã áp psql + thêm vào docker-compose init); app `Product.weight?`/`CartItem.weight?` (addItem lưu `product.weight||1`), `cartWeight = sum(qty×weight)` (thay công thức cũ sum(qty)×0.5), order items gửi `weight`, admin form sản phẩm thêm ô "Cân nặng (kg)", admin products POST/PUT nhận `weight`, seed demo đã set weight (1/0.5kg) + cập nhật DB. **Test**: đơn không coords → confirm 502 "Thiếu tọa độ"; đơn đủ coords + appointment → confirm OK, AhaMove `26LSZLTL` fee 24k (4kg), COD=200000 không rơi vào fallback; calculate 4kg→24k / 0.5kg→22k. Đã rebuild backend Docker; typecheck app + build backend pass.
- **Thêm "Chi tiết đơn hàng" vào TrackingScreen (2026-07-31)**: card mới giữa card đơn hàng và timeline — map `order.items` → từng dòng tên (kèm variant) + số lượng + thành tiền (`price×quantity`), divider, rồi Tạm tính (`subtotal`) / Giảm giá (`-discount`, màu đỏ, chỉ hiện khi >0) / Phí giao hàng (`shippingFee`, chỉ hiện khi >0) / **Tổng cộng** (`total`, đậm màu primary). Dùng `formatMoney`; ẩn toàn bộ card khi `order.items` rỗng. Thêm styles mới `itemsCard/itemsTitle/itemRow/itemInfo/itemName/itemQty/itemPrice/totalsDivider/totalRow/totalLabel/totalValue/totalDiscount/totalLabelStrong/totalValueStrong`. Typecheck pass (lint: eslint chưa cài trong node_modules).
- **Nút "🔄 Đặt lại" trên TrackingScreen (2026-07-31)**: `handleReorder` — clear cart rồi map từng `OrderItem` thành `Product` (id/name/price/unit/shop mặc định/emoji rỗng, `images` từ `it.image`) + `cart.addItem(product, variant, quantity, image)` cho từng sản phẩm, rồi `navigation.navigate('Cart')`. Nút chỉ hiện khi `order.items` không rỗng (`canReorder`); style viền primary + nền mint, đặt trong sticky bar trên nút "Về trang chủ". Typecheck pass.
- **Log AhaMove API (2026-07-31)**: `backend/src/services/carrier.ts` — thêm `console.log` vào mọi request AhaMove: `getToken` log body + status/raw response; `call` log `METHOD /v3<path> body=<JSON>` trước khi gửi và `status=<code> res=<raw JSON>` sau khi nhận (kể cả khi refresh token NOT_AUTHORIZED). Dùng `res.text()` rồi JSON.parse để log đầy đủ raw response (trước đây chỉ `res.json()`). **Xem log**: `docker logs -f haisanhanoi-api`. Ví dụ log track đơn hủy 26TZIJVM cho thấy AhaMove trả đủ items (price 189000), path pickup/dropoff (lat/lng/address/mobile/cod), package_detail weight=1 — payload gửi đã đủ. Đã build backend + rebuild Docker `haisanhanoi-api`.
- **Xác nhận đơn gửi AhaMove thành công (2026-07-31)**: log cho thấy đơn `HSHN-260731-76534` (KH 0903762388, 599 Thụy Khuê) → app `POST /api/orders` 201 → admin confirm → AhaMove tạo `26DRBY1B` (ASSIGNING, fee 31k, tracking `2607313KPBXM`) → app poll `GET /api/orders/HSHN-260731-76534` + `/track` 200. **Lưu ý**: vẫn đang dùng AhaMove **staging** (`partner-apistg.ahamove.com`) nên đơn chỉ hiện ở app staging (`expressstg.ahamove.com`), app tài xế thật không nhận. Chuyển production cần key production (chưa có).
- **AhaMove lên đầu danh sách đơn vị giao hàng (CheckoutScreen, 2026-07-31)**: sau khi `fetchShippingPartners` trả về, sort để `AhaMove` đứng đầu (`sort` theo `name.toLowerCase().includes('ahamove')` giảm dần, các đơn vị khác giữ thứ tự cũ) trước khi `setShippingPartners` — vừa hiển thị lên đầu vừa khớp mặc định chọn AhaMove. Typecheck pass.
- **Disable tạm Ví điện tử & Thẻ ngân hàng (CheckoutScreen, 2026-07-31)**: `PAYMENT_OPTIONS` thêm `disabled: true` cho `wallet` và `card` (COD giữ `disabled: false`); render chặn `onPress`/`disabled`, áp style mờ `partnerDisabled`, thêm nhãn "Sắp mở". Store mặc định `paymentMethod: 'cod'` nên không bao giờ rơi vào phương thức đang disable. Typecheck pass.
- **Fix lỗi `navigation.jumpTo is not a function` (2026-07-31)**: nguyên nhân `OrderListScreen` đăng ký 2 nơi — Tab `OrdersTab` **và** Stack `OrderList` (RootNavigator). Mở từ menu "Đơn mua" → đi qua Stack → `navigation` là stack navigator không có `jumpTo` → crash khi bấm BottomNav. Đã guard cả 4 screen dùng `jumpTo` (`HomeScreen`, `VideoTabScreen`, `OrderListScreen`, `AccountScreen`): nếu `typeof navigation.jumpTo === 'function'` thì dùng `jumpTo`, ngược lại fallback `navigation.navigate('MainTabs', { screen: target })`. Typecheck pass.
- **Fix menu nhảy khi mở đơn hàng (OrderListScreen, 2026-07-31)**: nguyên nhân `useIsFocused()` khi quay lại từ Tracking trigger `loadOrders()` → `setLoading(true)` → FlatList bị thay bằng ActivityIndicator (thu về phía trên) rồi load lại từ đầu. Đã fix bằng ref `hasLoadedRef`: chỉ hiện spinner fullscreen khi chưa có dữ liệu (`!hasLoadedRef.current`); khi refocus sau khi đã load thì **silent refresh** (giữ nguyên list, không mất vị trí cuộn). Thêm import `useRef`. Typecheck pass.
- **Đổi lựa chọn thời gian giao (CheckoutScreen, 2026-07-31)**: block "Thời gian giao" **chỉ hiển thị khi chọn AhaMove** (`isAhaMove` = selectedPartner name chứa "ahamove", ẩn hẳn khi chọn đơn vị khác). 3 mode nhanh đổi nhãn: ⚡ **Siêu tốc** (Ưu tiên trong 30p), 🚀 **Siêu tốc - tiết kiệm** (Trong 1 giờ), 🛵 **4H** (Giao siêu rẻ trong 4h); giữ nguyên 📅 Hẹn ngày giao. Giá trị mode gửi backend không đổi (hoatoc/express2h/interprovince/appointment). Cập nhật đồng bộ nhãn: `SuccessScreen.slotLabel` (thêm nhãn express2h/interprovince) + admin `backend/admin/app.js` (Thông tin giao hàng). Typecheck pass.
- **Ẩn Grab/Be/Xanh SM khi carrier tắt (2026-07-31)**: `backend/src/routes/shipping.ts` — chuyển từ "ẩn partner có carrier đã đăng ký nhưng bị tắt" sang **chỉ hiện partner có carrier đang bật trong `.env`** (`getActiveCarriers()` name-set filter). Kết quả: API partners giờ chỉ trả `['AhaMove']` (Be không khớp tên carrier "Bee", Xanh SM chưa có carrier đăng ký → cả hai bị ẩn theo yêu cầu "Be và XanhSM cũng thế"). Đã build + rebuild Docker, test API OK.
- **Đơn khó nhận ship (hard_to_ship, 2026-07-31)**: khi admin xác nhận đủ hàng → đơn `confirmed`; sau **10 phút** (tính từ entry `order_tracking` status `confirmed`) mà AhaMove vẫn chưa có tài xế nhận (ASSIGNING/IDLE/CONFIRMING/PAYING, `live.driver` null) → watcher tự chuyển đơn sang `hard_to_ship` + ghi timeline. Admin được cảnh báo bằng **badge đỏ ⚠️ trên sidebar Đơn hàng** (poll 10s qua `/admin/orders/pending-count` giờ trả thêm `hardShipCount`; toast + beep + Notification khi count tăng). Trên app: status `hard_to_ship` hiển thị "Khó nhận ship"; **số điện thoại tài xế chuyển thành số cửa hàng 0936141757** (`/orders/:id/track` trả driver shop; TrackingScreen card "Gọi cửa hàng để được hỗ trợ"). Admin có nút "Hủy VC & xác nhận lại" (endpoint `POST /admin/orders/:id/retry-shipping` — hủy AhaMove cũ, reset tracking code, đơn về `pending`). Migration `010_hard_to_ship.sql` thêm `hard_to_ship` vào `orders_status_check` (đã áp psql + thêm vào docker-compose init). Backend build + Docker rebuild OK; typecheck app pass.
- **HARD_SHIP_TIMEOUT_MIN vào .env (2026-07-31)**: `backend/.env` + `.env.example` + `docker-compose.yml` (environment `${HARD_SHIP_TIMEOUT_MIN:-10}`) thêm biến; `config/index.ts` đọc `parseInt(process.env.HARD_SHIP_TIMEOUT_MIN || '10', 10)` → `config.hardShipTimeoutMin`; `hardShipWatcher.ts` dùng `Math.max(1, config.hardShipTimeoutMin)`. Đã test với `HARD_SHIP_TIMEOUT_MIN=1`: đơn `confirmed` >1 phút không có tài xế → watcher tự chuyển `hard_to_ship` (log `Order HSHN-260731-70455 → hard_to_ship`). Đang để `=1` để user test UI.
- **Nút auto-reship (2026-07-31)**: endpoint `POST /admin/orders/:id/auto-reship` — hủy AhaMove cũ (best-effort) → reset shipping fields → `createShippingForOrder` lại ngay → đơn về `confirmed` (không quay lại pending). Test: đơn hard_to_ship `26AL182B` → `264YZISS` confirmed OK.
- **Đổi nút thành "Hoàn thành" (2026-07-31)**: nút xanh "Tự đặt ship lại" trong card hard_to_ship đổi thành **"Hoàn thành"** (`completeOrder`) → gọi `PUT /admin/orders/:id/status {status:'delivered'}` (đơn → Hoàn thành). Có `btn-success` dùng trong admin nhưng CSS chỉ định nghĩa `btn-primary/btn-danger/btn-outline` — nút vẫn hiển thị đúng (btn-success không có style riêng).
- **Hệ thống 7 trạng thái đơn hàng (2026-07-31)**: thay thế toàn bộ hệ thống cũ — `migration 011_order_status_7.sql`: DROP + ADD `orders_status_check` với 7 trạng thái `pending`(Chờ xác nhận)/`confirmed`(Đã xác nhận)/`hard_to_ship`(Khó đặt ship)/`customer_refused`(Khách không nhận đơn)/`delivered`(Hoàn thành)/`exchanged`(Đổi hàng)/`returned`(Bị trả hàng) + `cancelled` nội bộ (giữ cho luồng hủy/từ chối); `UPDATE orders SET status='confirmed' WHERE status IN ('preparing','delivering')` (bỏ 2 trạng thái cũ). Đã áp psql + thêm vào docker-compose init. **Admin** (app.js): filter/statusBadge/labels theo 7 trạng thái mới; card warning hard_to_ship đổi nhãn "Khó đặt ship"; thêm **dropdown "Chuyển trạng thái"** trong chi tiết đơn (đơn ≠ pending/cancelled) → `changeOrderStatus` gọi `PUT /admin/orders/:id/status`. **Backend**: `validStatuses` + `statusLabels` cập nhật; `/orders/:id/track` — `customer_refused` cũng trả driver cửa hàng (shop name/phone) như hard_to_ship; khách hủy được khi `pending/confirmed/hard_to_ship` (bỏ `preparing`). **App**: `OrderStatus` type mới; OrderListScreen — `confirmed`/`hard_to_ship`/`customer_refused` → label "Đang giao" (xanh), `delivered`/`exchanged`/`returned` → "Đã giao" (xanh lá); TrackingScreen — steps/etaText/driverLabel/statusText cho `customer_refused` ("Khách không nhận đơn — vui lòng liên hệ cửa hàng") và `exchanged`/`returned` (done "Đã giao"); canCancel bỏ `preparing`. **Test**: chuyển 1 đơn qua delivered→exchanged→returned→customer_refused đều OK qua API admin; track trả driver MEH Seafood 0936141757. Backend build + Docker rebuild OK; typecheck app pass.
