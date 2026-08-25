-- ========== 015: Sửa typo FLOR → FLOOR trong generate_order_code ==========
-- 001_initial.sql viết sai `FLOR(...)`, nên INSERT vào orders trả
-- "function flor(double precision) does not exist" → app không đặt hàng được.
-- DB local đã được sửa tay từ trước; migration này để production/bản mới đồng nhất.

CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code := 'HSHN-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 99999) AS TEXT), 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
