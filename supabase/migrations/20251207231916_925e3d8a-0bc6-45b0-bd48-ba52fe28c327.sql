-- Drop the existing authenticated-only SELECT policy on league_members
DROP POLICY IF EXISTS "Users can see members of their leagues" ON public.league_members;

-- Create a new policy that allows anyone to view league members
CREATE POLICY "Anyone can view league members"
ON public.league_members
FOR SELECT
USING (true);