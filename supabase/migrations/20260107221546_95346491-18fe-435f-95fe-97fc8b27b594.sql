-- Add bye teams to playoff_teams if not already present
INSERT INTO playoff_teams (team_id, name, season, made_playoffs)
VALUES 
  (17, 'Kansas City Chiefs', 2025, true),
  (8, 'Detroit Lions', 2025, true)
ON CONFLICT (team_id, season) DO NOTHING;

-- Create selectable_playoff_players view
CREATE OR REPLACE VIEW selectable_playoff_players AS
SELECT
  id,
  player_id,
  name,
  position,
  team_name,
  team_id,
  image_url,
  depth_chart_slot,
  depth_chart_rank,
  is_starter,
  season,
  "group"
FROM playoff_players
WHERE season = 2025
  AND "group" = 'Offense'
  AND depth_chart_slot IS NOT NULL
  AND depth_chart_rank IS NOT NULL
  AND (
    (depth_chart_slot = 'qb' AND depth_chart_rank IN (0, 1))
    OR (depth_chart_slot = 'rb' AND depth_chart_rank IN (0, 1))
    OR (depth_chart_slot IN ('wr1', 'wr2', 'wr3') AND depth_chart_rank = 0)
    OR (depth_chart_slot = 'te' AND depth_chart_rank IN (0, 1))
  )
ORDER BY team_name, depth_chart_slot, depth_chart_rank;