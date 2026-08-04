-- ========== 012: Cập nhật danh mục ==========
-- 1) Đổi tên "Khô hải sản" → "Hải Sản Khô"
-- 2) Bỏ danh mục "Cua, ghẹ" và "Bạch tuộc, mực" (không có sản phẩm)
-- 3) Thêm danh mục "Hải sản cấp đông"

UPDATE categories SET name = 'Hải Sản Khô' WHERE name = 'Khô hải sản';

DELETE FROM categories WHERE name IN ('Cua, ghẹ', 'Bạch tuộc, mực');

INSERT INTO categories (id, name, icon, sort_order) VALUES
  ('b1b2c3d4-0002-4000-8000-000000000005', 'Hải sản cấp đông', '🧊', 5)
ON CONFLICT (id) DO NOTHING;
