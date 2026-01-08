import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  isPlayoffWeek,
  isRegularSeasonWeek,
  groupPicksByUser,
  getSubmittedUserIds,
  isPastDeadline,
} from "@/lib/pickRevealLogic";

export interface SubmittedUser {
  userId: string;        // auth_user_id (UUID)
  displayName: string;
  avatarUrl: string | null;
}

export interface PickRevealStatus {
  currentUserSubmitted: boolean;  // Did THIS user submit complete picks?
  pastDeadline: boolean;          // Is it past first game kickoff?
  submittedUserIds: string[];     // List of auth_user_ids who have submitted
  submittedUsers: SubmittedUser[]; // User profiles for submitted users
  leagueMemberCount: number;
  submittedCount: number;
  firstGameKickoff: string | null;
}

async function fetchPickRevealStatus(
  week: number,
  leagueId: string,
  currentUserId: string,
  season: number = 2025
): Promise<PickRevealStatus> {
  const now = new Date();

  // 1. Get league member count
  const { data: members, error: membersError } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId);

  if (membersError) {
    console.error("Error fetching league members:", membersError);
    throw new Error("Failed to fetch league members");
  }

  const leagueMemberCount = members?.length || 0;

  // 2. Get picks for this week - use auth_user_id for proper user identification
  const { data: picks, error: picksError } = await supabase
    .from("user_picks")
    .select("auth_user_id, position_slot")
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("week", week);

  if (picksError) {
    console.error("Error fetching picks:", picksError);
    throw new Error("Failed to fetch picks");
  }

  // Group picks by user and find who has submitted complete picks
  const userSlots = groupPicksByUser(picks || []);
  const submittedUserIds = getSubmittedUserIds(userSlots);
  const submittedCount = submittedUserIds.length;
  const currentUserSubmitted = submittedUserIds.includes(currentUserId);

  // 2b. Fetch user profiles for submitted users (use public_profiles view to bypass RLS)
  let submittedUsers: SubmittedUser[] = [];
  if (submittedUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", submittedUserIds);

    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
    } else if (profiles) {
      submittedUsers = profiles.map(p => ({
        userId: p.id!,
        displayName: p.display_name || "Unknown",
        avatarUrl: p.avatar_url,
      }));
    }
  }

  // 3. Get first game kickoff time for this week
  // Use different tables for playoffs vs regular season
  let firstGameKickoff: string | null = null;

  if (isPlayoffWeek(week)) {
    // Playoff weeks use playoff_games table
    const { data: games, error: gamesError } = await supabase
      .from("playoff_games")
      .select("kickoff_at")
      .eq("season", season)
      .eq("week_index", week)
      .order("kickoff_at", { ascending: true })
      .limit(1);

    if (gamesError) {
      console.error("Error fetching playoff games:", gamesError);
    }
    firstGameKickoff = games?.[0]?.kickoff_at || null;
  } else {
    // Regular season weeks use regular_season_games table
    const { data: games, error: gamesError } = await supabase
      .from("regular_season_games")
      .select("game_date")
      .eq("season", season)
      .eq("week", week)
      .order("game_date", { ascending: true })
      .limit(1);

    if (gamesError) {
      console.error("Error fetching regular season games:", gamesError);
    }
    firstGameKickoff = games?.[0]?.game_date || null;
  }

  // 4. Determine if past deadline (first game kickoff)
  const pastDeadline = isPastDeadline(now, firstGameKickoff);

  return {
    currentUserSubmitted,
    pastDeadline,
    submittedUserIds,
    submittedUsers,
    leagueMemberCount,
    submittedCount,
    firstGameKickoff,
  };
}

export function usePickRevealStatus(
  week: number,
  leagueId: string | null,
  currentUserId: string | null,
  season: number = 2025
) {
  return useQuery({
    queryKey: ["pickRevealStatus", week, leagueId, currentUserId, season],
    queryFn: () => fetchPickRevealStatus(week, leagueId!, currentUserId!, season),
    // Enable for both playoffs (1-4) and regular season (14-17)
    enabled: !!leagueId && !!currentUserId && (isPlayoffWeek(week) || isRegularSeasonWeek(week)),
    // Refresh every 30 seconds to catch kickoff time and new submissions
    refetchInterval: 30000,
  });
}
