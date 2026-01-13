-- Fix: Cast league_id to uuid for JOIN with leagues table
DROP FUNCTION IF EXISTS public.get_global_playoff_standings(integer, integer);

CREATE OR REPLACE FUNCTION public.get_global_playoff_standings(p_season integer, p_through_week integer)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH league_user_points AS (
    SELECT 
      up.auth_user_id,
      up.league_id,
      SUM(COALESCE(pws.fantasy_points_standard, 0))::double precision as points
    FROM user_picks up
    LEFT JOIN player_week_stats pws 
      ON pws.player_id = up.player_id 
      AND pws.week = up.week 
      AND pws.season = up.season
    INNER JOIN leagues l ON l.id = up.league_id::uuid
    WHERE up.season = p_season
      AND up.week >= 1 
      AND up.week <= p_through_week
      AND up.week <= 4
      AND l.name != '2025 Regular Season Beta Test'
      AND l.season_type = 'POST'
    GROUP BY up.auth_user_id, up.league_id
  ),
  best_league_per_user AS (
    SELECT 
      lup.auth_user_id,
      MAX(lup.points) as best_points
    FROM league_user_points lup
    GROUP BY lup.auth_user_id
  )
  SELECT 
    blpu.auth_user_id as user_id,
    u.display_name,
    u.avatar_url,
    blpu.best_points as total_points
  FROM best_league_per_user blpu
  LEFT JOIN users u ON u.id = blpu.auth_user_id
  WHERE blpu.auth_user_id IS NOT NULL
  ORDER BY blpu.best_points DESC;
END;
$$;