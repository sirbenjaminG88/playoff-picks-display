import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PickRevealStatus {
  isRevealed: boolean;
  reason: "all_submitted" | "past_kickoff" | "not_revealed";
  leagueMemberCount: number;
  submittedCount: number;
  firstGameKickoff: string | null;
}

async function fetchPickRevealStatus(
  week: number,
  leagueId: string,
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

  // 2. Get count of users who have submitted picks for this week
  // A user has submitted if they have all 3 position slots filled (QB, RB, FLEX)
  const { data: picks, error: picksError } = await supabase
    .from("user_picks")
    .select("user_id, position_slot")
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("week", week);

  if (picksError) {
    console.error("Error fetching picks count:", picksError);
    throw new Error("Failed to fetch picks count");
  }

  // Count users with complete picks (all 3 slots)
  const userSlots = new Map<string, Set<string>>();
  picks?.forEach((pick) => {
    if (!userSlots.has(pick.user_id)) {
      userSlots.set(pick.user_id, new Set());
    }
    userSlots.get(pick.user_id)?.add(pick.position_slot);
  });

  const submittedCount = Array.from(userSlots.values()).filter(
    (slots) => slots.has("QB") && slots.has("RB") && slots.has("FLEX")
  ).length;

  // 3. Get first game kickoff time for this week
  const { data: games, error: gamesError } = await supabase
    .from("regular_season_games")
    .select("game_date")
    .eq("season", season)
    .eq("week", week)
    .order("game_date", { ascending: true })
    .limit(1);

  if (gamesError) {
    console.error("Error fetching first game:", gamesError);
  }

  const firstGameKickoff = games?.[0]?.game_date || null;

  // 4. Determine reveal status
  // Condition 1: All league members have submitted picks
  const allSubmitted = leagueMemberCount > 0 && submittedCount >= leagueMemberCount;
  
  // Condition 2: Current time is past first game kickoff
  const pastKickoff = firstGameKickoff && now >= new Date(firstGameKickoff);

  let isRevealed = false;
  let reason: "all_submitted" | "past_kickoff" | "not_revealed" = "not_revealed";

  if (allSubmitted) {
    isRevealed = true;
    reason = "all_submitted";
  } else if (pastKickoff) {
    isRevealed = true;
    reason = "past_kickoff";
  }

  return {
    isRevealed,
    reason,
    leagueMemberCount,
    submittedCount,
    firstGameKickoff,
  };
}

export function usePickRevealStatus(week: number, leagueId: string | null, season: number = 2025) {
  return useQuery({
    queryKey: ["pickRevealStatus", week, leagueId, season],
    queryFn: () => fetchPickRevealStatus(week, leagueId!, season),
    enabled: !!leagueId && week >= 14 && week <= 17,
    // Refresh every 30 seconds to catch kickoff time
    refetchInterval: 30000,
  });
}
