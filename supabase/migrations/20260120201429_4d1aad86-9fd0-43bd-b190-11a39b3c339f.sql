CREATE OR REPLACE FUNCTION public.get_teams_playing_in_week(p_season integer, p_week integer)
 RETURNS TABLE(team_id integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  IF p_week = 1 THEN
    -- Wild Card: Only teams with scheduled games (excludes bye teams)
    RETURN QUERY
    SELECT DISTINCT home_team_external_id FROM playoff_games
    WHERE season = p_season AND week_index = p_week AND home_team_external_id > 0
    UNION
    SELECT DISTINCT away_team_external_id FROM playoff_games
    WHERE season = p_season AND week_index = p_week AND away_team_external_id > 0;
    
  ELSIF p_week = 2 THEN
    -- Divisional: Bye teams + Wild Card winners
    RETURN QUERY
    SELECT pt.team_id FROM playoff_teams pt
    WHERE pt.season = p_season AND pt.made_playoffs = true
      AND pt.team_id NOT IN (
        SELECT home_team_external_id FROM playoff_games WHERE season = p_season AND week_index = 1
        UNION
        SELECT away_team_external_id FROM playoff_games WHERE season = p_season AND week_index = 1
      )
    UNION
    -- Wild Card winners: check scores exist (handles FT, AOT, and any finished status)
    SELECT CASE 
      WHEN pg.home_score > pg.away_score THEN pg.home_team_external_id
      ELSE pg.away_team_external_id
    END as team_id
    FROM playoff_games pg
    WHERE pg.season = p_season 
      AND pg.week_index = 1 
      AND pg.home_score IS NOT NULL 
      AND pg.away_score IS NOT NULL;
      
  ELSIF p_week = 3 THEN
    -- Conference Championship: Divisional winners only
    RETURN QUERY
    SELECT CASE 
      WHEN pg.home_score > pg.away_score THEN pg.home_team_external_id
      ELSE pg.away_team_external_id
    END as team_id
    FROM playoff_games pg
    WHERE pg.season = p_season 
      AND pg.week_index = 2 
      AND pg.home_score IS NOT NULL 
      AND pg.away_score IS NOT NULL;
      
  ELSIF p_week = 4 THEN
    -- Super Bowl: Conference Championship winners only
    RETURN QUERY
    SELECT CASE 
      WHEN pg.home_score > pg.away_score THEN pg.home_team_external_id
      ELSE pg.away_team_external_id
    END as team_id
    FROM playoff_games pg
    WHERE pg.season = p_season 
      AND pg.week_index = 3 
      AND pg.home_score IS NOT NULL 
      AND pg.away_score IS NOT NULL;
      
  ELSE
    -- Fallback: return empty set
    RETURN;
  END IF;
END;
$function$;