-- Add unique constraint on (team_id, season, player_id) for upserts
-- First drop any existing unique constraint that might conflict
ALTER TABLE public.playoff_players DROP CONSTRAINT IF EXISTS playoff_players_player_id_season_key;

-- Add the correct unique constraint
ALTER TABLE public.playoff_players ADD CONSTRAINT playoff_players_team_season_player_unique UNIQUE (team_id, season, player_id);

-- Add trigger for updating updated_at timestamp
DROP TRIGGER IF EXISTS update_playoff_players_updated_at ON public.playoff_players;
CREATE TRIGGER update_playoff_players_updated_at
BEFORE UPDATE ON public.playoff_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();