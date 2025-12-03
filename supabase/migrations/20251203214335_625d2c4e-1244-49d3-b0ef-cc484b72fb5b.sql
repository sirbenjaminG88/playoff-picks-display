-- Add player_name column to player_week_stats
ALTER TABLE public.player_week_stats
ADD COLUMN IF NOT EXISTS player_name text;

-- Backfill existing rows from playoff_players
UPDATE public.player_week_stats pws
SET player_name = pp.name
FROM public.playoff_players pp
WHERE pws.player_id = pp.player_id
  AND (pws.player_name IS NULL OR pws.player_name = '');