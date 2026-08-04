# Skill: Database schema

## Entities

### Product
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  old_price INTEGER,
  unit VARCHAR(50) NOT NULL,
  shop_id UUID REFERENCES shops(id),
  category_id UUID REFERENCES categories(id),
  is_fresh BOOLEAN DEFAULT true,
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[],
  rating DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Order
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  -- confirmed, preparing, delivering, delivered, cancelled
  items JSONB NOT NULL,
  subtotal INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  shipping_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  voucher_code VARCHAR(20),
  delivery_mode VARCHAR(20) NOT NULL,
  delivery_date DATE,
  delivery_time VARCHAR(10),
  payment_method VARCHAR(20) NOT NULL,
  note TEXT,
  address_snapshot JSONB NOT NULL,
  driver_id UUID REFERENCES drivers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Customer
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  tier VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold
  order_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Voucher
```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL, -- percent, fixed, shipping
  value INTEGER,
  cap INTEGER,
  min_order INTEGER,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Driver
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  plate_number VARCHAR(20) NOT NULL,
  avatar_url TEXT,
  rating DECIMAL(2,1) DEFAULT 5.0,
  status VARCHAR(20) DEFAULT 'available', -- available, busy, offline
  current_location POINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
