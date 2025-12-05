import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify admin role
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { authorized: false, error: 'Invalid user token' };
  }

  // Check admin role using the has_role function
  const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (roleError || !isAdmin) {
    console.log(`User ${user.id} is not an admin`);
    return { authorized: false, error: 'User is not an admin' };
  }

  console.log(`Admin verified: ${user.id}`);
  return { authorized: true };
}

interface PlayerStats {
  pass_yds: number;
  pass_tds: number;
  interceptions: number;
  rush_yds: number;
  rush_tds: number;
  rec_yds: number;
  rec_tds: number;
  fumbles_lost: number;
  two_pt_conversions: number;
}

interface ScoringSettings {
  pass_yds_per_point: number;
  rush_yds_per_point: number;
  rec_yds_per_point: number;
  pass_td_points: number;
  rush_td_points: number;
  rec_td_points: number;
  interception_points: number;
  fumble_lost_points: number;
  two_pt_conversion_pts: number;
}

const DEFAULT_SCORING: ScoringSettings = {
  pass_yds_per_point: 25,
  rush_yds_per_point: 10,
  rec_yds_per_point: 10,
  pass_td_points: 5,
  rush_td_points: 6,
  rec_td_points: 6,
  interception_points: -2,
  fumble_lost_points: -2,
  two_pt_conversion_pts: 2,
};

function extractStats(response: any): PlayerStats {
  const stats: PlayerStats = {
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

  if (!response?.response?.[0]?.groups) {
    return stats;
  }

  const groups = response.response[0].groups;
  let passingTwoPt = 0;
  let rushingTwoPt = 0;
  let receivingTwoPt = 0;

  for (const group of groups) {
    const groupName = group.name?.toLowerCase() || '';
    const players = group.players || [];
    
    if (players.length === 0) continue;
    
    const statistics = players[0].statistics || [];

    for (const stat of statistics) {
      const statName = stat.name?.toLowerCase() || '';
      const value = parseFloat(stat.value) || 0;

      if (groupName === 'rushing') {
        if (statName === 'yards') stats.rush_yds = value;
        if (statName === 'rushing touch downs') stats.rush_tds = value;
        if (statName === 'two pt') rushingTwoPt = value;
      }

      if (groupName === 'passing') {
        if (statName === 'yards') stats.pass_yds = value;
        if (statName === 'passing touch downs') stats.pass_tds = value;
        if (statName === 'interceptions') stats.interceptions = value;
        if (statName === 'two pt') passingTwoPt = value;
      }

      if (groupName === 'receiving') {
        if (statName === 'yards') stats.rec_yds = value;
        if (statName === 'receiving touch downs') stats.rec_tds = value;
        if (statName === 'two pt') receivingTwoPt = value;
      }

      if (groupName === 'fumbles') {
        if (statName === 'lost' || statName === 'fumbles lost') stats.fumbles_lost = value;
      }
    }
  }

  stats.two_pt_conversions = (passingTwoPt || 0) + (rushingTwoPt || 0) + (receivingTwoPt || 0);
  return stats;
}

function calculateFantasyPoints(stats: PlayerStats, settings: ScoringSettings): number {
  const passYdsMult = 1 / settings.pass_yds_per_point;
  const rushYdsMult = 1 / settings.rush_yds_per_point;
  const recYdsMult = 1 / settings.rec_yds_per_point;

  return (
    stats.pass_tds * settings.pass_td_points +
    stats.pass_yds * passYdsMult +
    stats.rush_tds * settings.rush_td_points +
    stats.rush_yds * rushYdsMult +
    stats.rec_tds * settings.rec_td_points +
    stats.rec_yds * recYdsMult +
    stats.interceptions * settings.interception_points +
    stats.fumbles_lost * settings.fumble_lost_points +
    stats.two_pt_conversions * settings.two_pt_conversion_pts
  );
}

async function getActiveScoringSettings(supabase: any): Promise<ScoringSettings> {
  const { data, error } = await supabase
    .from('scoring_settings')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    console.log('No active scoring settings found, using defaults');
    return DEFAULT_SCORING;
  }

  return {
    pass_yds_per_point: Number(data.pass_yds_per_point),
    rush_yds_per_point: Number(data.rush_yds_per_point),
    rec_yds_per_point: Number(data.rec_yds_per_point),
    pass_td_points: Number(data.pass_td_points),
    rush_td_points: Number(data.rush_td_points),
    rec_td_points: Number(data.rec_td_points),
    interception_points: Number(data.interception_points),
    fumble_lost_points: Number(data.fumble_lost_points),
    two_pt_conversion_pts: Number(data.two_pt_conversion_pts),
  };
}

