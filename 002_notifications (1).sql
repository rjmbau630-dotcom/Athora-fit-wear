-- ============================================================
-- ATHORA FIT WEAR — SMS Notification System migration (corrected)
--
-- Live schema check (confirmed directly against Supabase,
-- project ndipdrjjbegbanliwlxq):
--   orders.id           -> TEXT, default gen_random_uuid()::text  (PRIMARY KEY)
--   orders.customer_id  -> does not exist
--   notifications.order_id -> must be TEXT to match orders.id
--
-- The live `orders` table was NOT created by athora.py's
-- CREATE TABLE IF NOT EXISTS stub (id SERIAL) — it already existed
-- with a different, larger, hand-migrated schema (id is a
-- uuid-as-text column, plus a number of legacy/duplicate columns
-- from earlier migration attempts). That stub is effectively a
-- no-op on production. Do not change orders.id.
--
-- This migration is purely additive: two new nullable/defaulted
-- columns on orders, and a brand-new notifications table. Nothing
-- existing is altered or dropped. Already applied directly to
-- production and verified (FK insert + join + cleanup all passed).
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'doorstep';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location TEXT;

CREATE TABLE IF NOT EXISTS notifications (
    id                  SERIAL PRIMARY KEY,
    order_id            TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
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
