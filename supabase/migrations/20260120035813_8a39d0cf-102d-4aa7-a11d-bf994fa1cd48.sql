-- Add projection columns to playoff_players table
ALTER TABLE public.playoff_players
  ADD COLUMN IF NOT EXISTS espn_player_id TEXT,
  ADD COLUMN IF NOT EXISTS regular_season_avg_pts NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS regular_season_games INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_pts NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS projection_source TEXT,
  ADD COLUMN IF NOT EXISTS projection_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient projection lookups
CREATE INDEX IF NOT EXISTS idx_playoff_players_projected_pts
  ON public.playoff_players (season, projected_pts DESC);