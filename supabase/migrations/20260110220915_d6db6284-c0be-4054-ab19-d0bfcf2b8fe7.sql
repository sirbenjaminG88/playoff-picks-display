-- Create a cron job that runs every minute to sync live playoff stats
-- This will only actually fetch stats when games are active (checked inside the function)
SELECT cron.schedule(
  'sync-live-playoff-stats',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://zdaqwylzpkqojwvhlibd.supabase.co/functions/v1/sync-live-playoff-stats',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);