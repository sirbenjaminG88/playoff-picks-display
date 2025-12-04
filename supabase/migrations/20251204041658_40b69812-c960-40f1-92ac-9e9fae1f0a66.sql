-- Drop the old unique constraint
ALTER TABLE public.user_picks DROP CONSTRAINT IF EXISTS user_picks_user_id_league_id_season_week_position_slot_key;

-- Create new unique constraint on auth_user_id
ALTER TABLE public.user_picks ADD CONSTRAINT user_picks_auth_user_id_unique 
  UNIQUE (auth_user_id, league_id, season, week, position_slot);