import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LEAGUE_ID = "playoff-league-2024";
const SEASON = 2024;

export interface GroupedPlayer {
  playerId: number;
  playerName: string;
  teamName: string;
  teamId: number;
  position: string;
  positionSlot: string;
  selectedBy: string[];
  points: number; // Placeholder for now
}

export interface WeekPicksData {
  qbs: GroupedPlayer[];
  rbs: GroupedPlayer[];
  flex: GroupedPlayer[];
  allUsers: string[];
}

async function fetchWeekPicks(week: number): Promise<WeekPicksData> {
  const { data, error } = await supabase
    .from("user_picks")
    .select("*")
    .eq("league_id", LEAGUE_ID)
    .eq("season", SEASON)
    .eq("week", week);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return { qbs: [], rbs: [], flex: [], allUsers: [] };
  }

  // Group by position_slot and player_id
  const groupByPositionAndPlayer = (picks: typeof data, positionSlot: string): GroupedPlayer[] => {
    const filtered = picks.filter((p) => p.position_slot === positionSlot);
    const grouped = new Map<number, GroupedPlayer>();

    filtered.forEach((pick) => {
      const existing = grouped.get(pick.player_id);
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
          selectedBy: [pick.user_id],
          points: 0, // Placeholder until we wire in real fantasy points
        });
      }
    });

    // Sort by player name alphabetically (will sort by points later)
    return Array.from(grouped.values()).sort((a, b) =>
      a.playerName.localeCompare(b.playerName)
    );
  };

  // Get all unique users
  const allUsers = [...new Set(data.map((p) => p.user_id))];

  return {
    qbs: groupByPositionAndPlayer(data, "QB"),
    rbs: groupByPositionAndPlayer(data, "RB"),
    flex: groupByPositionAndPlayer(data, "FLEX"),
    allUsers,
  };
}

export function useWeekPicks(week: number) {
  return useQuery({
    queryKey: ["weekPicks", week],
    queryFn: () => fetchWeekPicks(week),
  });
}
