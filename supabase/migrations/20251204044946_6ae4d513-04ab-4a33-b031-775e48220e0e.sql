-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can see members of their leagues" ON league_members;

-- Create a proper PERMISSIVE policy
CREATE POLICY "Users can see members of leagues they belong to" 
ON league_members 
FOR SELECT 
USING (
  league_id IN (
    SELECT lm.league_id 
    FROM league_members lm 
    WHERE lm.user_id = auth.uid()
  )
);