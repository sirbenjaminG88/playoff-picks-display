-- Fix the function - cast to double precision to match player_week_stats column type
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
  WITH pick_points AS (
    SELECT 
      up.auth_user_id,
      SUM(COALESCE(pws.fantasy_points_standard, 0))::double precision as points
    FROM user_picks up
    LEFT JOIN player_week_stats pws 
      ON pws.player_id = up.player_id 
      AND pws.week = up.week 
      AND pws.season = up.season
    WHERE up.season = p_season
      AND up.week >= 1 
      AND up.week <= p_through_week
      AND up.week <= 4
    GROUP BY up.auth_user_id
  )
  SELECT 
    pp.auth_user_id as user_id,
    u.display_name,
    u.avatar_url,
    pp.points as total_points
  FROM pick_points pp
  LEFT JOIN users u ON u.id = pp.auth_user_id
  WHERE pp.auth_user_id IS NOT NULL
  ORDER BY pp.points DESC;
END;
$$;