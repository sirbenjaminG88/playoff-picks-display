-- Create canonical players table for all seasons
CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- NFL season year: 2025 = season that begins in 2025
  season integer NOT NULL,
  
  -- Player identifier from the external stats API
  api_player_id text NOT NULL,
  
  full_name text NOT NULL,
  first_name text,
  last_name text,
  position text NOT NULL,  -- QB, RB, WR, TE
  
  team_api_id text,
  team_name text,
  team_abbr text,  -- e.g. BUF, KC, DAL
  
  jersey_number text,
  status text,  -- active, injured, etc.
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one record per (season, api_player_id)
CREATE UNIQUE INDEX IF NOT EXISTS players_season_api_player_id_idx
  ON public.players (season, api_player_id);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Anyone can view players
CREATE POLICY "Anyone can view players"
  ON public.players
  FOR SELECT
  USING (true);

-- Service role can insert/update players
CREATE POLICY "Service role can insert players"
  ON public.players
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update players"
  ON public.players
  FOR UPDATE
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER set_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();