-- Remove overly-strict unique constraint that blocks multi-season storage
ALTER TABLE public.playoff_teams DROP CONSTRAINT IF EXISTS playoff_teams_team_id_key;

-- Ensure composite uniqueness exists for idempotent upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname='public'
      AND r.relname='playoff_teams'
      AND c.conname='playoff_teams_team_id_season_key'
  ) THEN
    ALTER TABLE public.playoff_teams ADD CONSTRAINT playoff_teams_team_id_season_key UNIQUE (team_id, season);
  END IF;
END
$$;