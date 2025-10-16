-- Force types regeneration with a schema change
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS temp_column TEXT;
ALTER TABLE public.games DROP COLUMN IF EXISTS temp_column;