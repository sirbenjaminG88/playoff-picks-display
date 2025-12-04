-- Clean up all test users except benjaminmgold@gmail.com from public tables
-- Note: auth.users cannot be modified via migrations (reserved schema)

-- Delete from league_members for non-admin users
DELETE FROM public.league_members
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email <> 'benjaminmgold@gmail.com'
);

-- Delete from user_picks for non-admin users
-- user_picks uses user_id as TEXT (display_name), so we need to match differently
DELETE FROM public.user_picks
WHERE user_id IN (
  SELECT display_name FROM public.profiles WHERE id IN (
    SELECT id FROM auth.users WHERE email <> 'benjaminmgold@gmail.com'
  )
);

-- Delete from profiles for non-admin users
DELETE FROM public.profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email <> 'benjaminmgold@gmail.com'
);

-- Delete from user_roles for non-admin users
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email <> 'benjaminmgold@gmail.com'
);

-- Delete from users for non-admin users
DELETE FROM public.users
WHERE id IN (
  SELECT id FROM auth.users WHERE email <> 'benjaminmgold@gmail.com'
);