-- VyaparTrack - Add device spec columns to products
-- Run this in Supabase SQL Editor

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS battery_health  INTEGER,   -- percentage 0-100
  ADD COLUMN IF NOT EXISTS storage         TEXT,      -- e.g. "128GB"
  ADD COLUMN IF NOT EXISTS ram             TEXT,      -- e.g. "8GB"
  ADD COLUMN IF NOT EXISTS color           TEXT,      -- e.g. "Midnight Black"
  ADD COLUMN IF NOT EXISTS condition       TEXT,      -- Excellent / Good / Fair / Poor
  ADD COLUMN IF NOT EXISTS accessories     TEXT;      -- e.g. "Box, Charger, Earphones"
