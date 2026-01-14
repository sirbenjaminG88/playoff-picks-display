-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create a new policy that only allows users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);