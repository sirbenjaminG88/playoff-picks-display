-- Create sync_logs table to track sync attempts for rate limiting
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  players_updated INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  notes TEXT
);

-- Create index for efficient rate limit queries
CREATE INDEX idx_sync_logs_season_week_synced ON public.sync_logs(season, week, synced_at DESC);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view sync logs (useful for debugging)
CREATE POLICY "Anyone can view sync logs"
ON public.sync_logs FOR SELECT
USING (true);

-- Only service role can insert sync logs
CREATE POLICY "Service role can insert sync logs"
ON public.sync_logs FOR INSERT
WITH CHECK (true);

-- Enable realtime for player_week_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_week_stats;