-- Remove the old cron job
SELECT cron.unschedule('game-progression-check');

-- Create new cron job that runs every minute
-- pg_cron doesn't support seconds, so we'll use a different approach
-- This will check every minute, but we'll also have the frontend trigger it
SELECT cron.schedule(
  'game-progression-check',
  '* * * * *', -- Every minute (pg_cron minimum)
  $$
  SELECT net.http_post(
    url := 'https://ptnsheniqitolomryvqu.supabase.co/functions/v1/game-progression',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnNoZW5pcWl0b2xvbXJ5dnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTk1MzMsImV4cCI6MjA3NjEzNTUzM30.a26ZQI6LkMicTsgXHYObPFIByNcdMjT1xC3D9BIx9I4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);