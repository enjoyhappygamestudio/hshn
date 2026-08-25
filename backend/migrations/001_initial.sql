-- Hải Sản Hà Nội — Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== SHOPS ==========
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,7) DEFAULT 21.0285,
  lng DECIMAL(10,7) DEFAULT 105.8542,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== CATEGORIES ==========
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '🦐',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== PRODUCTS ==========
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  old_price INTEGER CHECK (old_price IS NULL OR old_price > price),
  unit VARCHAR(50) NOT NULL DEFAULT '/kg',
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_fresh BOOLEAN DEFAULT true,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images TEXT[] DEFAULT '{}',
  emoji VARCHAR(10) DEFAULT '🦐',
  image_bg VARCHAR(7) DEFAULT '#EAF8F7',
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
  sold_count INTEGER DEFAULT 0 CHECK (sold_count >= 0),
  is_out_of_stock BOOLEAN GENERATED ALWAYS AS (stock = 0) STORED,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_active ON products(active) WHERE active = true;
CREATE INDEX idx_products_rating ON products(rating DESC);

-- ========== PRODUCT VARIANTS ==========
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL,
  unit VARCHAR(50) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ========== CUSTOMERS ==========
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  tier VARCHAR(50) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  order_count INTEGER DEFAULT 0,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- ========== ADDRESSES ==========
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  full_address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_customer ON addresses(customer_id);

-- ========== DRIVERS ==========
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  plate_number VARCHAR(20) NOT NULL,
  avatar_url TEXT,
  rating DECIMAL(2,1) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  status VARCHAR(20) DEFAULT 'available'
    CHECK (status IN ('available', 'busy', 'offline')),
  current_lat DECIMAL(10,7),
  current_lng DECIMAL(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== ORDERS ==========
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'preparing', 'delivering', 'delivered', 'cancelled')),
  items JSONB NOT NULL,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  discount INTEGER DEFAULT 0 CHECK (discount >= 0),
  shipping_fee INTEGER NOT NULL CHECK (shipping_fee >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  voucher_code VARCHAR(20),
  delivery_mode VARCHAR(20) NOT NULL CHECK (delivery_mode IN ('hoatoc', 'schedule')),
  delivery_date DATE,
  delivery_time VARCHAR(10),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cod', 'wallet', 'card')),
  note TEXT,
  address_snapshot JSONB NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ========== VOUCHERS ==========
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percent', 'fixed', 'shipping')),
  value INTEGER CHECK (value IS NULL OR value > 0),
  cap INTEGER CHECK (cap IS NULL OR cap > 0),
  min_order INTEGER DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0),
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  icon VARCHAR(10) DEFAULT '🏷️',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== ORDER TRACKING (WebSocket events log) ==========
CREATE TABLE order_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_order ON order_tracking(order_id);
CREATE INDEX idx_tracking_created ON order_tracking(created_at DESC);

-- ========== NOTIFICATIONS ==========
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_customer ON notifications(customer_id, read);

-- ========== FUNCTION: generate order code ==========
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code := 'HSHN-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 99999) AS TEXT), 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_code
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_order_code();

-- ========== FUNCTION: update product rating ==========
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
