-- ========== 017: Sự kiện xem sản phẩm / thêm giỏ hàng (phục vụ phân tích) ==========

CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view', 'add_to_cart')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_type_created
  ON product_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_product
  ON product_events (product_id, created_at DESC);
