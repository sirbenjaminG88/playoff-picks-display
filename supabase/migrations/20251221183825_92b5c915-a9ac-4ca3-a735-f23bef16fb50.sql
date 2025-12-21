-- Fix 1: Restrict league_members to only show members of leagues the user belongs to
DROP POLICY IF EXISTS "Anyone can view league members" ON public.league_members;
CREATE POLICY "Users can view members of their leagues" 
ON public.league_members 
FOR SELECT 
TO authenticated
USING (league_id IN (SELECT public.get_user_league_ids(auth.uid())));

-- Fix 2: Recreate v_league_memberships view with built-in security filtering
-- This ensures users can only see membership data for leagues they belong to
DROP VIEW IF EXISTS public.v_league_memberships;

CREATE VIEW public.v_league_memberships 
WITH (security_invoker = false)
AS
SELECT 
    lm.id as membership_id,
    lm.league_id,
    l.season,
    lm.user_id,
    lm.role as league_role,
    ur.role as app_role,
    lm.joined_at,
    l.name as league_name,
    l.season_type,
    u.email,
    u.display_name,
    u.avatar_url
FROM public.league_members lm
JOIN public.leagues l ON l.id = lm.league_id
JOIN public.users u ON u.id = lm.user_id
LEFT JOIN public.user_roles ur ON ur.user_id = lm.user_id
WHERE lm.league_id IN (SELECT public.get_user_league_ids(auth.uid()));