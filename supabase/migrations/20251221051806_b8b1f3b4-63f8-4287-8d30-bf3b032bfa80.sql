-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create table to track sent reminders (prevents duplicates)
CREATE TABLE IF NOT EXISTS public.pick_reminder_sent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  league_id uuid NOT NULL,
  season integer NOT NULL,
  week integer NOT NULL,
  reminder_type text NOT NULL, -- '24h' or '1h'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id, season, week, reminder_type)
);

-- Enable RLS
ALTER TABLE public.pick_reminder_sent_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON public.pick_reminder_sent_log
  FOR ALL USING (false) WITH CHECK (false);

-- Create the reminder function
CREATE OR REPLACE FUNCTION public.send_pick_deadline_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_season integer := 2025;
  v_supabase_url text;
  v_service_role_key text;
  v_result jsonb := '{"reminders_sent": 0, "details": []}'::jsonb;
  v_week_record record;
  v_user_record record;
  v_user_ids uuid[];
  v_reminder_type text;
  v_time_message text;
  v_request_id bigint;
BEGIN
  -- Get Supabase URL and service role key from environment/vault
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://zdaqwylzpkqojwvhlibd.supabase.co';
  END IF;
  
  -- Try to get service role key from vault
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
  
  IF v_service_role_key IS NULL THEN
    RETURN jsonb_build_object('error', 'Service role key not found in vault');
  END IF;

  -- Find upcoming weeks with games in notification windows
  FOR v_week_record IN (
    -- Regular season games
    SELECT 
      season,
      week,
      'regular' as game_type,
      MIN(game_date) as first_game_time
    FROM regular_season_games
    WHERE season = v_current_season
      AND game_date IS NOT NULL
      AND game_date > now()
    GROUP BY season, week
    
    UNION ALL
    
    -- Playoff games
    SELECT 
      season,
      week_index as week,
      'playoff' as game_type,
      MIN(kickoff_at) as first_game_time
    FROM playoff_games
    WHERE season = v_current_season
      AND kickoff_at IS NOT NULL
      AND kickoff_at > now()
    GROUP BY season, week_index
  ) LOOP
    -- Determine reminder type based on time window
    v_reminder_type := NULL;
    v_time_message := NULL;
    
    -- 24-hour window: between 23 and 25 hours before game
    IF v_week_record.first_game_time BETWEEN (now() + interval '23 hours') AND (now() + interval '25 hours') THEN
      v_reminder_type := '24h';
      v_time_message := 'Games start in 24 hours!';
    -- 1-hour window: between 50 and 70 minutes before game
    ELSIF v_week_record.first_game_time BETWEEN (now() + interval '50 minutes') AND (now() + interval '70 minutes') THEN
      v_reminder_type := '1h';
      v_time_message := 'Games start in 1 hour!';
    END IF;
    
    -- Skip if not in a notification window
    IF v_reminder_type IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Find users with incomplete picks who haven't been reminded yet
    v_user_ids := ARRAY(
      SELECT DISTINCT lm.user_id
      FROM league_members lm
      -- Join with leagues to get season
      INNER JOIN leagues l ON l.id = lm.league_id AND l.season = v_week_record.season
      -- Ensure user has a push token
      INNER JOIN push_tokens pt ON pt.user_id = lm.user_id
      -- Left join to count picks
      LEFT JOIN (
        SELECT auth_user_id, league_id, COUNT(DISTINCT position_slot) as pick_count
        FROM user_picks
        WHERE season = v_week_record.season
          AND week = v_week_record.week
          AND position_slot IN ('QB', 'RB', 'FLEX')
        GROUP BY auth_user_id, league_id
      ) up ON up.auth_user_id = lm.user_id AND up.league_id = lm.league_id
      -- Check not already reminded
      WHERE NOT EXISTS (
        SELECT 1 FROM pick_reminder_sent_log prl
        WHERE prl.user_id = lm.user_id
          AND prl.league_id = lm.league_id
          AND prl.season = v_week_record.season
          AND prl.week = v_week_record.week
          AND prl.reminder_type = v_reminder_type
      )
      -- User has fewer than 3 picks (incomplete)
      AND COALESCE(up.pick_count, 0) < 3
    );
    
    -- Skip if no users to notify
    IF array_length(v_user_ids, 1) IS NULL OR array_length(v_user_ids, 1) = 0 THEN
      CONTINUE;
    END IF;
    
    -- Call edge function to send notifications
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/send-pick-deadline-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'title', 'Pick Deadline Reminder',
        'message', v_time_message || ' Don''t forget to submit your picks for Week ' || v_week_record.week || '.',
        'userIds', v_user_ids
      )
    ) INTO v_request_id;
    
    -- Log reminders for each user to prevent duplicates
    INSERT INTO pick_reminder_sent_log (user_id, league_id, season, week, reminder_type)
    SELECT 
      lm.user_id,
      lm.league_id,
      v_week_record.season,
      v_week_record.week,
      v_reminder_type
    FROM league_members lm
    INNER JOIN leagues l ON l.id = lm.league_id AND l.season = v_week_record.season
    WHERE lm.user_id = ANY(v_user_ids)
    ON CONFLICT (user_id, league_id, season, week, reminder_type) DO NOTHING;
    
    -- Update result
    v_result := jsonb_set(
      v_result,
      '{reminders_sent}',
      to_jsonb((v_result->>'reminders_sent')::int + array_length(v_user_ids, 1))
    );
    v_result := jsonb_set(
      v_result,
      '{details}',
      v_result->'details' || jsonb_build_array(jsonb_build_object(
        'week', v_week_record.week,
        'game_type', v_week_record.game_type,
        'reminder_type', v_reminder_type,
        'users_notified', array_length(v_user_ids, 1),
        'first_game_time', v_week_record.first_game_time
      ))
    );
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Schedule cron job to run every hour at minute 0
SELECT cron.schedule(
  'send-pick-deadline-reminders',
  '0 * * * *',
  $$SELECT public.send_pick_deadline_reminders()$$
);