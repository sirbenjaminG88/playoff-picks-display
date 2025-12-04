import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LEAGUE_ID = "playoff-league-2024";
const SEASON = 2024;

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
  teamId: number;
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

export interface WeekPicksData {
  qbs: GroupedPlayer[];
  rbs: GroupedPlayer[];
  flex: GroupedPlayer[];
  allUsers: string[];
  userProfiles: Map<string, UserProfile>;
}

async function fetchWeekPicks(week: number): Promise<WeekPicksData> {
  // Fetch user picks
  const { data: picks, error: picksError } = await supabase
    .from("user_picks")
    .select("*")
    .eq("league_id", LEAGUE_ID)
    .eq("season", SEASON)
    .eq("week", week);

  if (picksError) {
    throw new Error(picksError.message);
  }

  if (!picks || picks.length === 0) {
    return { qbs: [], rbs: [], flex: [], allUsers: [], userProfiles: new Map() };
  }

  // Get unique player_ids to fetch their images and stats
  const playerIds = [...new Set(picks.map((p) => p.player_id))];

  // Fetch player images from playoff_players
  const { data: players, error: playersError } = await supabase
    .from("playoff_players")
    .select("player_id, image_url")
    .in("player_id", playerIds)
    .eq("season", SEASON);

  if (playersError) {
    console.error("Error fetching player images:", playersError);
  }

  // Fetch player stats for this week - include all stat fields
  const { data: stats, error: statsError } = await supabase
    .from("player_week_stats")
    .select("player_id, pass_yds, pass_tds, interceptions, rush_yds, rush_tds, rec_yds, rec_tds, fumbles_lost, fantasy_points_standard")
    .in("player_id", playerIds)
    .eq("season", SEASON)
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

  // Get all unique users
  const allUsers = [...new Set(picks.map((p) => p.user_id))];

  // Fetch user profiles to get avatar URLs
  const { data: profiles } = await supabase
    .from("users")
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
    qbs: groupByPositionAndPlayer(picks, "QB"),
    rbs: groupByPositionAndPlayer(picks, "RB"),
    flex: groupByPositionAndPlayer(picks, "FLEX"),
    allUsers,
    userProfiles,
  };
}

export function useWeekPicks(week: number) {
  return useQuery({
    queryKey: ["weekPicks", week],
    queryFn: () => fetchWeekPicks(week),
  });
}
