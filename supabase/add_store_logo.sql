-- Add logo_url to stores table
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Storage bucket for store logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "store_logo_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "store_logo_view" ON storage.objects FOR SELECT
  USING (bucket_id = 'store-logos');

CREATE POLICY "store_logo_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);
