-- VyaparTrack - Add name to users + photo_url to products
-- Run this in Supabase SQL Editor

-- 1. Add name column to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Add photo_url column to products (stores Supabase Storage URL)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Create storage bucket for product photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies — anyone in the same store can upload/view
CREATE POLICY "store_users_can_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "store_users_can_view"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-photos');

CREATE POLICY "store_users_can_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-photos'
    AND auth.uid() IS NOT NULL
  );
