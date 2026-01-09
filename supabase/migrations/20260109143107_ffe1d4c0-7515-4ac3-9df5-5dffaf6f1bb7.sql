-- Add policy to allow admins to view all picks
CREATE POLICY "Admins can view all picks"
ON public.user_picks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));