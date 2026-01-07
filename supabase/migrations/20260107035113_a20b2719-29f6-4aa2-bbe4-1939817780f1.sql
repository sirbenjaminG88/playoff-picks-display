-- Drop existing SELECT policy on playoff_players
DROP POLICY IF EXISTS "Anyone can view playoff players" ON playoff_players;

-- Create new policy with depth chart filter
-- This ensures ALL queries only return curated players (the ~108 selectable ones)
CREATE POLICY "Anyone can view playoff players" ON playoff_players
FOR SELECT
USING (
  depth_chart_slot IS NOT NULL
  AND depth_chart_rank IS NOT NULL
  AND (
    (depth_chart_slot = 'qb' AND depth_chart_rank IN (0, 1))
    OR (depth_chart_slot = 'rb' AND depth_chart_rank IN (0, 1))
    OR (depth_chart_slot IN ('wr1', 'wr2', 'wr3') AND depth_chart_rank = 0)
    OR (depth_chart_slot = 'te' AND depth_chart_rank IN (0, 1))
  )
);