-- Add headshot_status column to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS headshot_status text DEFAULT 'unknown';

-- Initialize no_url status for rows without image_url
UPDATE public.players
SET headshot_status = 'no_url', has_headshot = false
WHERE image_url IS NULL AND headshot_status = 'unknown';

-- Leave rows with image_url as 'unknown' for the audit to classify