-- Create playoff_players table
CREATE TABLE IF NOT EXISTS public.playoff_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  "group" TEXT,
  number TEXT,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  season INTEGER NOT NULL DEFAULT 2024,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_player_season UNIQUE (player_id, season)
);

-- Enable Row Level Security
ALTER TABLE public.playoff_players ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view playoff players"
  ON public.playoff_players
  FOR SELECT
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_playoff_players_updated_at
  BEFORE UPDATE ON public.playoff_players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_playoff_players_team_id ON public.playoff_players(team_id);
CREATE INDEX IF NOT EXISTS idx_playoff_players_season ON public.playoff_players(season);
CREATE INDEX IF NOT EXISTS idx_playoff_players_position ON public.playoff_players(position);