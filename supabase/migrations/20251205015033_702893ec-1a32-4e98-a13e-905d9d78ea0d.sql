-- Create a function to check if picks should be revealed for a given week
-- This is SECURITY DEFINER to bypass RLS when checking game times and member submissions
CREATE OR REPLACE FUNCTION public.picks_revealed_for_week(
  p_league_id text,
  p_season integer,
  p_week integer
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_game_kickoff timestamptz;
  league_member_count integer;
  submitted_count integer;
BEGIN
  -- Get first game kickoff for this week (regular season)
  SELECT game_date INTO first_game_kickoff
  FROM regular_season_games
  WHERE season = p_season AND week = p_week
  ORDER BY game_date ASC
  LIMIT 1;
  
  -- If no regular season game found, try playoff games
  IF first_game_kickoff IS NULL THEN
    SELECT kickoff_at INTO first_game_kickoff
    FROM playoff_games
    WHERE season = p_season AND week_index = p_week
    ORDER BY kickoff_at ASC
    LIMIT 1;
  END IF;
  
  -- Condition 1: Past first game kickoff
  IF first_game_kickoff IS NOT NULL AND now() >= first_game_kickoff THEN
    RETURN true;
  END IF;
  
  -- Condition 2: All league members have submitted picks
  -- Count league members
  SELECT COUNT(*) INTO league_member_count
  FROM league_members
  WHERE league_id = p_league_id::uuid;
  
  IF league_member_count = 0 THEN
    RETURN false;
  END IF;
  
  -- Count users with complete submissions (QB, RB, and FLEX)
  SELECT COUNT(DISTINCT auth_user_id) INTO submitted_count
  FROM (
    SELECT auth_user_id
    FROM user_picks
    WHERE league_id = p_league_id
      AND season = p_season
      AND week = p_week
    GROUP BY auth_user_id
    HAVING COUNT(DISTINCT position_slot) FILTER (WHERE position_slot IN ('QB', 'RB', 'FLEX')) = 3
  ) complete_submissions;
  
  -- All members submitted
  IF submitted_count >= league_member_count THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create a function to check if a user can view a specific pick
CREATE OR REPLACE FUNCTION public.can_view_pick(p_viewer uuid, p_pick user_picks)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always allow owner to see their own picks
  IF p_pick.auth_user_id = p_viewer THEN
    RETURN true;
  END IF;
  
  -- Check if picks are revealed for this week
  RETURN picks_revealed_for_week(p_pick.league_id, p_pick.season, p_pick.week);
END;
$$;

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view picks" ON user_picks;

-- Create new restrictive SELECT policy using the function
CREATE POLICY "Users can view revealed picks or own picks"
  ON user_picks
  FOR SELECT
  TO authenticated
  USING (can_view_pick(auth.uid(), user_picks));