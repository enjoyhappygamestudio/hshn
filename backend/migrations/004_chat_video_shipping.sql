-- Hải Sản Hà Nội — Migration 004: Chat, Videos, Shipping Partners
-- ================================================================

-- ========== CONVERSATIONS ==========
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conv_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON conversations(last_message_at DESC);

-- ========== MESSAGES ==========
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  sender_id UUID,
  content TEXT,
  image_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conversation ON messages(conversation_id, created_at ASC);

-- ========== PRODUCT VIDEOS ==========
CREATE TABLE IF NOT EXISTS product_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  file_size INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  title VARCHAR(255),
  video_category VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'ready'
    CHECK (status IN ('processing', 'ready', 'error')),
  overlay_position VARCHAR(20) DEFAULT 'bottom-left'
    CHECK (overlay_position IN ('bottom-left', 'bottom-right', 'bottom-center')),
  overlay_appear_at INTEGER DEFAULT 0,
  overlay_disappear_at INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_product ON product_videos(product_id);

-- ========== SHIPPING PARTNERS ==========
CREATE TABLE IF NOT EXISTS shipping_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  logo VARCHAR(10) DEFAULT '🚚',
  api_endpoint TEXT,
  api_key TEXT,
  base_fee INTEGER DEFAULT 15000,
  fee_per_km INTEGER DEFAULT 5000,
  fee INTEGER DEFAULT 30000,
  estimated_days INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  min_fee INTEGER DEFAULT 10000,
  max_fee INTEGER DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO shipping_partners (name, logo, description, base_fee, fee_per_km, fee, estimated_days, sort_order, min_fee, max_fee) VALUES
  ('Be', '🟢', 'Giao hàng nhanh nội thành', 15000, 4000, 30000, 1, 1, 10000, 45000),
  ('AhaMove', '🔵', 'Giao hàng tiết kiệm', 12000, 5000, 25000, 1, 2, 10000, 50000),
  ('Grab', '🟢', 'Giao hàng siêu tốc', 18000, 4500, 35000, 1, 3, 12000, 55000),
  ('Xanh SM', '🟢', 'Giao hàng xanh', 10000, 3500, 20000, 2, 4, 8000, 40000)
ON CONFLICT DO NOTHING;

-- ========== ORDER SHIPPING (thêm trường shipping_partner cho orders) ==========
-- Additional columns for existing tables (safe to re-run)
ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE shipping_partners ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE shipping_partners ADD COLUMN IF NOT EXISTS fee INTEGER DEFAULT 30000;
ALTER TABLE shipping_partners ADD COLUMN IF NOT EXISTS estimated_days INTEGER DEFAULT 1;
ALTER TABLE shipping_partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_partner VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_partner_fee INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_partner_id UUID REFERENCES shipping_partners(id);

-- Expand delivery_mode CHECK constraint to include new modes
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_delivery_mode_check;
ALTER TABLE orders ADD CONSTRAINT orders_delivery_mode_check
  CHECK (delivery_mode IN ('hoatoc', 'express2h', 'interprovince', 'appointment'));
