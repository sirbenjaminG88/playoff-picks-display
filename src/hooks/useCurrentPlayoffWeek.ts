import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to determine the current playoff week based on game completion status.
 * Returns the earliest week where NOT all games are finished.
 * 
 * Logic:
 * - Week 1 finished = all Wild Card games have status FT or AOT
 * - Week 2 finished = all Divisional games have status FT or AOT
 * - etc.
 * 
 * Filters out placeholder games (team_id = 0) that aren't real scheduled games.
 */
export function useCurrentPlayoffWeek(season: number = 2025) {
  return useQuery({
    queryKey: ["current-playoff-week-from-games", season],
    queryFn: async () => {
      const { data: games, error } = await supabase
        .from("playoff_games")
        .select("week_index, status_short, home_team_external_id, away_team_external_id")
        .eq("season", season)
        .order("week_index", { ascending: true });

      if (error) {
        console.error("[useCurrentPlayoffWeek] Error fetching games:", error);
        return 1;
      }

      if (!games || games.length === 0) {
        return 1;
      }

      // Filter out placeholder games (team_id = 0)
      const realGames = games.filter(
        (g) => g.home_team_external_id > 0 && g.away_team_external_id > 0
      );

      // Find the earliest week where NOT all games are finished
      for (let week = 1; week <= 4; week++) {
        const weekGames = realGames.filter((g) => g.week_index === week);
        
        // If no games scheduled for this week yet, it's the current week
        if (weekGames.length === 0) {
          console.log(`[useCurrentPlayoffWeek] Week ${week} has no scheduled games, returning ${week}`);
          return week;
        }

        const allFinished = weekGames.every(
          (g) => g.status_short === "FT" || g.status_short === "AOT"
        );

        if (!allFinished) {
          console.log(`[useCurrentPlayoffWeek] Week ${week} has unfinished games, returning ${week}`);
          return week;
        }
        
        console.log(`[useCurrentPlayoffWeek] Week ${week}: all ${weekGames.length} games finished`);
      }

      // All weeks finished, show Super Bowl
      console.log("[useCurrentPlayoffWeek] All weeks finished, returning 4");
      return 4;
    },
    staleTime: 60000, // Cache for 1 minute
  });
}
