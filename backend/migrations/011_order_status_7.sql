-- ========== 011: Hệ thống 7 trạng thái đơn hàng ==========
-- 1 pending (Chờ xác nhận), 2 confirmed (Đã xác nhận), 3 hard_to_ship (Khó đặt ship),
-- 4 customer_refused (Khách không nhận đơn), 5 delivered (Hoàn thành), 6 exchanged (Đổi hàng),
-- 7 returned (Bị trả hàng). Giữ 'cancelled' nội bộ cho luồng hủy/từ chối.
-- Bỏ 'preparing', 'delivering' — đơn cũ ở trạng thái này chuyển về 'confirmed'.

UPDATE orders SET status = 'confirmed' WHERE status IN ('preparing', 'delivering');

ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pending', 'confirmed', 'hard_to_ship', 'customer_refused',
  'delivered', 'exchanged', 'returned', 'cancelled'
));
