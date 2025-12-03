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
  imageUrl: string | null;
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
    return { qbs: [], rbs: [], flex: [], allUsers: [] };
  }

  // Get unique player_ids to fetch their images
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

  // Create a map of player_id to image_url
  const playerImageMap = new Map<number, string | null>();
  players?.forEach((p) => {
    playerImageMap.set(p.player_id, p.image_url);
  });

  // Group by position_slot and player_id
  const groupByPositionAndPlayer = (allPicks: typeof picks, positionSlot: string): GroupedPlayer[] => {
    const filtered = allPicks.filter((p) => p.position_slot === positionSlot);
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
          imageUrl: playerImageMap.get(pick.player_id) ?? null,
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
  const allUsers = [...new Set(picks.map((p) => p.user_id))];

  return {
    qbs: groupByPositionAndPlayer(picks, "QB"),
    rbs: groupByPositionAndPlayer(picks, "RB"),
    flex: groupByPositionAndPlayer(picks, "FLEX"),
    allUsers,
  };
}

export function useWeekPicks(week: number) {
  return useQuery({
    queryKey: ["weekPicks", week],
    queryFn: () => fetchWeekPicks(week),
  });
}
