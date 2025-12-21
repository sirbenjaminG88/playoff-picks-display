-- Fix leagues_safe view: remove join_code exposure and add proper filtering
DROP VIEW IF EXISTS public.leagues_safe;

CREATE VIEW public.leagues_safe 
WITH (security_invoker = true)
AS
SELECT 
    id,
    name,
    season,
    season_type,
    max_members,
    icon_url,
    created_at
    -- join_code intentionally excluded - commissioners use get_league_join_code() function instead
FROM public.leagues
WHERE id IN (SELECT public.get_user_league_ids(auth.uid()));