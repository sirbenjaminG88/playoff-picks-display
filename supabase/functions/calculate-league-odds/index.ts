// Edge function to calculate league win probabilities via Monte Carlo simulation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEASON = 2025;
const PLAYOFF_WEEKS = [1, 2, 3, 4];
const SIMULATIONS = 10000;
const VARIANCE_FACTOR = 0.35;

function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function getCurrentPlayoffWeek(completedWeeks: number[]): number {
  if (completedWeeks.length === 0) return 1;
  return Math.max(...completedWeeks) + 1;
}

async function getEliminatedTeamIds(supabase: any): Promise<Set<number>> {
  const eliminated = new Set<number>();
  const { data: games } = await supabase
    .from('playoff_games')
    .select('home_team_external_id, away_team_external_id, home_score, away_score')
    .eq('season', SEASON)
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);

  for (const game of games || []) {
    if (game.home_score < game.away_score) eliminated.add(game.home_team_external_id);
    else if (game.away_score < game.home_score) eliminated.add(game.away_team_external_id);
  }
  return eliminated;
}

function simulateRemainingWeeks(usedPlayerIds: Set<number>, availablePlayers: any[], weeksRemaining: number): number {
  let totalPoints = 0;
  const allUsed = new Set(usedPlayerIds);

  for (let week = 0; week < weeksRemaining; week++) {
    const eligible = availablePlayers.filter(p => !allUsed.has(p.playerId) && !p.isEliminated);

    const qb = eligible.filter(p => p.position === 'QB').sort((a, b) => b.projectedPts - a.projectedPts)[0];
    if (qb) { 
      totalPoints += Math.max(0, randomNormal(qb.projectedPts, qb.projectedPts * VARIANCE_FACTOR)); 
      allUsed.add(qb.playerId); 
    }

    const rb = eligible.filter(p => p.position === 'RB' && !allUsed.has(p.playerId)).sort((a, b) => b.projectedPts - a.projectedPts)[0];
    if (rb) { 
      totalPoints += Math.max(0, randomNormal(rb.projectedPts, rb.projectedPts * VARIANCE_FACTOR)); 
      allUsed.add(rb.playerId); 
    }

    const flex = eligible.filter(p => (p.position === 'WR' || p.position === 'TE') && !allUsed.has(p.playerId)).sort((a, b) => b.projectedPts - a.projectedPts)[0];
    if (flex) { 
      totalPoints += Math.max(0, randomNormal(flex.projectedPts, flex.projectedPts * VARIANCE_FACTOR)); 
      allUsed.add(flex.playerId); 
    }
  }
  return totalPoints;
}

