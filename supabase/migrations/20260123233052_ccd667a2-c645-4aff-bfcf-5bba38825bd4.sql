-- Add DraftKings salary columns to playoff_players
ALTER TABLE playoff_players
ADD COLUMN dk_salary integer,
ADD COLUMN dk_salary_week integer;

COMMENT ON COLUMN playoff_players.dk_salary IS 'DraftKings salary in dollars';
COMMENT ON COLUMN playoff_players.dk_salary_week IS 'Playoff week this salary applies to (1=WC, 2=Div, 3=Conf, 4=SB)';

-- Recreate the selectable_playoff_players_v2 view to include salary columns
DROP VIEW IF EXISTS selectable_playoff_players_v2;

CREATE VIEW selectable_playoff_players_v2 AS
SELECT 
  pp.id,
  pp.player_id,
  pp.team_id,
  pp.name,
  pp.position,
  pp.team_name,
  pp.image_url,
  pp.depth_chart_slot,
  pp.depth_chart_rank,
  pp.is_starter,
  pp.season,
  pp.selection_override,
  pp.injury_status,
  pp."group",
  pp.dk_salary,
  pp.dk_salary_week,
  CASE 
    WHEN pp.selection_override = 'include' THEN true
    WHEN pp.selection_override = 'exclude' THEN false
    WHEN pp.injury_status IN ('out', 'ir') THEN false
    WHEN pp.is_starter = true THEN true
    WHEN pp.depth_chart_rank IS NOT NULL AND pp.depth_chart_rank <= 2 THEN true
    ELSE false
  END as is_selectable,
  CASE 
    WHEN pp.is_starter = true THEN 'Starter'
    WHEN pp.depth_chart_rank = 1 THEN '1st'
    WHEN pp.depth_chart_rank = 2 THEN '2nd'
    WHEN pp.depth_chart_rank = 3 THEN '3rd'
    ELSE NULL
  END as depth_chart_label
FROM playoff_players pp
WHERE pp.position IN ('QB', 'RB', 'WR', 'TE')
ORDER BY pp.team_name, pp.position, pp.depth_chart_rank NULLS LAST;