// Check if we're in a valid NFL game window (Thursday night, Sunday, Monday night)
function isGameWindowActive(games: any[]): { active: boolean; reason: string; activeGames: number } {
  const now = new Date();
  let activeGames = 0;
  
  for (const game of games) {
    if (!game.game_date) continue;
    
    const gameDate = new Date(game.game_date);
    const gameEndEstimate = new Date(gameDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours after kickoff
    
    // Check if game is in progress or recently started (within 4 hours of kickoff)
    if (now >= gameDate && now <= gameEndEstimate) {
      activeGames++;
    }
  }
  
  if (activeGames > 0) {
    return { active: true, reason: `${activeGames} game(s) potentially in progress`, activeGames };
  }
  
  return { active: false, reason: 'No games currently in progress', activeGames: 0 };
}

// Rate limiting check - ensure we haven't synced in the last 60 seconds
async function checkRateLimit(supabase: any, season: number, week: number): Promise<{ allowed: boolean; lastSync: string | null }> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('synced_at')
    .eq('season', season)
    .eq('week', week)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    return { allowed: true, lastSync: null };
  }
  
  const lastSyncTime = new Date(data.synced_at);
  const now = new Date();
  const diffSeconds = (now.getTime() - lastSyncTime.getTime()) / 1000;
  
  return {
    allowed: diffSeconds >= 60,
    lastSync: data.synced_at,
  };
}

