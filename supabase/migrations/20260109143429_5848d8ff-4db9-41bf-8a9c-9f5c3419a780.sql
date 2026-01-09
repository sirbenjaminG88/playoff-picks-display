-- Drop the existing restrictive select policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a new policy that allows users to view all profiles (public info only)
-- The view already limits what columns are exposed
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Keep the update policy restricted to own profile
-- (already exists: "Users can update own profile")