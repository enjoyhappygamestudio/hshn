# ACTION_MATRIX.md — Ma trận hành động → Tài liệu bắt buộc

Khi người dùng yêu cầu một hành động (A→Q), AI PHẢI tạo/kích hoạt các tài liệu tương ứng.

| Mã | Hành động | Tài liệu bắt buộc |
|---|---|---|
| **A** | Phân tích UI spec | `rules/investigate/ui-analysis.md` → Component tree + data model + flow diagram |
| **B** | Tạo màn hình mới | `skills/code/generate-screen.md` → Component code + Storybook + test |
| **C** | Thêm tính năng | `rules/doc/spec-update.md` + `skills/code/implement-feature.md` + test |
| **D** | Sửa lỗi | `rules/investigate/root-cause.md` → RCA report + fix code + regression test |
| **E** | Review code | `rules/code/review-checklist.md` → Danh sách review + comments |
| **F** | Tạo API | `skills/code/api-spec.md` → OpenAPI spec + TypeScript types + mock server |
| **G** | Tạo test | `skills/test/generate-tests.md` → Unit test + integration test + E2E |
| **H** | Tạo admin screen | `skills/code/admin-screen.md` → CRUD component + list + detail + filter |
| **I** | Refactor | `rules/investigate/refactor-plan.md` → Migration plan + code + verify |
| **J** | Điều tra | `rules/investigate/investigation.md` → Findings + root cause + recommendations |
| **K** | Viết tài liệu | `skills/doc/write-docs.md` → README + API docs + changelog |
| **L** | Triển khai | `skills/code/deploy.md` → Config + CI/CD + rollback plan |
| **M** | Schema DB | `skills/code/database-schema.md` → Migration SQL + seed data + rollback |
| **N** | State management | `skills/code/state-management.md` → Store + actions + reducers + selectors |
| **O** | Navigation | `skills/code/navigation.md` → Route map + guards + deep links |
| **P** | Tích hợp thanh toán | `skills/code/payment.md` → Payment flow + webhook + error handling |
| **Q** | Thông báo push | `skills/code/push-notifications.md` → Schema + handlers + UI |

## Quy tắc

1. Mỗi hành động PHẢI sinh đủ tài liệu trong cột "Tài liệu bắt buộc"
2. Nếu tài liệu đã tồn tại, cập nhật có versioning
3. Sau khi hoàn thành, ghi vào `.context/state/session.md`
4. Nếu hành động không có trong ma trận, dùng `skills/investigate/classify-action.md`
