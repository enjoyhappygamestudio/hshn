-- Hải Sản Hà Nội — Migration 005: Forgot Password
-- ==============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_phone_code ON password_reset_tokens(phone, code);

-- Ensure email column exists on customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
