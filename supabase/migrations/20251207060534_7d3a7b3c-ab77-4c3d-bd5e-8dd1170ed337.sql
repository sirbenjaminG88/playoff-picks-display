-- Add espn_headshot_url column to store ESPN URLs for comparison
-- This does NOT modify existing image_url values
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS espn_headshot_url text;