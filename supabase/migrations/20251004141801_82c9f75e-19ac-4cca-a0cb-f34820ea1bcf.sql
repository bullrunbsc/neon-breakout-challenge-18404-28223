-- Add break_ends_at column to track when the break period should end
ALTER TABLE games ADD COLUMN break_ends_at timestamp with time zone;