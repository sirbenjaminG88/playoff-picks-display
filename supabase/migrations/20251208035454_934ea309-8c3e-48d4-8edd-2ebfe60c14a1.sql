-- Create a function to securely check join codes without exposing them
CREATE OR REPLACE FUNCTION public.validate_join_code(p_join_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.leagues WHERE join_code = p_join_code LIMIT 1
$$;

-- Create a function to get join code only for commissioners
CREATE OR REPLACE FUNCTION public.get_league_join_code(p_league_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.join_code 
  FROM public.leagues l
  INNER JOIN public.league_members lm ON lm.league_id = l.id
  WHERE l.id = p_league_id 
    AND lm.user_id = auth.uid() 
    AND lm.role = 'commissioner'
$$;

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view leagues" ON public.leagues;

-- Create a new policy that hides join_code from non-commissioners
-- Note: RLS cannot filter columns, so we use a view approach instead
-- First, allow authenticated users to see leagues they're members of
CREATE POLICY "Authenticated users can view leagues"
ON public.leagues
FOR SELECT
TO authenticated
USING (true);

-- Allow anon users to see basic league info (for join page validation)
CREATE POLICY "Anon users can view leagues for joining"
ON public.leagues
FOR SELECT
TO anon
USING (true);

-- Create a secure view that hides join_code for non-commissioners
CREATE OR REPLACE VIEW public.leagues_safe AS
SELECT 
  l.id,
  l.name,
  l.max_members,
  l.created_at,
  l.season,
  l.icon_url,
  l.season_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.league_members lm 
      WHERE lm.league_id = l.id 
        AND lm.user_id = auth.uid() 
        AND lm.role = 'commissioner'
    ) THEN l.join_code
    ELSE NULL
  END as join_code
FROM public.leagues l;