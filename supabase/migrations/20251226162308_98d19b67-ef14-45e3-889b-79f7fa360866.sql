-- Create a function to get league details for join flow (bypasses RLS for non-members)
CREATE OR REPLACE FUNCTION public.get_league_by_join_code(p_join_code text)
RETURNS TABLE (
  id uuid,
  name text,
  max_members integer,
  season integer,
  season_type text,
  icon_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.id,
    l.name,
    l.max_members,
    l.season,
    l.season_type,
    l.icon_url
  FROM public.leagues l
  WHERE l.join_code = p_join_code
  LIMIT 1
$$;