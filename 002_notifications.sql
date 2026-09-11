-- ============================================================
-- ATHORA FIT WEAR — SMS Notification System migration
--
-- NOTE: athora.py's init_db() already applies these same
-- statements automatically on every boot (same pattern the
-- existing products/orders tables use — CREATE TABLE IF NOT
-- EXISTS / ADD COLUMN IF NOT EXISTS). This file is a reference
-- copy for manual review or running by hand against Supabase's
-- SQL editor; you do not have to run it separately for the app
-- to work.
--
-- 001_migrations.sql (order_code / payment_status / delivery_status /
-- a `phone` column) was NOT applied to the live schema — the live
-- orders table uses customer_phone and a single `status` column, and
-- that is what this migration and the new code build on. Worth
-- reconciling 001_migrations.sql separately before ever running it,
-- since it references a `phone` column that doesn't exist live.
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'doorstep';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location TEXT;

CREATE TABLE IF NOT EXISTS notifications (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_ref           TEXT NOT NULL,
    customer_phone      TEXT NOT NULL,
    notification_type   TEXT NOT NULL,   -- order_confirmed | order_dispatched | ready_for_collection | out_for_delivery | delivered
    message             TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed
    provider_message_id TEXT,
    failure_reason      TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    sent_at             TIMESTAMP,
    UNIQUE (order_id, notification_type)  -- guarantees no duplicate SMS per event per order
);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status   ON notifications(status);
