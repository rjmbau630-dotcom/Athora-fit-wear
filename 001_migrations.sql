-- ============================================================
-- ATHORA FIT WEAR — Database Migrations
-- Run these in order against your existing database
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add order_code + separate payment/delivery status
-- ─────────────────────────────────────────────────────────────

-- Add order_code column (ATH-OR-0001 format)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code VARCHAR(20) UNIQUE;

-- Add separate payment and delivery status columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(30) DEFAULT 'Pending';

-- Backfill order_code for existing orders (using row_number)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM orders
  WHERE order_code IS NULL
)
UPDATE orders
SET order_code = 'ATH-OR-' || LPAD(numbered.rn::text, 4, '0')
FROM numbered
WHERE orders.id = numbered.id;

-- Backfill payment_status from existing status column (adjust values to match yours)
UPDATE orders SET payment_status = CASE
  WHEN status IN ('Paid', 'Packed', 'Shipped', 'Delivered') THEN 'Paid'
  WHEN status = 'Cancelled' THEN 'Refunded'
  ELSE 'Pending'
END
WHERE payment_status = 'Pending';

-- Backfill delivery_status from existing status column
UPDATE orders SET delivery_status = CASE
  WHEN status = 'Packed'    THEN 'Packed'
  WHEN status = 'Shipped'   THEN 'Shipped'
  WHEN status = 'Delivered' THEN 'Delivered'
  WHEN status = 'Cancelled' THEN 'Cancelled'
  ELSE 'Pending'
END
WHERE delivery_status = 'Pending';

-- Auto-generate order_code for new rows via trigger
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(order_code, '[^0-9]', '', 'g') AS INT)), 0) + 1
  INTO next_num FROM orders;
  NEW.order_code := 'ATH-OR-' || LPAD(next_num::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_code ON orders;
CREATE TRIGGER set_order_code
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_code IS NULL)
  EXECUTE FUNCTION generate_order_code();

-- ─────────────────────────────────────────────────────────────
-- 2. site_settings table (theme + banner)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default theme values
INSERT INTO site_settings (key, value) VALUES
  ('primary_color',     '#000000'),
  ('secondary_color',   '#ffffff'),
  ('accent_color',      '#f5a623'),
  ('button_color',      '#000000'),
  ('background_color',  '#ffffff'),
  ('logo_url',          ''),
  ('hero_banner_url',   ''),
  ('font_family',       'Inter, sans-serif'),
  ('banner_message',    '🚚 Free Delivery on orders over KES 15,000 · 💪 Train Hard. Look Harder.')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. Helpful index for tracking lookups
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_phone      ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
