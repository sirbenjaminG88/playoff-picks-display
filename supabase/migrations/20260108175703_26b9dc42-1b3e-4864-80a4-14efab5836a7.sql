-- Create function to get teams playing in a given week
-- Week 1: Only teams with scheduled games (12 teams)
-- Week 2+: All playoff teams including bye teams (14 teams)
CREATE OR REPLACE FUNCTION get_teams_playing_in_week(p_season INT, p_week INT)
RETURNS TABLE(team_id INT) AS $$
BEGIN
  IF p_week = 1 THEN
    -- Wild Card: Only teams with scheduled games
    RETURN QUERY
    SELECT DISTINCT home_team_external_id FROM playoff_games
    WHERE season = p_season AND week_index = p_week AND home_team_external_id > 0
    UNION
    SELECT DISTINCT away_team_external_id FROM playoff_games
    WHERE season = p_season AND week_index = p_week AND away_team_external_id > 0;
  ELSE
    -- Divisional and later: All playoff teams are eligible (bye teams now included)
    RETURN QUERY
    SELECT pt.team_id FROM playoff_teams pt
    WHERE pt.season = p_season AND pt.made_playoffs = true;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;