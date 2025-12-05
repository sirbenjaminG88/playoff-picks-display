-- Create headshot_overrides table
CREATE TABLE public.headshot_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season INTEGER NOT NULL,
  api_player_id TEXT NOT NULL,
  player_full_name TEXT,
  team_abbr TEXT,
  espn_player_id TEXT,
  espn_headshot_url TEXT NOT NULL,
  source TEXT DEFAULT 'espn',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint on season + api_player_id
ALTER TABLE public.headshot_overrides 
ADD CONSTRAINT headshot_overrides_season_api_player_id_key 
UNIQUE (season, api_player_id);

-- Add index on api_player_id for lookups
CREATE INDEX idx_headshot_overrides_api_player_id ON public.headshot_overrides(api_player_id);

-- Enable RLS
ALTER TABLE public.headshot_overrides ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for edge functions)
CREATE POLICY "Anyone can view headshot overrides"
ON public.headshot_overrides FOR SELECT
USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can insert overrides"
ON public.headshot_overrides FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update overrides"
ON public.headshot_overrides FOR UPDATE
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_headshot_overrides_updated_at
BEFORE UPDATE ON public.headshot_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();