// Calculate projected points for submitted-but-not-played picks (with variance for fairness)
function getProjectedPointsForSubmittedPicks(
  submittedPicks: { week: number; playerId: number }[],
  playerProjections: any[]
): number {
  let total = 0;
  for (const pick of submittedPicks) {
    const player = playerProjections.find(p => p.playerId === pick.playerId);
    if (player) {
      // Apply same variance as simulation for fairness
      total += Math.max(0, randomNormal(player.projectedPts, player.projectedPts * VARIANCE_FACTOR));
    }
  }
  return total;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const leagueId = url.searchParams.get('league_id');
    if (!leagueId) {
      return new Response(JSON.stringify({ error: 'league_id required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Get league members with user info
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, users:user_id (display_name, avatar_url)')
      .eq('league_id', leagueId);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ error: 'League not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Determine current week and whether it has started
    const { data: allGames } = await supabase
      .from('playoff_games')
      .select('week_index, kickoff_at, status_short, home_team_external_id, away_team_external_id')
      .eq('season', SEASON)
      .order('week_index', { ascending: true })
      .order('kickoff_at', { ascending: true });

    // Find current week: first week with non-placeholder games that aren't all finished
    let currentWeekFromGames = 1;
    const validGames = (allGames || []).filter(g => g.home_team_external_id > 0 && g.away_team_external_id > 0);
    
    for (let week = 1; week <= 4; week++) {
      const weekGames = validGames.filter(g => g.week_index === week);
      if (weekGames.length === 0) {
        currentWeekFromGames = week;
        break;
      }
      const allFinished = weekGames.every(g => g.status_short === 'FT' || g.status_short === 'AOT');
      if (!allFinished) {
        currentWeekFromGames = week;
        break;
      }
      if (week === 4 && allFinished) {
        currentWeekFromGames = 4; // All done
      }
    }

    // Check if games are LIVE (started but not all finished)
    const currentWeekGames = validGames.filter(g => g.week_index === currentWeekFromGames);
    const firstGameKickoff = currentWeekGames.length > 0 ? currentWeekGames[0].kickoff_at : null;
    const now = new Date().toISOString();
    const weekHasStarted = firstGameKickoff ? now >= firstGameKickoff : false;
    const allGamesFinished = currentWeekGames.length > 0 && 
      currentWeekGames.every(g => g.status_short === 'FT' || g.status_short === 'AOT');
    
    // Only calculate live odds when games are in progress (started AND not all finished)
    const gamesAreLive = weekHasStarted && !allGamesFinished;
    const currentWeekHasStarted = gamesAreLive;

    // Get all picks for this league and season
    const { data: picks } = await supabase
      .from('user_picks')
      .select('auth_user_id, player_id, week')
      .eq('league_id', leagueId)
      .eq('season', SEASON)
      .in('week', PLAYOFF_WEEKS);

    // Get stats for all players who were picked
    const playerIds = [...new Set((picks || []).map(p => p.player_id))];
    
    let statsMap = new Map<string, number>();
    if (playerIds.length > 0) {
      const { data: stats } = await supabase
        .from('player_week_stats')
        .select('player_id, week, fantasy_points_standard')
        .eq('season', SEASON)
        .in('week', PLAYOFF_WEEKS)
        .in('player_id', playerIds);

      for (const stat of stats || []) {
        statsMap.set(`${stat.player_id}_${stat.week}`, stat.fantasy_points_standard || 0);
      }
    }

    // Build standings
    // KEY LOGIC: If current week hasn't started, ignore picks for current week and beyond
    // This ensures odds "freeze" at end of previous week until new week begins
    const userStandings = new Map();
    const completedWeeks = new Set<number>();

    for (const member of members) {
      const user = member.users as any;
      userStandings.set(member.user_id, {
        userId: member.user_id,
        displayName: user?.display_name || 'Unknown',
        avatarUrl: user?.avatar_url || null,
        currentPoints: 0,
        usedPlayerIds: [] as number[],
        submittedFuturePicks: [] as { week: number; playerId: number }[],
        submittedFutureWeeks: new Set<number>(),
      });
    }

    for (const pick of picks || []) {
      const standing = userStandings.get(pick.auth_user_id);
      if (!standing) continue;
      
      // If current week hasn't started, only count picks from completed weeks
      // Ignore picks for current week and future weeks
      if (!currentWeekHasStarted && pick.week >= currentWeekFromGames) {
        // Don't count this pick - week hasn't started yet
        continue;
      }
      
      // Mark player as used
      standing.usedPlayerIds.push(pick.player_id);
      
      // Look up stats
      const points = statsMap.get(`${pick.player_id}_${pick.week}`) || 0;
      
      if (points > 0) {
        // Game played - use actual points
        standing.currentPoints += points;
        completedWeeks.add(pick.week);
      } else {
        // Game NOT played yet but week has started - track for projected points
        standing.submittedFuturePicks.push({
          week: pick.week,
          playerId: pick.player_id
        });
        standing.submittedFutureWeeks.add(pick.week);
      }
    }

    // Use game-based current week, not stats-based
    const currentWeek = currentWeekFromGames;
    const weeksRemaining = Math.max(0, 4 - currentWeek + 1);
    const eliminatedTeamIds = await getEliminatedTeamIds(supabase);

    // Get player projections
    const { data: players } = await supabase
      .from('playoff_players')
      .select('player_id, name, position, team_id, projected_pts')
      .eq('season', SEASON)
      .not('projected_pts', 'is', null);

    const playerProjections = (players || []).map(p => ({
      playerId: p.player_id,
      name: p.name,
      position: p.position,
      teamId: p.team_id,
      projectedPts: p.projected_pts || 0,
      isEliminated: eliminatedTeamIds.has(p.team_id),
    }));

    // Monte Carlo simulation
    const userWins = new Map<string, number>();
    for (const oddsUserId of userStandings.keys()) userWins.set(oddsUserId, 0);

    for (let sim = 0; sim < SIMULATIONS; sim++) {
      const totals = new Map<string, number>();
      
      for (const [oddsUserId, standing] of userStandings) {
        // Start with actual played points
        let total = standing.currentPoints;
        
        // Add projected points for submitted-but-not-played picks (with variance)
        total += getProjectedPointsForSubmittedPicks(
          standing.submittedFuturePicks, 
          playerProjections
        );
        
        // Calculate how many weeks this user still needs to simulate
        // (weeks remaining minus weeks they've already submitted picks for)
        const userWeeksRemaining = Math.max(0, weeksRemaining - standing.submittedFutureWeeks.size);
        
        // Simulate only weeks not yet submitted
        if (userWeeksRemaining > 0) {
          total += simulateRemainingWeeks(
            new Set(standing.usedPlayerIds), 
            playerProjections, 
            userWeeksRemaining
          );
        }
        
        totals.set(oddsUserId, total);
      }
      
      // Find max points
      let maxPts = -1;
      for (const total of totals.values()) { 
        if (total > maxPts) maxPts = total;
      }
      
      // Collect all users tied at max (handles ties fairly)
      const tiedWinners: string[] = [];
      for (const [oddsUserId, total] of totals) {
        if (total === maxPts) tiedWinners.push(oddsUserId);
      }
      
      // Randomly select winner from tied users
      if (tiedWinners.length > 0) {
        const winner = tiedWinners[Math.floor(Math.random() * tiedWinners.length)];
        userWins.set(winner, (userWins.get(winner) || 0) + 1);
    }
    }

    // Group users by game state to ensure identical situations get equal probability
    // Include submitted future picks in the state key since they affect outcomes
    const gameStateGroups = new Map<string, string[]>();

    for (const [oddsUserId, standing] of userStandings) {
      // Create a key from current points, sorted used player IDs, AND sorted future picks
      const sortedPlayerIds = [...standing.usedPlayerIds].sort((a: number, b: number) => a - b).join(',');
      const sortedFuturePicks = [...standing.submittedFuturePicks]
        .sort((a: { playerId: number }, b: { playerId: number }) => a.playerId - b.playerId)
        .map((p: { playerId: number }) => p.playerId)
        .join(',');
      const stateKey = `${standing.currentPoints.toFixed(1)}_${sortedPlayerIds}_${sortedFuturePicks}`;

      if (!gameStateGroups.has(stateKey)) {
        gameStateGroups.set(stateKey, []);
      }
      gameStateGroups.get(stateKey)!.push(oddsUserId);
    }

    // Average win counts for users with identical game states
    for (const [_stateKey, userIds] of gameStateGroups) {
      if (userIds.length > 1) {
        const totalWins = userIds.reduce((sum, id) => sum + (userWins.get(id) || 0), 0);
        const avgWins = totalWins / userIds.length;
        for (const id of userIds) {
          userWins.set(id, avgWins);
        }
      }
    }

    // Build results
    const results = [];
    for (const [oddsUserId, standing] of userStandings) {
      const wins = userWins.get(oddsUserId) || 0;
      const prob = wins / SIMULATIONS;
      const pct = Math.round(prob * 1000) / 10;
      results.push({
        userId: standing.userId,
        displayName: standing.displayName,
        avatarUrl: standing.avatarUrl,
        currentPoints: Math.round(standing.currentPoints * 10) / 10,
        winProbability: prob,
        winProbabilityDisplay: prob < 0.001 ? '<0.1%' : `${pct}%`,
        // Debug info
        submittedFutureWeeks: Array.from(standing.submittedFutureWeeks),
        weeksToSimulate: Math.max(0, weeksRemaining - standing.submittedFutureWeeks.size),
      });
    }

    results.sort((a, b) => b.winProbability - a.winProbability);

    return new Response(JSON.stringify({ 
      success: true, 
      leagueId, 
      currentWeek, 
      weeksRemaining,
      gamesAreLive,
      allGamesFinished,
      firstGameKickoff,
      simulations: SIMULATIONS, 
      eliminatedTeams: Array.from(eliminatedTeamIds),
      playerPoolSize: playerProjections.length,
      odds: results 
    }, null, 2), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
