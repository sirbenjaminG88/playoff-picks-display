-- Create regular_season_games table
CREATE TABLE IF NOT EXISTS public.regular_season_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season integer NOT NULL,
  week integer NOT NULL,
  season_type text NOT NULL DEFAULT 'REG',
  api_game_id bigint NOT NULL,
  game_date timestamptz,
  home_team_api_id integer NOT NULL,
  home_team_name text NOT NULL,
  home_team_abbr text,
  away_team_api_id integer NOT NULL,
  away_team_name text NOT NULL,
  away_team_abbr text,
  venue text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on (season, api_game_id)
CREATE UNIQUE INDEX IF NOT EXISTS regular_season_games_season_api_game_id_idx 
  ON public.regular_season_games (season, api_game_id);

-- Add index on (season, week) for fast week lookups
CREATE INDEX IF NOT EXISTS regular_season_games_season_week_idx 
  ON public.regular_season_games (season, week);

-- Enable RLS
ALTER TABLE public.regular_season_games ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view regular season games"
  ON public.regular_season_games
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert games"
  ON public.regular_season_games
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update games"
  ON public.regular_season_games
  FOR UPDATE
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_regular_season_games_updated_at
  BEFORE UPDATE ON public.regular_season_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();