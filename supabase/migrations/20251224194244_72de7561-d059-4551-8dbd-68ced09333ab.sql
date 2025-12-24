-- Ensure league creation policy exists and is PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create leagues" ON public.leagues;

CREATE POLICY "Authenticated users can create leagues"
ON public.leagues
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (true);
