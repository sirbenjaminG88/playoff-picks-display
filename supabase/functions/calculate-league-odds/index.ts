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

    // Get all picks for this league and season (separate query)
    const { data: picks } = await supabase
      .from('user_picks')
      .select('auth_user_id, player_id, week')
      .eq('league_id', leagueId)
      .eq('season', SEASON)
      .in('week', PLAYOFF_WEEKS);

    // Get stats for all players who were picked (separate query, then join in memory)
    const playerIds = [...new Set((picks || []).map(p => p.player_id))];
    
    let statsMap = new Map<string, number>();
    if (playerIds.length > 0) {
      const { data: stats } = await supabase
        .from('player_week_stats')
        .select('player_id, week, fantasy_points_standard')
        .eq('season', SEASON)
        .in('week', PLAYOFF_WEEKS)
        .in('player_id', playerIds);

      // Create stats lookup map: {playerId}_{week} -> points
      for (const stat of stats || []) {
        statsMap.set(`${stat.player_id}_${stat.week}`, stat.fantasy_points_standard || 0);
      }
    }

    // Build standings
    const userStandings = new Map();
    const completedWeeks = new Set<number>();

    for (const member of members) {
      const user = member.users as any;
      userStandings.set(member.user_id, {
        userId: member.user_id,
        displayName: user?.display_name || 'Unknown',
        avatarUrl: user?.avatar_url || null,
        currentPoints: 0,
        usedPlayerIds: [],
      });
    }

    for (const pick of picks || []) {
      const standing = userStandings.get(pick.auth_user_id);
      if (!standing) continue;
      standing.usedPlayerIds.push(pick.player_id);
      
      // Look up stats using the composite key
      const points = statsMap.get(`${pick.player_id}_${pick.week}`) || 0;
      if (points > 0) {
        standing.currentPoints += points;
        completedWeeks.add(pick.week);
      }
    }

    const currentWeek = getCurrentPlayoffWeek(Array.from(completedWeeks));
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
        const future = simulateRemainingWeeks(new Set(standing.usedPlayerIds), playerProjections, weeksRemaining);
        totals.set(oddsUserId, standing.currentPoints + future);
      }
      let maxPts = -1, oddsWinnerId = '';
      for (const [oddsUserId, total] of totals) { 
        if (total > maxPts) { maxPts = total; oddsWinnerId = oddsUserId; } 
      }
      if (oddsWinnerId) userWins.set(oddsWinnerId, (userWins.get(oddsWinnerId) || 0) + 1);
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
      });
    }

    results.sort((a, b) => b.winProbability - a.winProbability);

    return new Response(JSON.stringify({ 
      success: true, 
      leagueId, 
      currentWeek, 
      weeksRemaining, 
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
