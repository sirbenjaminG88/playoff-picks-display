-- Create player_week_stats table for storing weekly player statistics
CREATE TABLE public.player_week_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season int NOT NULL DEFAULT 2024,
  week int NOT NULL,
  player_id int NOT NULL,
  
  pass_yds float DEFAULT 0,
  pass_tds int DEFAULT 0,
  interceptions int DEFAULT 0,
  
  rush_yds float DEFAULT 0,
  rush_tds int DEFAULT 0,
  
  rec_yds float DEFAULT 0,
  rec_tds int DEFAULT 0,
  
  fumbles_lost int DEFAULT 0,
  
  fantasy_points_standard float DEFAULT 0,
  raw_json jsonb,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  UNIQUE (season, week, player_id)
);

-- Enable RLS
ALTER TABLE public.player_week_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view stats
CREATE POLICY "Anyone can view player stats"
ON public.player_week_stats
FOR SELECT
USING (true);

-- Allow inserts (for edge function via service role)
CREATE POLICY "Service role can insert stats"
ON public.player_week_stats
FOR INSERT
WITH CHECK (true);

-- Allow updates (for edge function via service role)
CREATE POLICY "Service role can update stats"
ON public.player_week_stats
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_player_week_stats_updated_at
BEFORE UPDATE ON public.player_week_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_player_week_stats_lookup ON public.player_week_stats(season, week, player_id);