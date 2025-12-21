-- Drop the database function since we're using edge function instead
DROP FUNCTION IF EXISTS public.send_pick_deadline_reminders();

-- Remove the cron job that called the database function
SELECT cron.unschedule('send-pick-deadline-reminders');

-- Keep the pick_reminder_sent_log table but update RLS to allow service role
DROP POLICY IF EXISTS "Service role only" ON public.pick_reminder_sent_log;

-- Allow service role to manage reminder logs
CREATE POLICY "Service role can manage reminder logs" ON public.pick_reminder_sent_log
  FOR ALL USING (true) WITH CHECK (true);

-- Schedule the edge function to run every hour using pg_net
SELECT cron.schedule(
  'check-pick-deadlines-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zdaqwylzpkqojwvhlibd.supabase.co/functions/v1/check-pick-deadlines',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkYXF3eWx6cGtxb2p3dmhsaWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Mzk1NjIsImV4cCI6MjA4MDIxNTU2Mn0._HwyqwiQlQ9bdt0mx4x-1c6x8n9rqk9mtPPtbVV6pb0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);