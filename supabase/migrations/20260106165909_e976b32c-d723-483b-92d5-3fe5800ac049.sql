-- Add unique constraint on team_id and season for upsert operations
ALTER TABLE public.playoff_teams ADD CONSTRAINT playoff_teams_team_id_season_key UNIQUE (team_id, season);