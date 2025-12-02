-- Create user_picks table to store weekly player selections
CREATE TABLE public.user_picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  league_id TEXT NOT NULL DEFAULT 'playoff-league-2024',
  season INTEGER NOT NULL DEFAULT 2024,
  week INTEGER NOT NULL,
  position_slot TEXT NOT NULL CHECK (position_slot IN ('QB', 'RB', 'FLEX')),
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  position TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, league_id, season, week, position_slot)
);

-- Enable RLS
ALTER TABLE public.user_picks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read picks (for now - can restrict later)
CREATE POLICY "Anyone can view picks" ON public.user_picks FOR SELECT USING (true);

-- Allow anyone to insert picks (for now - no auth yet)
CREATE POLICY "Anyone can insert picks" ON public.user_picks FOR INSERT WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_user_picks_updated_at
BEFORE UPDATE ON public.user_picks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();