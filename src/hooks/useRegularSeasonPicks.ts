import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerWeekStats {
  pass_yds: number;
  pass_tds: number;
  interceptions: number;
  rush_yds: number;
  rush_tds: number;
  rec_yds: number;
  rec_tds: number;
  fumbles_lost: number;
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

export interface RegularSeasonPicksData {
  qbs: GroupedPlayer[];
  rbs: GroupedPlayer[];
  flex: GroupedPlayer[];
  allUsers: string[];
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

async function fetchRegularSeasonPicks(week: number, leagueId: string): Promise<RegularSeasonPicksData> {
  const SEASON = 2025;

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
    return { qbs: [], rbs: [], flex: [], allUsers: [] };
  }

  // Get unique player_ids to fetch their stats
  const playerIds = [...new Set(picks.map((p) => p.player_id))];

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
      fantasy_points_standard: s.fantasy_points_standard || 0,
    });
  });

  // Group by position_slot and player_id
  const groupByPositionAndPlayer = (allPicks: typeof picks, positionSlot: string): GroupedPlayer[] => {
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
          imageUrl: null, // Regular season players don't have images synced yet
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

  // Get all unique users
  const allUsers = [...new Set(picks.map((p) => p.user_id))];

  return {
    qbs: groupByPositionAndPlayer(picks, "QB"),
    rbs: groupByPositionAndPlayer(picks, "RB"),
    flex: groupByPositionAndPlayer(picks, "FLEX"),
    allUsers,
  };
}

export function useRegularSeasonPicks(week: number, leagueId: string | null) {
  return useQuery({
    queryKey: ["regularSeasonPicks", week, leagueId],
    queryFn: () => fetchRegularSeasonPicks(week, leagueId!),
    enabled: !!leagueId && week >= 14 && week <= 17,
  });
}
