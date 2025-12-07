-- Drop the existing authenticated-only SELECT policy
DROP POLICY IF EXISTS "Authenticated can read leagues" ON public.leagues;

-- Create a new policy that allows anyone (including unauthenticated) to read leagues
CREATE POLICY "Anyone can view leagues"
ON public.leagues
FOR SELECT
USING (true);