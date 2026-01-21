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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (simulations are expensive)
    refetchOnWindowFocus: false,
  });
}
