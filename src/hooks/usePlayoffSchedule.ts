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

          // Picks open 1 week before first game (or day after previous week ends)
          const deadlineDate = new Date(firstGame.kickoff_at);
          const openDate = new Date(deadlineDate);
          openDate.setDate(openDate.getDate() - 7);

          playoffWeeks.push({
            id: `week${weekIndex}`,
            season,
            weekNumber: weekIndex,
            openAt: openDate.toISOString(),
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
 * Placeholder dates used until the real NFL schedule is available.
 * These are approximate dates based on typical playoff schedule.
 */
function getPlaceholderWeeks(season: number): Week[] {
  // For 2025 season (2025-2026), playoffs are in Jan/Feb 2026
  const year = season + 1;

  return [
    {
      id: "week1",
      season,
      weekNumber: 1,
      openAt: `${year}-01-10T12:00:00Z`,
      deadlineAt: `${year}-01-11T18:00:00Z`, // first game kickoff
    },
    {
      id: "week2",
      season,
      weekNumber: 2,
      openAt: `${year}-01-18T12:00:00Z`, // day after week 1 finishes
      deadlineAt: `${year}-01-19T18:00:00Z`,
    },
    {
      id: "week3",
      season,
      weekNumber: 3,
      openAt: `${year}-01-25T12:00:00Z`,
      deadlineAt: `${year}-01-26T18:00:00Z`,
    },
    {
      id: "week4",
      season,
      weekNumber: 4,
      openAt: `${year}-02-01T12:00:00Z`,
      deadlineAt: `${year}-02-02T18:00:00Z`,
    },
  ];
}
