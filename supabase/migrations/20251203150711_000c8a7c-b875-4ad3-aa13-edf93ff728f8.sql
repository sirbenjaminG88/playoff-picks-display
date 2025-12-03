-- Create playoff_games table for storing playoff schedule
CREATE TABLE public.playoff_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  season int NOT NULL,
  week_index int NOT NULL,           -- 1=WC, 2=DIV, 3=CONF, 4=SB
  week_label text NOT NULL,          -- "Wild Card", "Divisional Round", etc.
  stage text NOT NULL,               -- should be "Post Season"
  
  game_id int NOT NULL,              -- API-Sports game id
  home_team_external_id int NOT NULL,
  away_team_external_id int NOT NULL,
  
  kickoff_at timestamptz,
  venue_name text,
  venue_city text,
  
  home_score int,
  away_score int,
  
  status_short text,                 -- "FT", "NS", etc.
  status_long text,                  -- "Finished", "Not Started", etc.
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (season, game_id)
);

-- Enable RLS
ALTER TABLE public.playoff_games ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read playoff games
CREATE POLICY "Anyone can view playoff games"
ON public.playoff_games
FOR SELECT
USING (true);

-- Allow service role to insert/update
CREATE POLICY "Service role can insert games"
ON public.playoff_games
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update games"
ON public.playoff_games
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_playoff_games_updated_at
BEFORE UPDATE ON public.playoff_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();