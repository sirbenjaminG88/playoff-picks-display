import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Week } from "@/domain/types";

export interface RegularSeasonPlayer {
  id: string;
  api_player_id: string;
  full_name: string;
  position: string;
  team_name: string | null;
  team_abbr: string | null;
  team_api_id: string | null;
  jersey_number: string | null;
  image_url: string | null;
}

export interface RegularSeasonWeek {
  week: number;
  firstGameDate: string;
  label: string;
  tabLabel: { abbrev: string; dates: string };
}

// Regular season weeks 14-17 for beta
const BETA_WEEKS = [14, 15, 16, 17];

// Format date for tab display
const formatWeekDates = (date: Date): string => {
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate();
  return `${month} ${day}`;
};

export function useRegularSeasonData(season: number = 2025) {
  const [players, setPlayers] = useState<RegularSeasonPlayer[]>([]);
  const [weekDeadlines, setWeekDeadlines] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch players from the players table
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, api_player_id, full_name, position, team_name, team_abbr, team_api_id, jersey_number, image_url")
          .eq("season", season)
          .in("position", ["QB", "RB", "WR", "TE"])
          .order("team_name")
          .order("full_name");

        if (playersError) {
          throw new Error(`Failed to load players: ${playersError.message}`);
        }

        setPlayers(playersData || []);

        // Fetch first game dates for each week
        const { data: gamesData, error: gamesError } = await supabase
          .from("regular_season_games")
          .select("week, game_date")
          .eq("season", season)
          .in("week", BETA_WEEKS)
          .order("game_date", { ascending: true });

        if (gamesError) {
          throw new Error(`Failed to load game schedule: ${gamesError.message}`);
        }

        // Group by week and get earliest game for each
        const deadlineMap = new Map<number, string>();
        if (gamesData) {
          for (const game of gamesData) {
            if (game.game_date && !deadlineMap.has(game.week)) {
              deadlineMap.set(game.week, game.game_date);
            }
          }
        }
        setWeekDeadlines(deadlineMap);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [season]);

  // Build weeks array with deadline info
  const weeks: RegularSeasonWeek[] = useMemo(() => {
    return BETA_WEEKS.map((weekNum) => {
      const deadline = weekDeadlines.get(weekNum);
      const deadlineDate = deadline ? new Date(deadline) : null;
      
      return {
        week: weekNum,
        firstGameDate: deadline || "",
        label: `Week ${weekNum}`,
        tabLabel: {
          abbrev: `WK ${weekNum}`,
          dates: deadlineDate ? formatWeekDates(deadlineDate) : "",
        },
      };
    });
  }, [weekDeadlines]);

  // Convert weeks to domain Week format for status calculations
  const domainWeeks: Week[] = useMemo(() => {
    return weeks.map((w) => {
      // Open window starts 7 days before first game
      const deadline = w.firstGameDate ? new Date(w.firstGameDate) : new Date();
      const openAt = new Date(deadline);
      openAt.setDate(openAt.getDate() - 7);

      return {
        id: `reg-2025-${w.week}`,
        season: 2025,
        weekNumber: w.week,
        openAt: openAt.toISOString(),
        deadlineAt: w.firstGameDate || new Date().toISOString(),
      };
    });
  }, [weeks]);

  return {
    players,
    weeks,
    domainWeeks,
    loading,
    error,
    weekDeadlines,
  };
}
