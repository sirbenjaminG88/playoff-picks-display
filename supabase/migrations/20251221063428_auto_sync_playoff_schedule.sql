-- Auto-sync playoff schedule weekly
-- This cron job will automatically fetch the 2025 playoff schedule
-- from API-Sports once it becomes available (after Jan 4, 2026)

-- Create function to call the sync edge function
CREATE OR REPLACE FUNCTION public.trigger_playoff_schedule_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_request_id bigint;
  v_response jsonb;
BEGIN
  -- Get Supabase URL
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://zdaqwylzpkqojwvhlibd.supabase.co';
  END IF;

  -- Get anon key from vault (used for internal cron calls)
  SELECT decrypted_secret INTO v_anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'anon_key'
  LIMIT 1;

  IF v_anon_key IS NULL THEN
    RETURN jsonb_build_object('error', 'Anon key not found in vault');
  END IF;

  -- Call the edge function using pg_net
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/sync-2025-playoff-schedule',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_anon_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'timestamp', now()
  );
END;
$$;

-- Schedule cron job to run every Sunday at 3 AM ET (8 AM UTC)
-- Starting after Jan 4, 2026, this will check weekly for schedule updates
SELECT cron.schedule(
  'auto-sync-playoff-schedule',
  '0 8 * * 0',  -- Every Sunday at 8 AM UTC (3 AM ET)
  $$SELECT public.trigger_playoff_schedule_sync()$$
);
