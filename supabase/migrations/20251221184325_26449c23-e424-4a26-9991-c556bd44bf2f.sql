-- Fix v_league_memberships: Remove email column entirely to prevent exposure
DROP VIEW IF EXISTS public.v_league_memberships;

CREATE VIEW public.v_league_memberships
WITH (security_invoker = true)
AS
SELECT 
    lm.id AS membership_id,
    lm.league_id,
    l.season,
    lm.user_id,
    lm.role AS league_role,
    ur.role AS app_role,
    lm.joined_at,
    l.name AS league_name,
    l.season_type,
    -- email intentionally EXCLUDED for privacy
    u.display_name,
    u.avatar_url
FROM league_members lm
JOIN leagues l ON l.id = lm.league_id
JOIN users u ON u.id = lm.user_id
LEFT JOIN user_roles ur ON ur.user_id = lm.user_id
WHERE lm.league_id IN (SELECT public.get_user_league_ids(auth.uid()));