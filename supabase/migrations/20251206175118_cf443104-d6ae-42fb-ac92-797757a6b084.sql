-- Add points_for_headshot column to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS points_for_headshot double precision DEFAULT NULL;