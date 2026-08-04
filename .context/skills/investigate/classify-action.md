# Skill: Phân loại hành động

Khi user request không khớp ACTION_MATRIX, dùng skill này.

## Steps

1. Parse yêu cầu, xác định intent chính
2. Map intent sang hành động tương tự nhất trong ACTION_MATRIX
3. Nếu hoàn toàn mới, tạo action mới với mã `Z-xxx`
4. Ghi nhật ký vào session.md

## Common intents

| Intent | Hành động | Mã |
|---|---|---|
| "Thêm màn hình X" | Tạo màn hình | B |
| "Sửa lỗi Y" | Sửa lỗi | D |
| "Thêm tính năng Z" | Thêm tính năng | C |
| "Review code" | Review | E |
| "Design database" | Schema DB | M |
| "Triển khai" | Deploy | L |
