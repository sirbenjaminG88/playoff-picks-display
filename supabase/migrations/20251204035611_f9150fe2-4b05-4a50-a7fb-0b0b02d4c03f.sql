-- Update league_members RLS policy to allow users to see all members of leagues they belong to
-- This is needed for features like pick reveal (checking if all members submitted)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can see their own memberships" ON public.league_members;

-- Create new policy that allows users to see all members of leagues they're part of
CREATE POLICY "Users can see members of their leagues"
ON public.league_members
FOR SELECT
USING (
  league_id IN (
    SELECT lm.league_id 
    FROM public.league_members lm 
    WHERE lm.user_id = auth.uid()
  )
);