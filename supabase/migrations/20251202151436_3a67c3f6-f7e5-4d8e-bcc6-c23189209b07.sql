-- Drop the old unique constraint that's causing issues
ALTER TABLE public.playoff_players DROP CONSTRAINT IF EXISTS unique_player_season;

-- Ensure the correct unique constraint exists
ALTER TABLE public.playoff_players DROP CONSTRAINT IF EXISTS playoff_players_team_season_player_unique;
ALTER TABLE public.playoff_players ADD CONSTRAINT playoff_players_team_season_player_unique UNIQUE (team_id, season, player_id);