-- Add countdown_minutes column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS countdown_minutes INTEGER DEFAULT 1;