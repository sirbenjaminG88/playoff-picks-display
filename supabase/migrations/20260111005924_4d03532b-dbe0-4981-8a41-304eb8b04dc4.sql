-- Add two_pt_conversions column to player_week_stats
ALTER TABLE public.player_week_stats 
ADD COLUMN two_pt_conversions integer DEFAULT 0;