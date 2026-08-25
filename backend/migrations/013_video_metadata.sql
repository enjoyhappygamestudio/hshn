-- ========== 013: Metadata video sản phẩm ==========
-- Các cột này trước đây chỉ được thêm thủ công qua psql trên máy local,
-- nên DB production thiếu → GET /api/products/videos trả 500 "column v.views does not exist".

ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS video_category VARCHAR(50);
ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

UPDATE product_videos SET views = 0 WHERE views IS NULL;
