CREATE OR REPLACE FUNCTION public.get_league_join_code(p_league_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.join_code 
  FROM public.leagues l
  INNER JOIN public.league_members lm ON lm.league_id = l.id
  WHERE l.id = p_league_id 
    AND lm.user_id = auth.uid()
$$;