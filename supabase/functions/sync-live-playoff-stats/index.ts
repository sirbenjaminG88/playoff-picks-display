import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ INTERFACES ============

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

// ============ AUTH HELPERS ============

async function verifyAdminOrCron(req: Request): Promise<{ authorized: boolean; error?: string; isCron?: boolean }> {
  const authHeader = req.headers.get('Authorization');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // Check for cron job (anon key from internal scheduler)
  if (authHeader === `Bearer ${supabaseAnonKey}`) {
    console.log('Request from internal cron job (anon key) - allowing');
    return { authorized: true, isCron: true };
  }
  
  if (!authHeader) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { authorized: false, error: 'Invalid user token' };
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (roleError || !isAdmin) {
    console.log(`User ${user.id} is not an admin`);
    return { authorized: false, error: 'User is not an admin' };
  }

  console.log(`Admin verified: ${user.id}`);
  return { authorized: true, isCron: false };
}

// ============ STATS HELPERS ============

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

// ============ RATE LIMITING ============

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

// ============ MAIN HANDLER ============

serve(async (req) => {
  console.log('=== sync-live-playoff-stats invoked at', new Date().toISOString(), '===');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Verify admin role or internal cron call
    const { authorized, error: authError, isCron } = await verifyAdminOrCron(req);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Auth passed. isCron: ${isCron}`);

    const url = new URL(req.url);
    const forceSync = url.searchParams.get('force') === 'true';
    const weekParam = url.searchParams.get('week');
    
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

    // ============ STEP 1: Find current playoff week ============
    // Look for games with status in progress OR kickoff within last 6 hours
    
    let currentWeek: number = 1;
    let weekGames: any[] = [];
    
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    
    // Query for active or recent games
    const { data: activeGames, error: gamesError } = await supabase
      .from('playoff_games')
      .select('*')
      .eq('season', SEASON)
      .or(`status_short.in.(NS,Q1,Q2,Q3,Q4,HT,OT),and(kickoff_at.gte.${sixHoursAgo},kickoff_at.lte.${now})`)
      .order('kickoff_at', { ascending: true });

    if (gamesError) {
      console.error('Error fetching playoff games:', gamesError);
      return new Response(
        JSON.stringify({ error: gamesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Override with weekParam if provided
    if (weekParam) {
      currentWeek = parseInt(weekParam);
      console.log(`Using provided week: ${currentWeek}`);
      
      const { data: paramGames } = await supabase
        .from('playoff_games')
        .select('*')
        .eq('season', SEASON)
        .eq('week_index', currentWeek);
      
      weekGames = paramGames || [];
    } else if (activeGames && activeGames.length > 0) {
      // Use the week from active games
      currentWeek = activeGames[0].week_index;
      weekGames = activeGames.filter(g => g.week_index === currentWeek);
      console.log(`Auto-detected playoff week ${currentWeek} from ${weekGames.length} active games`);
    } else {
      // No active games found
      console.log('No active playoff games found');
      return new Response(
        JSON.stringify({
          success: true,
          reason: 'no_active_games',
          message: 'No playoff games currently in progress or recently started',
          season: SEASON,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing playoff week ${currentWeek}, ${weekGames.length} games found`);

    // ============ STEP 2: Check rate limit ============
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

    // ============ STEP 3: Build team-to-game mapping ============
    const teamGameMap = new Map<number, number>();
    weekGames.forEach(game => {
      teamGameMap.set(game.home_team_external_id, game.game_id);
      teamGameMap.set(game.away_team_external_id, game.game_id);
    });

    console.log(`Team-game mapping: ${Array.from(teamGameMap.entries()).map(([t, g]) => `${t}→${g}`).join(', ')}`);

    // ============ STEP 4: Get picked players for this week ============
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
    console.log(`Found ${uniquePlayerIds.length} unique picked players for playoff week ${currentWeek}`);

    if (uniquePlayerIds.length === 0) {
      await logSync(supabase, SEASON, currentWeek, 0, true, `[playoff] No picks to sync`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No picks found for this playoff week',
          season: SEASON,
          week: currentWeek,
          playersProcessed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ STEP 5: Get scoring settings ============
    const scoringSettings = await getActiveScoringSettings(supabase);

    // ============ STEP 6: Fetch and upsert stats for each player ============
    let statsUpserted = 0;
    const results: any[] = [];

    for (const playerId of uniquePlayerIds) {
      const playerInfo = playerMap.get(playerId)!;
      let gameId = teamGameMap.get(playerInfo.teamId);

      // If team_id from user_picks doesn't match directly, try looking up from playoff_players
      if (!gameId) {
        const { data: playoffPlayer } = await supabase
          .from('playoff_players')
          .select('team_id')
          .eq('player_id', playerId)
          .eq('season', SEASON)
          .maybeSingle();
        
        if (playoffPlayer) {
          gameId = teamGameMap.get(playoffPlayer.team_id);
          console.log(`Looked up playoff player ${playerInfo.name}: team_id=${playoffPlayer.team_id}, game_id=${gameId}`);
        }
      }

      if (!gameId) {
        console.warn(`No game found for player ${playerInfo.name} (player_id=${playerId}, team_id=${playerInfo.teamId})`);
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
        
        console.log(`Fetching: ${playerInfo.name} (player_id=${playerId}) from game_id=${gameId}`);
        
        const response = await fetch(apiUrl, {
          headers: {
            'x-apisports-key': apiKey,
            'accept': 'application/json',
          },
        });

        const apiResponse = await response.json();
        
        const apiResults = apiResponse?.results || 0;
        if (apiResults === 0) {
          console.warn(`API returned empty results for ${playerInfo.name} (game_id=${gameId}). Game may not have started.`);
        }

        const stats = extractStats(apiResponse);
        const fantasyPoints = calculateFantasyPoints(stats, scoringSettings);
        
        console.log(`${playerInfo.name}: ${fantasyPoints} pts (${stats.pass_yds} pass, ${stats.rush_yds} rush, ${stats.rec_yds} rec)`);

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
            game_id: gameId,
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

    // ============ STEP 7: Log the sync ============
    const duration = Date.now() - startTime;
    await logSync(
      supabase, 
      SEASON, 
      currentWeek, 
      statsUpserted, 
      true, 
      `[playoff] Synced ${statsUpserted}/${uniquePlayerIds.length} players in ${duration}ms. ${forceSync ? 'FORCED' : 'Auto-triggered'}`
    );

    const summary = {
      success: true,
      mode: 'playoff',
      season: SEASON,
      week: currentWeek,
      gamesFound: weekGames.length,
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
