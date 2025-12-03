-- MASTER SECURITY FIX

-- 1. PROFILES TABLE - Add SELECT policy for own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. USER_ROLES TABLE - Allow admins to see all roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles or admins can view all"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. Create helper function to get current user's display_name (for user_picks RLS)
CREATE OR REPLACE FUNCTION public.get_my_display_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name FROM public.profiles WHERE id = auth.uid()
$$;

-- 4. USER_PICKS TABLE - Fix RLS policies
DROP POLICY IF EXISTS "Anyone can view picks" ON public.user_picks;
DROP POLICY IF EXISTS "Anyone can insert picks" ON public.user_picks;
DROP POLICY IF EXISTS "Anyone can delete picks" ON public.user_picks;

-- SELECT: Authenticated users can view all picks (needed for Results page)
-- NOTE: For pre-kickoff hiding, this will need a view/edge function later
CREATE POLICY "Authenticated users can view picks"
ON public.user_picks
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can only insert picks matching their display_name
CREATE POLICY "Users can insert own picks"
ON public.user_picks
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.get_my_display_name());

-- DELETE: Users can only delete their own picks
CREATE POLICY "Users can delete own picks"
ON public.user_picks
FOR DELETE
TO authenticated
USING (user_id = public.get_my_display_name());

-- UPDATE: Users can only update their own picks
CREATE POLICY "Users can update own picks"
ON public.user_picks
FOR UPDATE
TO authenticated
USING (user_id = public.get_my_display_name())
WITH CHECK (user_id = public.get_my_display_name());