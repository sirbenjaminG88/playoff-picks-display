-- Add injury_status column to track player availability
ALTER TABLE public.playoff_players 
ADD COLUMN IF NOT EXISTS injury_status text DEFAULT 'active';

-- Add comment explaining valid values
COMMENT ON COLUMN public.playoff_players.injury_status IS 'Player injury status: active, out, ir, questionable, doubtful, probable';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_playoff_players_injury_status ON public.playoff_players(injury_status);