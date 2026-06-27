-- VyaparTrack - Add payment mode + due payment fields
-- Run this in Supabase SQL Editor

ALTER TABLE public.products
  -- Remove battery_health and condition (kept in DB for old data, just hidden in UI)
  -- Purchase payment
  ADD COLUMN IF NOT EXISTS buy_payment_mode    TEXT DEFAULT 'cash',   -- cash / upi / split
  ADD COLUMN IF NOT EXISTS buy_cash_amount     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS buy_upi_amount      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS buy_due_amount      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS buy_due_cleared     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buy_due_cleared_date DATE,

  -- Sell payment
  ADD COLUMN IF NOT EXISTS sell_payment_mode   TEXT DEFAULT 'cash',   -- cash / upi / split
  ADD COLUMN IF NOT EXISTS sell_cash_amount    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS sell_upi_amount     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS sell_due_amount     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS sell_due_cleared    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_due_cleared_date DATE;

-- UPI reference fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS buy_upi_ref   TEXT,
  ADD COLUMN IF NOT EXISTS sell_upi_ref  TEXT;
