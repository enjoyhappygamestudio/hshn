-- ========== ORDER SHIPPING THẬT (AhaMove) ==========
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_tracking_code VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier_fee INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_error TEXT;
