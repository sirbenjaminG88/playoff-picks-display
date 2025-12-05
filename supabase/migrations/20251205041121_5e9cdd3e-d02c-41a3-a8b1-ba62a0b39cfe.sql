-- Add has_headshot column to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS has_headshot boolean DEFAULT false;

-- Add has_headshot column to playoff_players table  
ALTER TABLE public.playoff_players
ADD COLUMN IF NOT EXISTS has_headshot boolean DEFAULT false;

-- Update existing rows: set has_headshot = true where image_url is not null and doesn't look like a placeholder
UPDATE public.players 
SET has_headshot = (image_url IS NOT NULL AND image_url NOT LIKE '%/0.png%' AND image_url NOT LIKE '%players/0%');

UPDATE public.playoff_players
SET has_headshot = (image_url IS NOT NULL AND image_url NOT LIKE '%/0.png%' AND image_url NOT LIKE '%players/0%');