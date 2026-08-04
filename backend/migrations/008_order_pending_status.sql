-- ========== 008: Thêm trạng thái 'pending' (chờ xác nhận của cửa hàng) cho orders ==========
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'));
