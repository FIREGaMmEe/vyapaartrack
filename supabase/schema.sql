-- VyaparTrack - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  gst_number  TEXT,
  plan_level  INTEGER NOT NULL DEFAULT 1 CHECK (plan_level BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    UUID REFERENCES stores(id) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  model             TEXT NOT NULL,
  imei_1            TEXT NOT NULL,
  imei_2            TEXT,
  purchase_price    NUMERIC(12,2) NOT NULL,
  purchase_date     DATE NOT NULL,
  seller_name       TEXT NOT NULL,
  seller_contact    TEXT,
  purchase_remark   TEXT,
  sell_price        NUMERIC(12,2),
  sell_date         DATE,
  buyer_name        TEXT,
  buyer_contact     TEXT,
  sell_remark       TEXT,
  status            TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_imei_1 ON products(imei_1);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ---- stores policies ----

-- Users can read their own store
CREATE POLICY "Users can view their store"
  ON stores FOR SELECT
  USING (
    id IN (
      SELECT store_id FROM users WHERE id = auth.uid()
    )
  );

-- Only owners can update their store
CREATE POLICY "Owners can update their store"
  ON stores FOR UPDATE
  USING (
    id IN (
      SELECT store_id FROM users WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ---- users policies ----

-- Users can view members of their own store
CREATE POLICY "Users can view store members"
  ON users FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can view/update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Owners can update users in their store
CREATE POLICY "Owners can manage store users"
  ON users FOR UPDATE
  USING (
    store_id IN (
      SELECT store_id FROM users WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Allow new user record creation (called after signup)
CREATE POLICY "Allow insert own user record"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ---- products policies ----

-- Users can view products in their store
CREATE POLICY "Users can view store products"
  ON products FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can insert products into their store
CREATE POLICY "Users can add products"
  ON products FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update products in their store
CREATE POLICY "Users can update products"
  ON products FOR UPDATE
  USING (
    store_id IN (
      SELECT store_id FROM users WHERE id = auth.uid()
    )
  );

-- Only owners can delete products
CREATE POLICY "Owners can delete products"
  ON products FOR DELETE
  USING (
    store_id IN (
      SELECT store_id FROM users WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- TRIGGER: Auto-create user record on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, store_id, role)
  VALUES (NEW.id, NULL, 'staff')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SAMPLE DATA (optional - remove in production)
-- ============================================

-- INSERT INTO stores (name, gst_number, plan_level)
-- VALUES ('Demo Electronics', '22AAAAA0000A1Z5', 2);