// Log the sync attempt
async function logSync(supabase: any, season: number, week: number, playersUpdated: number, success: boolean, notes: string) {
  await supabase
    .from('sync_logs')
    .insert({
      season,
      week,
      players_updated: playersUpdated,
      success,
      notes,
    });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Verify admin role
    const { authorized, error: authError } = await verifyAdmin(req);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const forceSync = url.searchParams.get('force') === 'true';
    const weekParam = url.searchParams.get('week');
    
    // Default to 2025 regular season
    const SEASON = 2025;
    
    const apiKey = Deno.env.get('API_SPORTS_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API_SPORTS_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine current week from schedule
    let currentWeek: number;
    
    if (weekParam) {
      currentWeek = parseInt(weekParam);
      console.log(`Using provided week: ${currentWeek}`);
    } else {
      // Find the current week based on game dates
      const { data: upcomingGames } = await supabase
        .from('regular_season_games')
        .select('week, game_date')
        .eq('season', SEASON)
        .gte('game_date', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Within last 4 hours
        .order('game_date', { ascending: true })
        .limit(1);
      
      if (upcomingGames && upcomingGames.length > 0) {
        currentWeek = upcomingGames[0].week;
      } else {
        // Default to week 14 if no games found
        currentWeek = 14;
      }
      console.log(`Auto-detected week: ${currentWeek}`);
    }

    // Check rate limit (skip if force sync)
    if (!forceSync) {
      const rateCheck = await checkRateLimit(supabase, SEASON, currentWeek);
      if (!rateCheck.allowed) {
        console.log(`Rate limited. Last sync: ${rateCheck.lastSync}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: 'rate_limited',
            lastSync: rateCheck.lastSync,
            message: 'Sync attempted less than 60 seconds ago'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch games for this week to check if any are active
    const { data: weekGames, error: gamesError } = await supabase
      .from('regular_season_games')
      .select('*')
      .eq('season', SEASON)
      .eq('week', currentWeek);

    if (gamesError) {
      console.error('Error fetching games:', gamesError);
      return new Response(
        JSON.stringify({ error: gamesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if games are active (skip if force sync)
    const gameWindow = isGameWindowActive(weekGames || []);
    if (!forceSync && !gameWindow.active) {
      console.log(`No active games: ${gameWindow.reason}`);
      return new Response(
        JSON.stringify({
          success: true,
          reason: 'no_active_games',
          message: gameWindow.reason,
          week: currentWeek,
          gamesChecked: weekGames?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proceeding with sync: ${forceSync ? 'FORCED' : gameWindow.reason}`);

    // Fetch scoring settings
    const scoringSettings = await getActiveScoringSettings(supabase);

    // Get distinct player_ids from user_picks for this week (only selected players)
    const { data: picks, error: picksError } = await supabase
      .from('user_picks')
      .select('player_id, player_name, team_id')
      .eq('season', SEASON)
      .eq('week', currentWeek);

    if (picksError) {
      console.error('Error fetching picks:', picksError);
      return new Response(
        JSON.stringify({ error: picksError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique players
    const playerMap = new Map<number, { name: string; teamId: number }>();
    picks?.forEach(p => {
      if (!playerMap.has(p.player_id)) {
        playerMap.set(p.player_id, { name: p.player_name, teamId: p.team_id });
      }
    });

    const uniquePlayerIds = Array.from(playerMap.keys());
    console.log(`Found ${uniquePlayerIds.length} unique players to sync for week ${currentWeek}`);

    if (uniquePlayerIds.length === 0) {
      await logSync(supabase, SEASON, currentWeek, 0, true, 'No picks to sync');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No picks found for this week',
          week: currentWeek,
          playersProcessed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a map of team_id -> game_id from the week's games
    const teamGameMap = new Map<number, number>();
    weekGames?.forEach(game => {
      teamGameMap.set(game.home_team_api_id, game.api_game_id);
      teamGameMap.set(game.away_team_api_id, game.api_game_id);
    });

    let statsUpserted = 0;
    const results: any[] = [];

    for (const playerId of uniquePlayerIds) {
      const playerInfo = playerMap.get(playerId)!;
      const gameId = teamGameMap.get(playerInfo.teamId);

      if (!gameId) {
        console.warn(`No game found for player ${playerInfo.name} (team ${playerInfo.teamId})`);
        results.push({
          player_id: playerId,
          player_name: playerInfo.name,
          status: 'no_game_found',
        });
        continue;
      }

      try {
        // Fetch stats from API-Sports
        const apiUrl = `https://v1.american-football.api-sports.io/games/statistics/players?id=${gameId}&player=${playerId}`;
        
        const response = await fetch(apiUrl, {
          headers: {
            'x-apisports-key': apiKey,
            'accept': 'application/json',
          },
        });

        const apiResponse = await response.json();
        const stats = extractStats(apiResponse);
        const fantasyPoints = calculateFantasyPoints(stats, scoringSettings);

        // Upsert to player_week_stats
        const { error: upsertError } = await supabase
          .from('player_week_stats')
          .upsert({
            season: SEASON,
            week: currentWeek,
            player_id: playerId,
            player_name: playerInfo.name,
            pass_yds: stats.pass_yds,
            pass_tds: stats.pass_tds,
            interceptions: stats.interceptions,
            rush_yds: stats.rush_yds,
            rush_tds: stats.rush_tds,
            rec_yds: stats.rec_yds,
            rec_tds: stats.rec_tds,
            fumbles_lost: stats.fumbles_lost,
            fantasy_points_standard: fantasyPoints,
            raw_json: apiResponse,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'season,week,player_id',
          });

        if (upsertError) {
          console.error(`Upsert error for player ${playerId}:`, upsertError.message);
          results.push({
            player_id: playerId,
            player_name: playerInfo.name,
            status: 'upsert_failed',
            error: upsertError.message,
          });
        } else {
          statsUpserted++;
          results.push({
            player_id: playerId,
            player_name: playerInfo.name,
            fantasy_points: fantasyPoints,
            status: 'success',
          });
        }
      } catch (err) {
        console.error(`Error fetching stats for player ${playerId}:`, err);
        results.push({
          player_id: playerId,
          player_name: playerInfo.name,
          status: 'fetch_failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Log the sync
    const duration = Date.now() - startTime;
    await logSync(
      supabase, 
      SEASON, 
      currentWeek, 
      statsUpserted, 
      true, 
      `Synced ${statsUpserted}/${uniquePlayerIds.length} players in ${duration}ms. ${forceSync ? 'FORCED' : 'Auto-triggered'}`
    );

    const summary = {
      success: true,
      season: SEASON,
      week: currentWeek,
      playersProcessed: uniquePlayerIds.length,
      statsUpserted,
      durationMs: duration,
      forced: forceSync,
      results,
    };

    console.log(`Sync complete: ${statsUpserted}/${uniquePlayerIds.length} stats upserted in ${duration}ms`);

    return new Response(
      JSON.stringify(summary, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
