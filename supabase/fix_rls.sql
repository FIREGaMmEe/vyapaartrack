-- VyaparTrack - Apply RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('users','stores','products')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- STEP 2: Helper functions (bypass RLS)
-- ============================================
CREATE OR REPLACE FUNCTION get_my_store_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT store_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================
-- STEP 3: USERS policies (no self-reference)
-- ============================================
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (id = auth.uid() OR auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (id = auth.uid() OR auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

-- ============================================
-- STEP 4: STORES policies
-- ============================================
CREATE POLICY "stores_select" ON public.stores FOR SELECT
  USING (id = get_my_store_id() OR auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

CREATE POLICY "stores_insert" ON public.stores FOR INSERT
  WITH CHECK (auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

CREATE POLICY "stores_update" ON public.stores FOR UPDATE
  USING ((id = get_my_store_id() AND get_my_role() = 'owner') OR auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

CREATE POLICY "stores_delete" ON public.stores FOR DELETE
  USING (auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

-- ============================================
-- STEP 5: PRODUCTS policies
-- ============================================
CREATE POLICY "products_select" ON public.products FOR SELECT
  USING (store_id = get_my_store_id() OR auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

CREATE POLICY "products_insert" ON public.products FOR INSERT
  WITH CHECK (store_id = get_my_store_id());

CREATE POLICY "products_update" ON public.products FOR UPDATE
  USING (store_id = get_my_store_id());

CREATE POLICY "products_delete" ON public.products FOR DELETE
  USING (store_id = get_my_store_id() OR auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

-- ============================================
-- STEP 6: Signup trigger
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
