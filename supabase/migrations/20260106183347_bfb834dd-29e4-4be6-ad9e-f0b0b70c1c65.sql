ALTER TABLE public.playoff_players
  ADD COLUMN IF NOT EXISTS depth_chart_position text,
  ADD COLUMN IF NOT EXISTS depth_chart_slot text,
  ADD COLUMN IF NOT EXISTS depth_chart_rank integer,
  ADD COLUMN IF NOT EXISTS depth_chart_formation text,
  ADD COLUMN IF NOT EXISTS depth_chart_source text NOT NULL DEFAULT 'espn',
  ADD COLUMN IF NOT EXISTS depth_chart_updated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_playoff_players_season_team_starter
  ON public.playoff_players (season, team_id, is_starter);

CREATE INDEX IF NOT EXISTS idx_playoff_players_depth_chart
  ON public.playoff_players (season, team_id, depth_chart_position, depth_chart_rank);