CREATE OR REPLACE FUNCTION public.create_league(
  p_name text,
  p_season integer,
  p_season_type text,
  p_max_members integer DEFAULT 4,
  p_icon_url text DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_league_id uuid;
  new_join_code text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate unique join code
  new_join_code := generate_funny_join_code();
  
  -- Insert the league
  INSERT INTO public.leagues (name, season, season_type, max_members, icon_url, join_code)
  VALUES (p_name, p_season, p_season_type, p_max_members, p_icon_url, new_join_code)
  RETURNING leagues.id INTO new_league_id;
  
  -- Add creator as commissioner
  INSERT INTO public.league_members (league_id, user_id, role)
  VALUES (new_league_id, auth.uid(), 'commissioner');
  
  -- Return the league data
  RETURN QUERY SELECT new_league_id, p_name, new_join_code;
END;
$$;