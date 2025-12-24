-- Drop the existing policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create leagues" ON public.leagues;

CREATE POLICY "Authenticated users can create leagues"
ON public.leagues
FOR INSERT
TO authenticated
WITH CHECK (true);