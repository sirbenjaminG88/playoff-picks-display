-- Remove overly permissive SELECT policies on leagues table
DROP POLICY IF EXISTS "Anon users can view leagues for joining" ON public.leagues;
DROP POLICY IF EXISTS "Authenticated users can view leagues" ON public.leagues;

-- Create restrictive policy: only league members can view their leagues
-- Uses the existing security definer function to avoid recursion
CREATE POLICY "League members can view their leagues" 
ON public.leagues 
FOR SELECT 
TO authenticated
USING (id IN (SELECT public.get_user_league_ids(auth.uid())));