-- Create scoring_settings table for configurable fantasy scoring
CREATE TABLE public.scoring_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,

  -- yardage: "yards per 1 point"
  pass_yds_per_point numeric NOT NULL DEFAULT 25,
  rush_yds_per_point numeric NOT NULL DEFAULT 10,
  rec_yds_per_point numeric NOT NULL DEFAULT 10,

  -- touchdowns: "points per TD"
  pass_td_points numeric NOT NULL DEFAULT 5,
  rush_td_points numeric NOT NULL DEFAULT 6,
  rec_td_points numeric NOT NULL DEFAULT 6,

  -- turnovers / misc
  interception_points numeric NOT NULL DEFAULT -2,
  fumble_lost_points numeric NOT NULL DEFAULT -2,
  two_pt_conversion_pts numeric NOT NULL DEFAULT 2,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scoring_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read scoring settings
CREATE POLICY "Anyone can view scoring settings"
ON public.scoring_settings
FOR SELECT
USING (true);

-- Service role can manage settings
CREATE POLICY "Service role can insert settings"
ON public.scoring_settings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update settings"
ON public.scoring_settings
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_scoring_settings_updated_at
BEFORE UPDATE ON public.scoring_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the default active settings row
INSERT INTO public.scoring_settings (
  name, is_active,
  pass_yds_per_point, rush_yds_per_point, rec_yds_per_point,
  pass_td_points, rush_td_points, rec_td_points,
  interception_points, fumble_lost_points, two_pt_conversion_pts
)
VALUES (
  'Default 2024', true,
  25, 10, 10,
  5, 6, 6,
  -2, -2, 2
);

-- Create a partial unique index to ensure only one active row
CREATE UNIQUE INDEX scoring_settings_single_active ON public.scoring_settings (is_active) WHERE is_active = true;