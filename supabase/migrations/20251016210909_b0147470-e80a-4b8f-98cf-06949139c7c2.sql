-- Remove the old cron job
SELECT cron.unschedule('game-progression-check');

-- Create new cron job that runs every 10 seconds
SELECT cron.schedule(
  'game-progression-check',
  '*/10 * * * * *', -- Every 10 seconds (6-field cron format with seconds)
  $$
  SELECT net.http_post(
    url := 'https://ptnsheniqitolomryvqu.supabase.co/functions/v1/game-progression',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnNoZW5pcWl0b2xvbXJ5dnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTk1MzMsImV4cCI6MjA3NjEzNTUzM30.a26ZQI6LkMicTsgXHYObPFIByNcdMjT1xC3D9BIx9I4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);