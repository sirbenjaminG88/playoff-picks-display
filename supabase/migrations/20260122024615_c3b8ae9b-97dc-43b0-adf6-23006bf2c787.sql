-- Drop and recreate view to include injury_status
DROP VIEW IF EXISTS selectable_playoff_players_v2;

CREATE VIEW selectable_playoff_players_v2 AS
SELECT 
    pp.id,
    pp.player_id,
    pp.name,
    pp."position",
    pp.team_id,
    pp.team_name,
    pp.image_url,
    pp.depth_chart_slot,
    pp.depth_chart_rank,
    pp.is_starter,
    pp.season,
    pp."group",
    pp.selection_override,
    pp.injury_status,
    CASE
        WHEN pp.selection_override = 'include' THEN true
        WHEN pp.selection_override = 'exclude' THEN false
        WHEN pp.selection_override = 'auto' OR pp.selection_override IS NULL THEN 
            pp.depth_chart_slot IS NOT NULL 
            AND pp.depth_chart_rank IS NOT NULL 
            AND (
                (pp.depth_chart_slot = 'qb' AND pp.depth_chart_rank IN (0, 1))
                OR (pp.depth_chart_slot = 'rb' AND pp.depth_chart_rank IN (0, 1))
                OR (pp.depth_chart_slot IN ('wr1', 'wr2', 'wr3') AND pp.depth_chart_rank = 0)
                OR (pp.depth_chart_slot = 'te' AND pp.depth_chart_rank IN (0, 1))
            )
        ELSE false
    END AS is_selectable,
    CASE
        WHEN pp.depth_chart_slot IS NOT NULL AND pp.depth_chart_rank IS NOT NULL THEN 
            upper(
                CASE
                    WHEN pp.depth_chart_slot IN ('wr1', 'wr2', 'wr3') THEN pp.depth_chart_slot
                    ELSE pp.depth_chart_slot || (pp.depth_chart_rank + 1)::text
                END
            )
        ELSE NULL
    END AS depth_chart_label
FROM playoff_players pp
JOIN playoff_teams pt ON pt.team_id = pp.team_id AND pt.season = pp.season
WHERE pp.season = 2025 
    AND pp."group" = 'Offense'
    AND pp."position" IN ('QB', 'RB', 'WR', 'TE')
    AND pt.made_playoffs = true;