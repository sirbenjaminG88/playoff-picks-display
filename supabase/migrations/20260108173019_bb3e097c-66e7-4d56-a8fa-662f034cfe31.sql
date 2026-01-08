-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view revealed picks or own picks" ON user_picks;

-- Create new policy: users can see all picks in their leagues
-- Cast league_id to uuid since user_picks uses text and league_members uses uuid
CREATE POLICY "Users can view picks in their leagues" ON user_picks
FOR SELECT
USING (
  league_id::uuid IN (
    SELECT league_id FROM league_members
    WHERE user_id = auth.uid()
  )
);