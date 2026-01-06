-- Add is_starter column to playoff_players for depth chart curation
ALTER TABLE playoff_players ADD COLUMN IF NOT EXISTS is_starter boolean DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_playoff_players_is_starter ON playoff_players (season, is_starter) WHERE is_starter = true;