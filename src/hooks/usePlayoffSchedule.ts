import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Week } from '@/domain/types';

/**
 * Hook to fetch playoff schedule from the database.
 * Falls back to hardcoded placeholder dates if the NFL hasn't published the schedule yet.
 *
 * The schedule is automatically synced weekly via cron job once available (after Jan 4, 2026).
 */
export function usePlayoffSchedule(season: number) {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPlayoffSchedule() {
      setLoading(true);
      setError(null);

      try {
        // Fetch playoff games from database, grouped by week
        const { data, error: fetchError } = await supabase
          .from('playoff_games')
          .select('season, week_index, week_label, kickoff_at')
          .eq('season', season)
          .order('week_index')
          .order('kickoff_at');

        if (fetchError) {
          throw fetchError;
        }

        // If no games found, use placeholder dates
        if (!data || data.length === 0) {
          console.log('[usePlayoffSchedule] No schedule found, using placeholder dates');
          setWeeks(getPlaceholderWeeks(season));
          setLoading(false);
          return;
        }

        // Group games by week_index and calculate openAt/deadlineAt
        const weekMap = new Map<number, {
          weekLabel: string;
          games: Array<{ kickoff_at: string }>
        }>();

        data.forEach((game) => {
          if (!weekMap.has(game.week_index)) {
            weekMap.set(game.week_index, {
              weekLabel: game.week_label,
              games: [],
            });
          }
          weekMap.get(game.week_index)!.games.push({
            kickoff_at: game.kickoff_at,
          });
        });

        // Convert to Week[] format
        const playoffWeeks: Week[] = [];
        weekMap.forEach((value, weekIndex) => {
          const firstGame = value.games.reduce((earliest, game) => {
            return new Date(game.kickoff_at) < new Date(earliest.kickoff_at) ? game : earliest;
          });

          // Deadline is first game kickoff (from actual schedule)
          const deadlineDate = new Date(firstGame.kickoff_at);

          // Open date is fixed Monday noon EST for each week
          const openAt = getFixedOpenDate(season, weekIndex);

          playoffWeeks.push({
            id: `week${weekIndex}`,
            season,
            weekNumber: weekIndex,
            openAt,
            deadlineAt: deadlineDate.toISOString(),
          });
        });

        // Sort by week number
        playoffWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

        console.log('[usePlayoffSchedule] Fetched', playoffWeeks.length, 'playoff weeks from database');
        setWeeks(playoffWeeks);
      } catch (err) {
        console.error('[usePlayoffSchedule] Error fetching schedule:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Fallback to placeholder dates on error
        setWeeks(getPlaceholderWeeks(season));
      } finally {
        setLoading(false);
      }
    }

    fetchPlayoffSchedule();
  }, [season]);

  return { weeks, loading, error };
}

/**
 * Fixed open dates for each playoff week (Monday noon EST = 17:00 UTC).
 * These are consistent regardless of actual game schedule.
 */
function getFixedOpenDate(season: number, weekIndex: number): string {
  const year = season + 1; // 2025 season = Jan 2026 playoffs

  const openDates: Record<number, string> = {
    1: `${year}-01-06T17:00:00Z`, // Mon Jan 6, noon EST - Wild Card
    2: `${year}-01-13T17:00:00Z`, // Mon Jan 13, noon EST - Divisional
    3: `${year}-01-20T17:00:00Z`, // Mon Jan 20, noon EST - Conference
    4: `${year}-01-27T17:00:00Z`, // Mon Jan 27, noon EST - Super Bowl
  };

  return openDates[weekIndex] || openDates[1];
}

/**
 * Placeholder dates used until the real NFL schedule is available.
 * These are approximate dates based on typical playoff schedule.
 */
function getPlaceholderWeeks(season: number): Week[] {
  // For 2025 season (2025-2026), playoffs are in Jan/Feb 2026
  const year = season + 1;

  // All openAt times are noon EST (17:00 UTC)
  // Deadlines are first game kickoff (approx 1pm EST = 18:00 UTC)
  return [
    {
      id: "week1",
      season,
      weekNumber: 1,
      openAt: `${year}-01-06T17:00:00Z`, // Mon Jan 6, noon EST
      deadlineAt: `${year}-01-10T18:00:00Z`, // Wild Card Sat Jan 10
    },
    {
      id: "week2",
      season,
      weekNumber: 2,
      openAt: `${year}-01-13T17:00:00Z`, // Mon Jan 13, noon EST
      deadlineAt: `${year}-01-17T18:00:00Z`, // Divisional Sat Jan 17
    },
    {
      id: "week3",
      season,
      weekNumber: 3,
      openAt: `${year}-01-20T17:00:00Z`, // Mon Jan 20, noon EST
      deadlineAt: `${year}-01-25T18:00:00Z`, // Conference Champ Sun Jan 25
    },
    {
      id: "week4",
      season,
      weekNumber: 4,
      openAt: `${year}-01-27T17:00:00Z`, // Mon Jan 27, noon EST
      deadlineAt: `${year}-02-08T18:00:00Z`, // Super Bowl LX Sun Feb 8
    },
  ];
}
