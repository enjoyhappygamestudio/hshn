# AGENTS.md — Điểm vào cho AI

> Đây là file đầu tiên AI đọc khi bắt đầu phiên làm việc với dự án **Hải Sản Hà Nội**.

## Dự án

Xây dựng ứng dụng di động (iOS & Android) đặt hải sản và trang web admin cho MEH Seafood.

| Thuộc tính | Giá trị |
|---|---|
| Tên dự án | Hải Sản Hà Nội |
| Tác giả | MEH Seafood |
| Loại | Mobile app (React Native / Flutter) + Admin Web |
| Ngôn ngữ UI | Tiếng Việt |
| Design System | Xem `.context/` |
| Hạ tầng DB | Postgres/Redis dùng chung NOXH — `rules/code/shared-infra.md` |
| Cổng | Không trùng dự án khác — `rules/code/cong-port.md` (API **3100**, Admin **3101**, Expo **8002**) |
| Build / README | 3 chế độ (pnpm / Docker apps / Caddy) — `rules/doc/build-van-hanh.md` (mẫu AppThueNha) |

## Cấu trúc Hệ điều hành ngữ cảnh

```
.context/
├── CORE.md               # [L1] Định danh AI, 17 nguyên tắc bất di bất dịch
├── ACTION_MATRIX.md      # [L1] Ma trận hành động → tài liệu bắt buộc
├── RULES.md              # [L2] Index luật theo lĩnh vực
├── rules/                # [L2] Luật chi tiết
│   ├── code/             # Luật code
│   ├── test/             # Luật test
│   ├── doc/              # Luật tài liệu
│   └── investigate/      # Luật điều tra
├── skills/               # [L3] Kỹ năng thực thi
│   ├── code/             # Kỹ năng code
│   ├── test/             # Kỹ năng test
│   ├── doc/              # Kỹ năng viết tài liệu
│   └── investigate/      # Kỹ năng điều tra
├── hooks/                # [L3] Hook tự động
├── subagents/            # [L4] Tác tử con
├── mcp/                  # [L5] MCP servers
└── state/                # Trạng thái phiên
```

## Quy trình làm việc

1. Đọc AGENTS.md → hiểu dự án
2. Đọc `.context/state/session.md` → nắm trạng thái phiên trước
3. Xác định hành động từ yêu cầu → tra cứu ACTION_MATRIX.md
4. Áp dụng luật từ RULES.md + rules/ tương ứng
5. Thực thi kỹ năng từ skills/ tương ứng
6. Ghi nhật ký vào `.context/state/session.md`
7. Commit nếu được yêu cầu

## Tài liệu tham chiếu chính

- `mo-ta-app-hai-san-ha-noi.md` — Bản mô tả giao diện đầy đủ
- `hai-san-ha-noi.html` — Prototype HTML tương tác
