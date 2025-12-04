-- Admin-only reporting view: shows all users and their league memberships in one place
-- This view is for human readability and debugging purposes
-- Uses security_barrier to enforce admin-only access

CREATE OR REPLACE VIEW public.v_league_memberships 
WITH (security_barrier = true) AS
SELECT
  lm.id AS membership_id,
  lm.league_id,
  l.name AS league_name,
  l.season,
  l.season_type,
  u.id AS user_id,
  u.email,
  u.display_name,
  u.avatar_url,
  lm.role AS league_role,
  ur.role AS app_role,
  lm.joined_at
FROM public.league_members lm
JOIN public.leagues l ON l.id = lm.league_id
JOIN public.users u ON u.id = lm.user_id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE public.has_role(auth.uid(), 'admin');

-- Add comment for documentation
COMMENT ON VIEW public.v_league_memberships IS 'Admin-only view: shows all users and their league memberships for reporting and debugging. Only users with admin role can see results.';