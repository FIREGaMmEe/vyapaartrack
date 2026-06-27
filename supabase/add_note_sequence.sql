-- Sales note sequence tracker per store per year-month prefix
CREATE TABLE IF NOT EXISTS public.note_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  year_code   TEXT NOT NULL,   -- e.g. "26BB04" (YYAAMM), resets each month
  last_seq    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (store_id, year_code)
);

ALTER TABLE public.note_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_seq_select" ON public.note_sequences FOR SELECT
  USING (store_id = get_my_store_id() OR auth.uid() = 'c7c2b611-803a-42b2-861a-d769b903e511');

CREATE POLICY "store_seq_insert" ON public.note_sequences FOR INSERT
  WITH CHECK (store_id = get_my_store_id());

CREATE POLICY "store_seq_update" ON public.note_sequences FOR UPDATE
  USING (store_id = get_my_store_id());

-- Add note_number column to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS note_number TEXT;

-- Function to get next note number atomically
CREATE OR REPLACE FUNCTION get_next_note_number(p_store_id UUID, p_year_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO note_sequences (store_id, year_code, last_seq)
  VALUES (p_store_id, p_year_code, 1)
  ON CONFLICT (store_id, year_code)
  DO UPDATE SET last_seq = note_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN p_year_code || '1' || LPAD(v_seq::TEXT, 2, '0');
END;
$$;
