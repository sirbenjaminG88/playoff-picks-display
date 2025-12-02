-- Create playoff_teams table
CREATE TABLE IF NOT EXISTS public.playoff_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id integer NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  season integer NOT NULL DEFAULT 2024,
  made_playoffs boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.playoff_teams ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (this is static reference data)
CREATE POLICY "Anyone can view playoff teams"
  ON public.playoff_teams
  FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_playoff_teams_season ON public.playoff_teams(season);
CREATE INDEX idx_playoff_teams_team_id ON public.playoff_teams(team_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playoff_teams_updated_at
  BEFORE UPDATE ON public.playoff_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();