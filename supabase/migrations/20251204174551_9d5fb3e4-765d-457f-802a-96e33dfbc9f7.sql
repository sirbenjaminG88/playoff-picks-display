-- Add group column to players table for filtering active vs practice squad/IR
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS "group" text;

-- Backfill existing players to 'Offense' as a safe default (will be updated on next sync)
UPDATE public.players SET "group" = 'Offense' WHERE "group" IS NULL;