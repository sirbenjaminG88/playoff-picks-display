-- Create daily playoff schedule sync at 3 AM EST (8 AM UTC)
-- This ensures we pick up the playoff bracket as soon as API-Sports publishes it

SELECT cron.schedule(
  'sync-playoff-schedule-daily',
  '0 8 * * *', -- Daily at 8 AM UTC (3 AM EST)
  $$
  SELECT net.http_post(
    url := 'https://zdaqwylzpkqojwvhlibd.supabase.co/functions/v1/sync-2025-playoff-schedule',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkYXF3eWx6cGtxb2p3dmhsaWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Mzk1NjIsImV4cCI6MjA4MDIxNTU2Mn0._HwyqwiQlQ9bdt0mx4x-1c6x8n9rqk9mtPPtbVV6pb0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);