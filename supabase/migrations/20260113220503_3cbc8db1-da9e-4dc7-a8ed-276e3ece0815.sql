-- Fix the selectable_playoff_players view to use current playoff season (2024)
-- The playoffs are for the 2024 NFL season (games played Jan 2025)
CREATE OR REPLACE VIEW selectable_playoff_players AS
SELECT 
    pp.id,
    pp.player_id,
    pp.name,
    pp.position,
    pp.team_name,
    pp.team_id,
    pp.image_url,
    pp.depth_chart_slot,
    pp.depth_chart_rank,
    pp.is_starter,
    pp.season,
    pp.group
FROM playoff_players pp
INNER JOIN playoff_teams pt ON pt.team_id = pp.team_id AND pt.season = pp.season
WHERE pp.season = 2024
  AND pp.group = 'Offense'
  AND pp.depth_chart_slot IS NOT NULL
  AND pp.depth_chart_rank IS NOT NULL
  AND pt.made_playoffs = true
  AND (
    (pp.depth_chart_slot = 'qb' AND pp.depth_chart_rank IN (0, 1))
    OR (pp.depth_chart_slot = 'rb' AND pp.depth_chart_rank IN (0, 1))
    OR (pp.depth_chart_slot IN ('wr1', 'wr2', 'wr3') AND pp.depth_chart_rank = 0)
    OR (pp.depth_chart_slot = 'te' AND pp.depth_chart_rank IN (0, 1))
  )
ORDER BY pp.team_name, pp.depth_chart_slot, pp.depth_chart_rank;