-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can see members of leagues they belong to" ON league_members;

-- Create a security definer function to get user's league IDs
CREATE OR REPLACE FUNCTION public.get_user_league_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT league_id FROM league_members WHERE user_id = _user_id
$$;

-- Create a proper permissive policy using the function
CREATE POLICY "Users can see members of their leagues" 
ON league_members 
FOR SELECT 
USING (
  league_id IN (SELECT public.get_user_league_ids(auth.uid()))
);