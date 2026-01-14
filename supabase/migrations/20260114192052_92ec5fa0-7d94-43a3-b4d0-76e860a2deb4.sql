-- Add selection_override column to playoff_players
ALTER TABLE playoff_players 
ADD COLUMN IF NOT EXISTS selection_override text DEFAULT 'auto' 
CHECK (selection_override IN ('auto', 'include', 'exclude'));

-- Allow admins to update playoff_players (for selection_override)
CREATE POLICY "Admins can update playoff players"
ON playoff_players FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create new view with computed is_selectable and depth_chart_label
CREATE OR REPLACE VIEW selectable_playoff_players_v2 AS
SELECT 
  pp.id,
  pp.player_id,
  pp.name,
  pp.position,
  pp.team_id,
  pp.team_name,
  pp.image_url,
  pp.depth_chart_slot,
  pp.depth_chart_rank,
  pp.is_starter,
  pp.season,
  pp."group",
  pp.selection_override,
  -- Computed is_selectable based on override + depth chart logic
  CASE
    WHEN pp.selection_override = 'include' THEN true
    WHEN pp.selection_override = 'exclude' THEN false
    WHEN pp.selection_override = 'auto' OR pp.selection_override IS NULL THEN 
      -- Depth chart logic: QB1/2, RB1/2, WR starters, TE1/2
      pp.depth_chart_slot IS NOT NULL AND pp.depth_chart_rank IS NOT NULL AND (
        (pp.depth_chart_slot = 'qb' AND pp.depth_chart_rank IN (0, 1)) OR
        (pp.depth_chart_slot = 'rb' AND pp.depth_chart_rank IN (0, 1)) OR
        (pp.depth_chart_slot IN ('wr1', 'wr2', 'wr3') AND pp.depth_chart_rank = 0) OR
        (pp.depth_chart_slot = 'te' AND pp.depth_chart_rank IN (0, 1))
      )
    ELSE false
  END as is_selectable,
  -- Friendly depth chart label (QB1, RB2, WR1, etc.)
  CASE
    WHEN pp.depth_chart_slot IS NOT NULL AND pp.depth_chart_rank IS NOT NULL THEN
      UPPER(
        CASE 
          WHEN pp.depth_chart_slot IN ('wr1', 'wr2', 'wr3') THEN pp.depth_chart_slot
          ELSE pp.depth_chart_slot || (pp.depth_chart_rank + 1)::text
        END
      )
    ELSE NULL
  END as depth_chart_label
FROM playoff_players pp
JOIN playoff_teams pt ON pt.team_id = pp.team_id AND pt.season = pp.season
WHERE pp.season = 2025 
  AND pp."group" = 'Offense'
  AND pp."position" IN ('QB', 'RB', 'WR', 'TE')
  AND pt.made_playoffs = true;