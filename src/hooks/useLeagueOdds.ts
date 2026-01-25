import { useQuery } from '@tanstack/react-query';

interface LeagueOdds {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  currentPoints: number;
  winProbability: number;
  winProbabilityDisplay: string;
}

interface LeagueOddsResponse {
  success: boolean;
  leagueId: string;
  currentWeek: number;
  weeksRemaining: number;
  gamesAreLive?: boolean;
  simulations: number;
  odds: LeagueOdds[];
}

export function useLeagueOdds(leagueId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['league-odds', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-league-odds?league_id=${leagueId}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch odds');
      return response.json() as Promise<LeagueOddsResponse>;
    },
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000, // Refresh every 2 minutes during live games
    refetchInterval: (query) => {
      // Auto-refetch every 2 minutes when games are live
      const data = query.state.data;
      if (data?.gamesAreLive) {
        return 2 * 60 * 1000; // 2 minutes
      }
      return false; // No auto-refetch when games aren't live
    },
    refetchOnWindowFocus: false,
  });
}
