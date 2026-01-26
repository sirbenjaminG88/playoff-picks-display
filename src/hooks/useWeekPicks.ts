import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePickRevealStatus, PickRevealStatus } from "./usePickRevealStatus";

export interface PlayerWeekStats {
  pass_yds: number;
  pass_tds: number;
  interceptions: number;
  rush_yds: number;
  rush_tds: number;
  rec_yds: number;
  rec_tds: number;
  fumbles_lost: number;
  two_pt_conversions: number;
  fantasy_points_standard: number;
}

export interface GroupedPlayer {
  playerId: number;
  playerName: string;
  teamName: string;
  teamId: number;
  position: string;
  positionSlot: string;
  imageUrl: string | null;
  selectedBy: string[];
  selectedByAuthIds: string[]; // auth_user_ids for accurate aggregation
  points: number;
  hasStats: boolean;
  stats: PlayerWeekStats | null;
}

export interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
}

export interface WeekPicksData {
  qbs: GroupedPlayer[];
  rbs: GroupedPlayer[];
  flex: GroupedPlayer[];
  allUsers: string[];
  userProfiles: Map<string, UserProfile>;
  authUserIdMap: Map<string, string>; // displayName -> auth_user_id mapping
  // Reveal status info
  revealStatus?: PickRevealStatus;
  canViewPicks: boolean;  // Whether current user can see picks
}

