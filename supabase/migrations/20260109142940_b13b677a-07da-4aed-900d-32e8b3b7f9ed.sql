-- Add policy to allow admins to view all leagues
CREATE POLICY "Admins can view all leagues"
ON public.leagues
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));