-- Add foreign key columns to link games to internal playoff_teams
ALTER TABLE public.playoff_games
ADD COLUMN home_team_id uuid REFERENCES public.playoff_teams(id),
ADD COLUMN away_team_id uuid REFERENCES public.playoff_teams(id);

-- Backfill home_team_id by matching external team IDs
UPDATE public.playoff_games pg
SET home_team_id = pt.id
FROM public.playoff_teams pt
WHERE pt.team_id = pg.home_team_external_id
  AND pt.season = pg.season;

-- Backfill away_team_id by matching external team IDs  
UPDATE public.playoff_games pg
SET away_team_id = pt.id
FROM public.playoff_teams pt
WHERE pt.team_id = pg.away_team_external_id
  AND pt.season = pg.season;