async function fetchWeekPicks(
  week: number,
  leagueId: string,
  season: number,
  revealStatus?: PickRevealStatus
): Promise<WeekPicksData> {
  // Determine what picks the user can see based on reveal status
  const canViewPicks = revealStatus
    ? (revealStatus.currentUserSubmitted || revealStatus.pastDeadline)
    : false;

  // If user can't view picks yet, return empty data with status
  if (!canViewPicks) {
    return {
      qbs: [],
      rbs: [],
      flex: [],
      allUsers: [],
      userProfiles: new Map(),
      authUserIdMap: new Map(),
      revealStatus,
      canViewPicks: false,
    };
  }

  // Fetch user picks
  const { data: picks, error: picksError } = await supabase
    .from("user_picks")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("week", week);

  if (picksError) {
    throw new Error(picksError.message);
  }

  if (!picks || picks.length === 0) {
    return {
      qbs: [],
      rbs: [],
      flex: [],
      allUsers: [],
      userProfiles: new Map(),
      authUserIdMap: new Map(),
      revealStatus,
      canViewPicks: true,
    };
  }

  // Filter picks based on reveal status:
  // - If past deadline: show all picks
  // - If before deadline: only show picks from users who have submitted
  let filteredPicks = picks;
  if (revealStatus && !revealStatus.pastDeadline) {
    // Only show picks from submitted users
    filteredPicks = picks.filter(pick =>
      pick.auth_user_id && revealStatus.submittedUserIds.includes(pick.auth_user_id)
    );
  }

  if (filteredPicks.length === 0) {
    return {
      qbs: [],
      rbs: [],
      flex: [],
      allUsers: [],
      userProfiles: new Map(),
      authUserIdMap: new Map(),
      revealStatus,
      canViewPicks: true,
    };
  }

  // Get unique player_ids to fetch their images and stats
  const playerIds = [...new Set(filteredPicks.map((p) => p.player_id))];

  // Fetch player images from playoff_players
  const { data: players, error: playersError } = await supabase
    .from("playoff_players")
    .select("player_id, image_url")
    .in("player_id", playerIds)
    .eq("season", season);

  if (playersError) {
    console.error("Error fetching player images:", playersError);
  }

  // Fetch player stats for this week - include all stat fields
  const { data: stats, error: statsError } = await supabase
    .from("player_week_stats")
    .select("player_id, pass_yds, pass_tds, interceptions, rush_yds, rush_tds, rec_yds, rec_tds, fumbles_lost, fantasy_points_standard")
    .in("player_id", playerIds)
    .eq("season", season)
    .eq("week", week);

  if (statsError) {
    console.error("Error fetching player stats:", statsError);
  }

  // Create maps for quick lookup
  const playerImageMap = new Map<number, string | null>();
  players?.forEach((p) => {
    playerImageMap.set(p.player_id, p.image_url);
  });

  const playerStatsMap = new Map<number, PlayerWeekStats>();
  stats?.forEach((s) => {
    playerStatsMap.set(s.player_id, {
      pass_yds: s.pass_yds || 0,
      pass_tds: s.pass_tds || 0,
      interceptions: s.interceptions || 0,
      rush_yds: s.rush_yds || 0,
      rush_tds: s.rush_tds || 0,
      rec_yds: s.rec_yds || 0,
      rec_tds: s.rec_tds || 0,
      fumbles_lost: s.fumbles_lost || 0,
      two_pt_conversions: (s as any).two_pt_conversions || 0,
      fantasy_points_standard: s.fantasy_points_standard || 0,
    });
  });

  // Group by position_slot and player_id
  const groupByPositionAndPlayer = (allPicks: typeof filteredPicks, positionSlot: string): GroupedPlayer[] => {
    const filtered = allPicks.filter((p) => p.position_slot === positionSlot);
    const grouped = new Map<number, GroupedPlayer>();

    filtered.forEach((pick) => {
      const existing = grouped.get(pick.player_id);
      const playerStats = playerStatsMap.get(pick.player_id);
      const hasStats = playerStats !== undefined;
      const authId = pick.auth_user_id || '';

      if (existing) {
        if (!existing.selectedBy.includes(pick.user_id)) {
          existing.selectedBy.push(pick.user_id);
        }
        // Also track by auth_user_id for accurate aggregation
        if (authId && !existing.selectedByAuthIds.includes(authId)) {
          existing.selectedByAuthIds.push(authId);
        }
      } else {
        grouped.set(pick.player_id, {
          playerId: pick.player_id,
          playerName: pick.player_name,
          teamName: pick.team_name,
          teamId: pick.team_id,
          position: pick.position,
          positionSlot: pick.position_slot,
          imageUrl: playerImageMap.get(pick.player_id) ?? null,
          selectedBy: [pick.user_id],
          selectedByAuthIds: authId ? [authId] : [],
          points: hasStats ? playerStats.fantasy_points_standard : 0,
          hasStats,
          stats: playerStats ?? null,
        });
      }
    });

    // Sort by points descending, then by player name
    return Array.from(grouped.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.playerName.localeCompare(b.playerName);
    });
  };

  // Get all unique users from filtered picks
  const allUsers = [...new Set(filteredPicks.map((p) => p.user_id))];

  // Build authUserIdMap: displayName -> auth_user_id
  const authUserIdMap = new Map<string, string>();
  filteredPicks.forEach((pick) => {
    if (pick.user_id && pick.auth_user_id) {
      authUserIdMap.set(pick.user_id, pick.auth_user_id);
    }
  });

  // Fetch user profiles to get avatar URLs from public_profiles view
  // (public_profiles bypasses RLS restrictions on users table)
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("display_name, avatar_url")
    .in("display_name", allUsers);

  const userProfiles = new Map<string, UserProfile>();
  profiles?.forEach((p) => {
    if (p.display_name) {
      userProfiles.set(p.display_name, {
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
      });
    }
  });

  return {
    qbs: groupByPositionAndPlayer(filteredPicks, "QB"),
    rbs: groupByPositionAndPlayer(filteredPicks, "RB"),
    flex: groupByPositionAndPlayer(filteredPicks, "FLEX"),
    allUsers,
    userProfiles,
    authUserIdMap,
    revealStatus,
    canViewPicks: true,
  };
}

export function useWeekPicks(
  week: number,
  leagueId: string | null,
  currentUserId: string | null,
  season: number = 2025
) {
  // First check reveal status
  const revealQuery = usePickRevealStatus(week, leagueId, currentUserId, season);

  return useQuery({
    queryKey: ["weekPicks", week, leagueId, currentUserId, season, revealQuery.data?.currentUserSubmitted, revealQuery.data?.pastDeadline],
    queryFn: () => fetchWeekPicks(week, leagueId!, season, revealQuery.data),
    enabled: !!leagueId && !!currentUserId && week >= 1 && week <= 4 && revealQuery.isSuccess,
  });
}
