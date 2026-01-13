import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RankedPlayer {
  playerId: number;
  name: string;
  position: string;
  teamName: string;
  imageUrl: string | null;
  fantasyPoints: number;
  stats: {
    pass_yds: number;
    pass_tds: number;
    interceptions: number;
    rush_yds: number;
    rush_tds: number;
    rec_yds: number;
    rec_tds: number;
    fumbles_lost: number;
    two_pt_conversions: number;
  };
}

export interface PlayerRankingsData {
  qbs: RankedPlayer[];
  rbs: RankedPlayer[];
  flex: RankedPlayer[];
}

// Map full team names to abbreviations
const getTeamAbbreviation = (teamName: string): string => {
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

async function fetchWeekRankings(week: number): Promise<PlayerRankingsData> {
  // Fetch players with their stats for the specific week
  const { data: players, error: playersError } = await supabase
    .from("selectable_playoff_players")
    .select("player_id, name, position, team_name, image_url")
    .eq("season", 2025);

  if (playersError) throw playersError;

  // Fetch stats for the week
  const { data: stats, error: statsError } = await supabase
    .from("player_week_stats")
    .select("*")
    .eq("season", 2025)
    .eq("week", week)
    .gt("fantasy_points_standard", 0);

  if (statsError) throw statsError;

  // Create a map of player stats
  const statsMap = new Map(stats?.map(s => [s.player_id, s]) || []);

  // Map players with their stats
  const rankedPlayers: RankedPlayer[] = (players || [])
    .filter(p => statsMap.has(p.player_id))
    .map(p => {
      const playerStats = statsMap.get(p.player_id)!;
      return {
        playerId: p.player_id!,
        name: p.name!,
        position: p.position!,
        teamName: p.team_name!,
        teamAbbr: getTeamAbbreviation(p.team_name!),
        imageUrl: p.image_url,
        fantasyPoints: playerStats.fantasy_points_standard || 0,
        stats: {
          pass_yds: playerStats.pass_yds || 0,
          pass_tds: playerStats.pass_tds || 0,
          interceptions: playerStats.interceptions || 0,
          rush_yds: playerStats.rush_yds || 0,
          rush_tds: playerStats.rush_tds || 0,
          rec_yds: playerStats.rec_yds || 0,
          rec_tds: playerStats.rec_tds || 0,
          fumbles_lost: playerStats.fumbles_lost || 0,
          two_pt_conversions: playerStats.two_pt_conversions || 0,
        },
      };
    })
    .sort((a, b) => b.fantasyPoints - a.fantasyPoints);

  // Group by position
  const qbs = rankedPlayers.filter(p => p.position === "QB");
  const rbs = rankedPlayers.filter(p => p.position === "RB");
  const flex = rankedPlayers.filter(p => p.position === "WR" || p.position === "TE");

  return { qbs, rbs, flex };
}

async function fetchOverallRankings(): Promise<PlayerRankingsData> {
  // Fetch all playoff players
  const { data: players, error: playersError } = await supabase
    .from("selectable_playoff_players")
    .select("player_id, name, position, team_name, image_url")
    .eq("season", 2025);

  if (playersError) throw playersError;

  // Fetch stats for playoff weeks only (1-4)
  const { data: stats, error: statsError } = await supabase
    .from("player_week_stats")
    .select("*")
    .eq("season", 2025)
    .in("week", [1, 2, 3, 4])
    .gt("fantasy_points_standard", 0);

  if (statsError) throw statsError;

  // Aggregate stats by player
  const aggregatedStats = new Map<number, {
    totalPoints: number;
    pass_yds: number;
    pass_tds: number;
    interceptions: number;
    rush_yds: number;
    rush_tds: number;
    rec_yds: number;
    rec_tds: number;
    fumbles_lost: number;
    two_pt_conversions: number;
  }>();

  (stats || []).forEach(s => {
    const existing = aggregatedStats.get(s.player_id) || {
      totalPoints: 0,
      pass_yds: 0,
      pass_tds: 0,
      interceptions: 0,
      rush_yds: 0,
      rush_tds: 0,
      rec_yds: 0,
      rec_tds: 0,
      fumbles_lost: 0,
      two_pt_conversions: 0,
    };

    aggregatedStats.set(s.player_id, {
      totalPoints: existing.totalPoints + (s.fantasy_points_standard || 0),
      pass_yds: existing.pass_yds + (s.pass_yds || 0),
      pass_tds: existing.pass_tds + (s.pass_tds || 0),
      interceptions: existing.interceptions + (s.interceptions || 0),
      rush_yds: existing.rush_yds + (s.rush_yds || 0),
      rush_tds: existing.rush_tds + (s.rush_tds || 0),
      rec_yds: existing.rec_yds + (s.rec_yds || 0),
      rec_tds: existing.rec_tds + (s.rec_tds || 0),
      fumbles_lost: existing.fumbles_lost + (s.fumbles_lost || 0),
      two_pt_conversions: existing.two_pt_conversions + (s.two_pt_conversions || 0),
    });
  });

  // Map players with aggregated stats
  const rankedPlayers: RankedPlayer[] = (players || [])
    .filter(p => aggregatedStats.has(p.player_id!))
    .map(p => {
      const agg = aggregatedStats.get(p.player_id!)!;
      return {
        playerId: p.player_id!,
        name: p.name!,
        position: p.position!,
        teamName: p.team_name!,
        teamAbbr: getTeamAbbreviation(p.team_name!),
        imageUrl: p.image_url,
        fantasyPoints: agg.totalPoints,
        stats: {
          pass_yds: agg.pass_yds,
          pass_tds: agg.pass_tds,
          interceptions: agg.interceptions,
          rush_yds: agg.rush_yds,
          rush_tds: agg.rush_tds,
          rec_yds: agg.rec_yds,
          rec_tds: agg.rec_tds,
          fumbles_lost: agg.fumbles_lost,
          two_pt_conversions: agg.two_pt_conversions,
        },
      };
    })
    .sort((a, b) => b.fantasyPoints - a.fantasyPoints);

  // Group by position
  const qbs = rankedPlayers.filter(p => p.position === "QB");
  const rbs = rankedPlayers.filter(p => p.position === "RB");
  const flex = rankedPlayers.filter(p => p.position === "WR" || p.position === "TE");

  return { qbs, rbs, flex };
}

export function usePlayerRankings(week: number | "overall") {
  return useQuery({
    queryKey: ["playerRankings", week],
    queryFn: () => week === "overall" ? fetchOverallRankings() : fetchWeekRankings(week),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
