-- Add round_config column to games table to store correct doors
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS round_config JSONB DEFAULT '{"round_1": 1, "round_2": 1, "round_3": 1, "round_4": 1, "round_5": 1}'::jsonb;