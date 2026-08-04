-- Hải Sản Hà Nội — Invoice / VAT Tables
-- Tính năng xuất hóa đơn điện tử (E-invoice) và hóa đơn giá trị gia tăng (VAT)

-- ========== Company & Provider Config (Singleton) ==========
CREATE TABLE invoice_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL DEFAULT 'Hộ kinh doanh MEH',
  tax_code VARCHAR(20) NOT NULL DEFAULT '022093008719',
  company_address TEXT NOT NULL DEFAULT '47 ngõ 16 Phan Văn Trường, Cầu Giấy, Hà Nội',
  phone VARCHAR(20) NOT NULL DEFAULT '0936141757',
  email VARCHAR(255) NOT NULL DEFAULT 'Haisanbay88@gmail.com',
  representative_name VARCHAR(255) DEFAULT 'Lê Thanh Sơn',
  representative_title VARCHAR(255) DEFAULT 'Chủ Hộ',
  provider VARCHAR(50) DEFAULT 'viettel',
  api_key TEXT,
  api_endpoint VARCHAR(500),
  invoice_template VARCHAR(50) DEFAULT '01GTKT',
  invoice_serial VARCHAR(50) DEFAULT 'HSHN',
  invoice_start_number INTEGER DEFAULT 1,
  invoice_current_number INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== Invoice Auto Rules ==========
CREATE TABLE invoice_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_on VARCHAR(50) NOT NULL DEFAULT 'delivered'
    CHECK (trigger_on IN ('paid', 'delivered', 'customer_request', 'manual')),
  condition_type VARCHAR(50) NOT NULL DEFAULT 'always'
    CHECK (condition_type IN ('always', 'on_request', 'min_amount')),
  min_order_amount INTEGER,
  invoice_type VARCHAR(50) NOT NULL DEFAULT 'vat'
    CHECK (invoice_type IN ('vat', 'sales', 'normal')),
  auto_send_email BOOLEAN DEFAULT true,
  email_template TEXT DEFAULT 'Kính gửi {{customer_name}},\n\nHóa đơn VAT của đơn hàng #{{order_code}} đã được phát hành.\n\nSố hóa đơn: {{invoice_number}}\nNgày phát hành: {{invoice_date}}\nTổng tiền: {{total_amount}}đ (bao gồm VAT {{vat_rate}}%)\n\nBạn có thể tra cứu hóa đơn tại: {{check_url}}\n\nXin cảm ơn!',
  bcc_email VARCHAR(255),
  active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== Invoices ==========
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100),
  invoice_serial VARCHAR(50),
  invoice_template VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'issued', 'failed', 'cancelled')),
  total_before_vat INTEGER,
  vat_amount INTEGER,
  vat_rate DECIMAL(3,1) DEFAULT 10,
  shipping_fee INTEGER DEFAULT 0,
  total_amount INTEGER,
  pdf_url TEXT,
  check_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  issued_at TIMESTAMPTZ,
  issued_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_issued ON invoices(issued_at DESC);

-- ========== Invoice Audit Log ==========
CREATE TABLE invoice_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  performed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_invoice ON invoice_audit_log(invoice_id);
CREATE INDEX idx_audit_created ON invoice_audit_log(created_at DESC);

-- ========== Add invoice request fields to orders ==========
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_requested BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_company_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_tax_code VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_company_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_representative VARCHAR(255);

-- ========== Seed: default config ==========
INSERT INTO invoice_config (company_name, tax_code, company_address, phone, email, representative_name, representative_title)
VALUES ('Hộ kinh doanh MEH', '022093008719', '47 ngõ 16 Phan Văn Trường, Cầu Giấy, Hà Nội', '0936141757', 'Haisanbay88@gmail.com', 'Lê Thanh Sơn', 'Chủ Hộ');

-- ========== Seed: default rules ==========
INSERT INTO invoice_rules (trigger_on, condition_type, invoice_type, auto_send_email)
VALUES ('delivered', 'on_request', 'vat', true);
