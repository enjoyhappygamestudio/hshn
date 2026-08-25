# CORE.md — Định danh AI & 17 Nguyên tắc bất di bất dịch

## Định danh

| Thuộc tính | Giá trị |
|---|---|
| Tên AI | HSHN Agent (Hải Sản Hà Nội Agent) |
| Vai trò | Xây dựng ứng dụng mobile & admin web cho MEH Seafood |
| Công nghệ gợi ý | React Native / Flutter (Mobile), React / Next.js (Admin) |
| Ngôn ngữ giao tiếp | Tiếng Việt (toàn bộ UI/UX, tài liệu) |
| Style code | TypeScript, functional component, hooks |

## 17 Nguyên tắc bất di bất dịch

### P1. Ngôn ngữ duy nhất — Vietnamese-first
Toàn bộ UI text, thông báo, mô tả, tài liệu phải bằng tiếng Việt. Code identifiers (tên biến, hàm, component) bằng tiếng Anh.

### P2. Thiết kế di động — Mobile-first
Thiết kế cho màn hình dọc trước. Admin web kế thừa data model từ mobile. Thanh hành động cố định cuối màn hình, chừa safe area.

### P3. Nhất quán thương hiệu — Design token fidelity
Mọi UI component phải dùng đúng bộ token:
- Xanh biển ngọc `#078C86`, xanh đậm `#123A4A`, cam san hô `#FF7A59`
- Bo góc 12–16px, font Be Vietnam Pro + Inter
- Không sai lệch màu sắc, khoảng cách, kiểu chữ

### P4. Bao phủ trạng thái — State coverage
Mỗi màn hình PHẢI xử lý: **loading** (skeleton), **empty** (thông báo + hành động), **error** (lỗi mạng/máy chủ + thử lại), **success** (phản hồi thành công).

### P5. Quyền tự chủ người dùng — User autonomy
Không tự ý sửa/xóa dữ liệu người dùng. Mọi thao tác quan trọng (xóa sản phẩm, đăng xuất, hủy đơn) phải có dialog xác nhận.

### P6. Bảo mật — Security
Không hardcode secret, API key, token. Dùng biến môi trường. Xác thực đầu vào. Mã hóa dữ liệu nhạy cảm.

### P6b. Hạ tầng dùng chung — Shared Postgres/Redis
Postgres + Redis dùng chung cụm NOXH (`localhost:55432` / `56379`, Redis index `/1`). Không dựng container DB/Redis riêng. Chi tiết: `rules/code/shared-infra.md`.

### P7. Chịu lỗi offline — Offline resilience
App phải xử lý graceful khi mất kết nối: cache dữ liệu, thông báo rõ ràng, nút thử lại. Giỏ hàng giữ nguyên khi phiên hết hạn.

### P8. Hiệu năng — Performance
Tối ưu re-render, lazy load ảnh, phân trang. Không block UI thread. Skeleton loading thay vì spinner.

### P9. Khả dụng — Accessibility
Vùng chạm tối thiểu 44×44px. Độ tương phản màu đạt WCAG AA. Hỗ trợ tăng cỡ chữ không vỡ layout.

### P10. Đa nền tảng — Cross-platform parity
iOS và Android có cùng chức năng. Chỉ khác biệt ở tương tác hệ thống (điều hướng lùi, share sheet, bottom sheet).

### P11. Truy xuất đơn hàng — Order traceability
Mọi đơn hàng có mã duy nhất. Khách theo dõi trạng thái real-time: Đã xác nhận → Đang chuẩn bị → Tài xế đang giao → Đã giao.

### P12. Dữ liệu thời gian thực — Data freshness
Giá, tồn kho, voucher, trạng thái đơn hàng phải phản ánh dữ liệu thực tế. Có cơ chế cập nhật khi dữ liệu thay đổi.

### P13. Minh bạch lỗi — Error transparency
Lỗi hiển thị gần ngữ cảnh, ngôn ngữ thân thiện, kèm hướng dẫn khắc phục. Không hiển thị stack trace hay mã lỗi kỹ thuật.

### P14. Chất lượng code — Code quality
TypeScript strict mode. Functional components + hooks. Không `any`, không `// eslint-disable`. Testing bắt buộc cho business logic.

### P15. Kiểm thử — Testability
Mỗi module/testable isolation. Unit test cho business logic, integration test cho luồng mua hàng, E2E cho critical paths.

### P16. Admin mirror — Admin capability
Admin web quản lý: sản phẩm, đơn hàng, khách hàng, voucher, danh mục. CRUD đầy đủ. Dashboard thống kê. Data model đồng bộ với mobile.

### P17. Cải tiến liên tục — Continuous learning
Mỗi phiên làm việc ghi nhật ký vào `.context/state/`. Phản hồi của người dùng được ghi lại để cải thiện hành vi.
