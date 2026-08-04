-- Hải Sản Hà Nội — Seed Data

-- ========== SHOPS ==========
INSERT INTO shops (id, name, address, phone, lat, lng) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Hải Sản Hà Nội - Cầu Giấy', 'Số 12 Trần Duy Hưng, Cầu Giấy, Hà Nội', '090 123 4567', 21.0285, 105.7942),
  ('a1b2c3d4-0001-4000-8000-000000000002', 'Hải Sản Hà Nội - Long Biên', 'Số 45 Nguyễn Văn Cừ, Long Biên, Hà Nội', '090 123 4568', 21.0385, 105.8742),
  ('a1b2c3d4-0001-4000-8000-000000000003', 'Khô Hải Sản Bảo Ngọc', 'Số 78 Hàng Buồm, Hoàn Kiếm, Hà Nội', '090 123 4569', 21.0345, 105.8542);

-- ========== CATEGORIES ==========
INSERT INTO categories (id, name, icon, sort_order) VALUES
  ('b1b2c3d4-0002-4000-8000-000000000001', 'Tươi sống', '🦐', 1),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'Một nắng', '☀️', 2),
  ('b1b2c3d4-0002-4000-8000-000000000003', 'Hải Sản Khô', '🐚', 3),
  ('b1b2c3d4-0002-4000-8000-000000000004', 'Ăn liền', '🍱', 4),
  ('b1b2c3d4-0002-4000-8000-000000000005', 'Hải sản cấp đông', '🧊', 5);

-- ========== PRODUCTS ==========
INSERT INTO products (id, name, description, price, unit, weight, shop_id, category_id, is_fresh, stock, emoji, image_bg, rating, rating_count, sold_count) VALUES
  ('c1b2c3d4-0003-4000-8000-000000000001', 'Tôm sú tươi', 'Tôm sú tươi sống, thịt chắc ngọt, đánh bắt trong ngày.', 329000, '/kg', 1,
   'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000001', true, 50, '🦐', '#FFE3D6', 4.8, 312, 1200),

  ('c1b2c3d4-0003-4000-8000-000000000002', 'Mực một nắng', 'Mực một nắng phơi tự nhiên, giữ nguyên hương vị biển.', 189000, '/gói', 0.5,
   'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000002', true, 30, '🦑', '#E9E3D8', 4.7, 189, 850),

  ('c1b2c3d4-0003-4000-8000-000000000003', 'Cá chỉ vàng', 'Cá chỉ vàng tươi ngon, thịt chắc.', 129000, '/gói', 0.5,
   'a1b2c3d4-0001-4000-8000-000000000002', 'b1b2c3d4-0002-4000-8000-000000000001', true, 40, '🐟', '#FFF0C2', 4.6, 156, 650);

INSERT INTO products (id, name, description, price, old_price, unit, weight, shop_id, category_id, is_fresh, stock, emoji, image_bg, rating, rating_count, sold_count) VALUES
  ('c1b2c3d4-0003-4000-8000-000000000004', 'Tôm hùm xanh', 'Tôm hùm xanh tươi sống, thịt chắc ngọt, giàu dinh dưỡng.', 899000, NULL, '/kg', 1,
   'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000001', true, 20, '🦞', '#DCEFEC', 4.9, 312, 1200);

INSERT INTO products (id, name, description, price, old_price, unit, weight, shop_id, category_id, is_fresh, stock, emoji, image_bg, rating, rating_count, sold_count) VALUES
  ('c1b2c3d4-0003-4000-8000-000000000005', 'Tôm khô loại 1', 'Tôm khô nguyên con, phơi nắng tự nhiên.', 259000, NULL, '/gói', 0.5,
   'a1b2c3d4-0001-4000-8000-000000000003', 'b1b2c3d4-0002-4000-8000-000000000003', false, 100, '🦐', '#FFE3D6', 4.9, 89, 430),

  ('c1b2c3d4-0003-4000-8000-000000000006', 'Cá khô một nắng', 'Cá khô một nắng thơm ngon.', 99000, 129000, '/gói', 0.5,
   'a1b2c3d4-0001-4000-8000-000000000003', 'b1b2c3d4-0002-4000-8000-000000000003', false, 0, '🐟', '#FFF0C2', 4.5, 67, 320);

-- ========== VARIANT ==========
INSERT INTO product_variants (product_id, label, price, unit, stock) VALUES
  ('c1b2c3d4-0003-4000-8000-000000000004', '500g', 499000, '/500g', 12),
  ('c1b2c3d4-0003-4000-8000-000000000004', '1 kg', 899000, '/kg', 5),
  ('c1b2c3d4-0003-4000-8000-000000000004', '2 kg', 1690000, '/set', 2);

-- ========== VOUCHERS ==========
INSERT INTO vouchers (code, label, description, type, value, cap, min_order, max_uses, icon) VALUES
  ('MOI5', 'Giảm 5% cho khách hàng mới', 'Áp dụng cho đơn hàng đầu tiên · Tối đa 50.000đ', 'percent', 5, 50000, 0, 1000, '5%'),
  ('FREESHIP', 'Miễn phí vận chuyển', 'Áp dụng cho đơn từ 200.000đ', 'shipping', NULL, NULL, 200000, 500, '🚚'),
  ('GIAM10K', 'Giảm 10.000đ', 'Áp dụng cho mọi đơn hàng từ 300.000đ', 'fixed', 10000, NULL, 300000, 500, '10K'),
  ('SALE15', 'Giảm 15%', 'Giảm 15% cho đơn từ 500.000đ · Tối đa 100.000đ', 'percent', 15, 100000, 500000, 200, '15%');

-- ========== DRIVERS ==========
INSERT INTO drivers (id, name, phone, plate_number, rating, status) VALUES
  ('d1b2c3d4-0004-4000-8000-000000000001', 'Anh Hùng', '091 234 5678', '29B1-556.78', 4.8, 'available'),
  ('d1b2c3d4-0004-4000-8000-000000000002', 'Anh Tuấn', '091 234 5679', '29B1-789.12', 4.9, 'available'),
  ('d1b2c3d4-0004-4000-8000-000000000003', 'Chị Mai', '091 234 5680', '29B1-345.67', 4.7, 'busy');

-- ========== ADMIN USERS ==========
INSERT INTO admin_users (name, phone, email, password_hash, role) VALUES
  ('Admin MEH', '0987654321', 'admin@meh.vn', crypt('admin123', gen_salt('bf')), 'admin'),
  ('Nhân viên A', '0987654322', 'staff@meh.vn', crypt('staff123', gen_salt('bf')), 'staff'),
  ('Kho B', '0987654323', 'inventory@meh.vn', crypt('inv123', gen_salt('bf')), 'inventory_staff')
ON CONFLICT (phone) DO NOTHING;
