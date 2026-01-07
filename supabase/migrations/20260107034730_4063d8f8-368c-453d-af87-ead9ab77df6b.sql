-- Create filtered view for curated playoff players
CREATE OR REPLACE VIEW playoff_players_filtered AS
SELECT * FROM playoff_players
WHERE depth_chart_slot IS NOT NULL
  AND depth_chart_rank IS NOT NULL
  AND (
    (depth_chart_slot = 'qb' AND depth_chart_rank IN (0, 1))
    OR (depth_chart_slot = 'rb' AND depth_chart_rank IN (0, 1))
    OR (depth_chart_slot IN ('wr1', 'wr2', 'wr3') AND depth_chart_rank = 0)
    OR (depth_chart_slot = 'te' AND depth_chart_rank IN (0, 1))
  );

-- Grant read access (view inherits RLS from base table)
GRANT SELECT ON playoff_players_filtered TO anon, authenticated;