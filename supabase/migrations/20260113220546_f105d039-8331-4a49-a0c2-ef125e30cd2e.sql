-- Fix the selectable_playoff_players view to work without depth_chart data
-- Filter by position and team status instead
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
  AND pp.position IN ('QB', 'RB', 'WR', 'TE')
  AND pt.made_playoffs = true
ORDER BY pp.team_name, pp.position, pp.name;