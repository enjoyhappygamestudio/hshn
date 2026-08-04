-- ========== 010: Thêm trạng thái 'hard_to_ship' (khó nhận ship) cho orders ==========
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled', 'hard_to_ship'));
