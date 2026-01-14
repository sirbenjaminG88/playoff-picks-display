-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view playoff players" ON playoff_players;

-- Create a new policy that allows everyone to view all playoff players
CREATE POLICY "Anyone can view playoff players"
ON playoff_players FOR SELECT
USING (true);