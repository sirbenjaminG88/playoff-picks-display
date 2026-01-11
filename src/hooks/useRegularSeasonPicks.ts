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
  teamAbbr: string;
  teamId: number | string;
  position: string;
  positionSlot: string;
  imageUrl: string | null;
  selectedBy: string[];
  points: number;
  hasStats: boolean;
  stats: PlayerWeekStats | null;
}

export interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
}

export interface RegularSeasonPicksData {
  qbs: GroupedPlayer[];
  rbs: GroupedPlayer[];
  flex: GroupedPlayer[];
  allUsers: string[];
  userProfiles: Map<string, UserProfile>;
  // Pick reveal status
  revealStatus?: PickRevealStatus;
  canViewPicks: boolean;  // Whether current user can see picks
}

// Team abbreviation map
const getTeamAbbrev = (teamName: string): string => {
  const abbrevMap: Record<string, string> = {
    "Arizona Cardinals": "ARI",
    "Atlanta Falcons": "ATL",
    "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR",
    "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR",
    "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN",
    "New England Patriots": "NE",
    "New Orleans Saints": "NO",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS",
  };
  return abbrevMap[teamName] || teamName.substring(0, 3).toUpperCase();
};

async function fetchRegularSeasonPicks(
  week: number,
  leagueId: string,
  revealStatus?: PickRevealStatus
): Promise<RegularSeasonPicksData> {
  const SEASON = 2025;

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
      revealStatus,
      canViewPicks: false,
    };
  }

  // Fetch user picks for 2025 regular season
  const { data: picks, error: picksError } = await supabase
    .from("user_picks")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", SEASON)
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
      revealStatus,
      canViewPicks: true,
    };
  }

  // Get unique player_ids to fetch their stats and images
  const playerIds = [...new Set(filteredPicks.map((p) => p.player_id))];

  // Fetch player stats for this week from player_week_stats
  const { data: stats, error: statsError } = await supabase
    .from("player_week_stats")
    .select("player_id, pass_yds, pass_tds, interceptions, rush_yds, rush_tds, rec_yds, rec_tds, fumbles_lost, fantasy_points_standard")
    .in("player_id", playerIds)
    .eq("season", SEASON)
    .eq("week", week);

  if (statsError) {
    console.error("Error fetching player stats:", statsError);
  }

  // Fetch player images from players table
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("api_player_id, image_url")
    .eq("season", SEASON)
    .in("api_player_id", playerIds.map(String));

  if (playersError) {
    console.error("Error fetching player images:", playersError);
  }

  // Create image map (api_player_id is stored as string in players table)
  const playerImageMap = new Map<number, string | null>();
  players?.forEach((p) => {
    playerImageMap.set(parseInt(p.api_player_id), p.image_url);
  });

  // Create stats map
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

      if (existing) {
        if (!existing.selectedBy.includes(pick.user_id)) {
          existing.selectedBy.push(pick.user_id);
        }
      } else {
        grouped.set(pick.player_id, {
          playerId: pick.player_id,
          playerName: pick.player_name,
          teamName: pick.team_name,
          teamAbbr: getTeamAbbrev(pick.team_name),
          teamId: pick.team_id,
          position: pick.position,
          positionSlot: pick.position_slot,
          imageUrl: playerImageMap.get(pick.player_id) ?? null,
          selectedBy: [pick.user_id],
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
    revealStatus,
    canViewPicks: true,
  };
}

export function useRegularSeasonPicks(
  week: number,
  leagueId: string | null,
  currentUserId: string | null,
  season: number = 2025
) {
  // First check reveal status
  const revealQuery = usePickRevealStatus(week, leagueId, currentUserId, season);

  return useQuery({
    queryKey: ["regularSeasonPicks", week, leagueId, currentUserId, season, revealQuery.data?.currentUserSubmitted, revealQuery.data?.pastDeadline],
    queryFn: () => fetchRegularSeasonPicks(week, leagueId!, revealQuery.data),
    enabled: !!leagueId && !!currentUserId && week >= 14 && week <= 18 && revealQuery.isSuccess,
  });
}
