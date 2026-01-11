-- Create cron job to call sync-live-stats with playoff mode every minute
SELECT cron.schedule(
  'sync-live-stats-playoff-api-sports',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zdaqwylzpkqojwvhlibd.supabase.co/functions/v1/sync-live-stats?mode=playoff',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkYXF3eWx6cGtxb2p3dmhsaWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Mzk1NjIsImV4cCI6MjA4MDIxNTU2Mn0._HwyqwiQlQ9bdt0mx4x-1c6x8n9rqk9mtPPtbVV6pb0", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);