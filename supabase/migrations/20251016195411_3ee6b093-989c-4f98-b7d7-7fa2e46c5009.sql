-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the game progression edge function to run every 2 seconds
SELECT cron.schedule(
  'game-progression-check',
  '*/2 * * * * *', -- Every 2 seconds
  $$
  SELECT net.http_post(
    url := 'https://ptnsheniqitolomryvqu.supabase.co/functions/v1/game-progression',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnNoZW5pcWl0b2xvbXJ5dnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTk1MzMsImV4cCI6MjA3NjEzNTUzM30.a26ZQI6LkMicTsgXHYObPFIByNcdMjT1xC3D9BIx9I4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);