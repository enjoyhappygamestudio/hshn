-- Thêm cân nặng mặc định (kg) cho sản phẩm để tính phí vận chuyển chính xác
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(6,2) NOT NULL DEFAULT 1;
