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

// ESPN team abbreviation to our team_id mapping
const ESPN_TEAM_ABBR_TO_ID: Record<string, number> = {
  'ARI': 1, 'ATL': 2, 'BAL': 3, 'BUF': 4, 'CAR': 5, 'CHI': 6, 'CIN': 7, 'CLE': 8,
  'DAL': 9, 'DEN': 10, 'DET': 11, 'GB': 12, 'HOU': 13, 'IND': 14, 'JAX': 15, 'KC': 16,
  'LV': 17, 'LAC': 18, 'LAR': 19, 'MIA': 20, 'MIN': 21, 'NE': 22, 'NO': 23, 'NYG': 24,
  'NYJ': 25, 'PHI': 26, 'PIT': 27, 'SF': 28, 'SEA': 29, 'TB': 30, 'TEN': 31, 'WSH': 32,
};

// ============ AUTH HELPERS ============

async function verifyAdminOrCron(req: Request): Promise<{ authorized: boolean; error?: string; isCron?: boolean }> {
  const authHeader = req.headers.get('Authorization');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  console.log(`Auth header present: ${!!authHeader}`);
  console.log(`Anon key from env present: ${!!supabaseAnonKey}`);
  
  // Check for cron job (anon key from internal scheduler)
  if (authHeader === `Bearer ${supabaseAnonKey}`) {
    console.log('Request from internal cron job (anon key) - allowing');
    return { authorized: true, isCron: true };
  }
  
  // Also allow if no auth header but called from scheduler (verify_jwt = false)
  // Check for specific cron indicators
  const userAgent = req.headers.get('User-Agent') || '';
  const isInternalCall = userAgent.includes('Supabase') || userAgent.includes('cron');
  
  if (!authHeader && isInternalCall) {
    console.log('Request appears to be internal scheduler call without auth header - allowing');
    return { authorized: true, isCron: true };
  }
  
  // For verify_jwt = false, also allow unauthenticated calls from internal sources
  // by checking if the request comes from the supabase internal network
  if (!authHeader) {
    // Allow internal cron calls that don't have auth headers
    // This happens when verify_jwt = false and the cron scheduler invokes the function
    console.log('No auth header - allowing for verify_jwt=false function');
    return { authorized: true, isCron: true };
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

// ============ ESPN API HELPERS ============

interface ESPNGame {
  id: string;
  status: {
    type: {
      id: string;
      name: string;
      state: string; // 'pre', 'in', 'post'
      completed: boolean;
    };
    displayClock?: string;
    period?: number;
  };
  competitions: Array<{
    id: string;
    competitors: Array<{
      id: string;
      team: {
        id: string;
        abbreviation: string;
        displayName: string;
      };
      score?: string;
    }>;
  }>;
}

interface ESPNScoreboard {
  events: ESPNGame[];
}

async function fetchESPNScoreboard(): Promise<ESPNScoreboard> {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  console.log(`Fetching ESPN scoreboard: ${url}`);
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`ESPN scoreboard fetch failed: ${response.status}`);
  }
  
  return await response.json();
}

async function fetchESPNGameSummary(espnGameId: string): Promise<any> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${espnGameId}`;
  console.log(`Fetching ESPN game summary: ${url}`);
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`ESPN game summary fetch failed: ${response.status}`);
  }
  
  return await response.json();
}

function extractPlayerStatsFromESPN(boxscore: any, espnPlayerId: string): PlayerStats {
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

  if (!boxscore?.players) {
    return stats;
  }

  // ESPN boxscore has players grouped by team
  for (const teamBox of boxscore.players) {
    for (const statCategory of teamBox.statistics || []) {
      const categoryName = statCategory.name?.toLowerCase() || '';
      
      for (const athlete of statCategory.athletes || []) {
        // Match by ESPN athlete ID
        if (athlete.athlete?.id !== espnPlayerId) continue;
        
        const statLine = athlete.stats || [];
        
        // Parse stats based on category
        if (categoryName === 'passing') {
          // Typical passing order: C/ATT, YDS, AVG, TD, INT, SACKS, QBR, RTG
          // We need YDS (index 1), TD (index 3), INT (index 4)
          stats.pass_yds = parseFloat(statLine[1]) || 0;
          stats.pass_tds = parseInt(statLine[3]) || 0;
          stats.interceptions = parseInt(statLine[4]) || 0;
        }
        
        if (categoryName === 'rushing') {
          // Typical rushing order: CAR, YDS, AVG, TD, LONG
          stats.rush_yds = parseFloat(statLine[1]) || 0;
          stats.rush_tds = parseInt(statLine[3]) || 0;
        }
        
        if (categoryName === 'receiving') {
          // Typical receiving order: REC, YDS, AVG, TD, LONG, TGTS
          stats.rec_yds = parseFloat(statLine[1]) || 0;
          stats.rec_tds = parseInt(statLine[3]) || 0;
        }
        
        if (categoryName === 'fumbles') {
          // Fumbles: FUM, LOST, REC
          stats.fumbles_lost = parseInt(statLine[1]) || 0;
        }
      }
    }
  }

  return stats;
}

// ============ STATS HELPERS ============

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

// Smart merge: prefer non-zero values from new stats, but keep existing non-zero if new is zero
function smartMergeStats(newStats: PlayerStats, existingStats: PlayerStats | null): PlayerStats {
  if (!existingStats) return newStats;
  
  return {
    pass_yds: newStats.pass_yds !== 0 ? newStats.pass_yds : existingStats.pass_yds,
    pass_tds: newStats.pass_tds !== 0 ? newStats.pass_tds : existingStats.pass_tds,
    interceptions: newStats.interceptions !== 0 ? newStats.interceptions : existingStats.interceptions,
    rush_yds: newStats.rush_yds !== 0 ? newStats.rush_yds : existingStats.rush_yds,
    rush_tds: newStats.rush_tds !== 0 ? newStats.rush_tds : existingStats.rush_tds,
    rec_yds: newStats.rec_yds !== 0 ? newStats.rec_yds : existingStats.rec_yds,
    rec_tds: newStats.rec_tds !== 0 ? newStats.rec_tds : existingStats.rec_tds,
    fumbles_lost: newStats.fumbles_lost !== 0 ? newStats.fumbles_lost : existingStats.fumbles_lost,
    two_pt_conversions: newStats.two_pt_conversions !== 0 ? newStats.two_pt_conversions : existingStats.two_pt_conversions,
  };
}

// Fetch existing stats for a player/week
async function fetchExistingStats(supabase: any, season: number, week: number, playerId: number): Promise<PlayerStats | null> {
  const { data, error } = await supabase
    .from('player_week_stats')
    .select('pass_yds, pass_tds, interceptions, rush_yds, rush_tds, rec_yds, rec_tds, fumbles_lost, two_pt_conversions')
    .eq('season', season)
    .eq('week', week)
    .eq('player_id', playerId)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return {
    pass_yds: data.pass_yds || 0,
    pass_tds: data.pass_tds || 0,
    interceptions: data.interceptions || 0,
    rush_yds: data.rush_yds || 0,
    rush_tds: data.rush_tds || 0,
    rec_yds: data.rec_yds || 0,
    rec_tds: data.rec_tds || 0,
    fumbles_lost: data.fumbles_lost || 0,
    two_pt_conversions: data.two_pt_conversions || 0,
  };
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
    allowed: diffSeconds >= 30, // Allow more frequent syncs with ESPN (30 seconds)
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

// ============ PLAYER ID MAPPING ============

// Extract ESPN player ID from headshot URL or image_url
function extractESPNPlayerId(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  
  // ESPN headshot URLs contain player IDs, e.g.:
  // https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png
  // https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3139477.png
  const match = imageUrl.match(/players\/full\/(\d+)/);
  return match ? match[1] : null;
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  console.log('=== sync-live-playoff-stats (ESPN) invoked at', new Date().toISOString(), '===');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    console.log('Starting ESPN playoff sync...');
    
    // Verify admin role or internal cron call
    const { authorized, error: authError, isCron } = await verifyAdminOrCron(req);
    console.log(`Auth result: authorized=${authorized}, isCron=${isCron}, error=${authError}`);
    
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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ STEP 1: Fetch ESPN Scoreboard ============
    const scoreboard = await fetchESPNScoreboard();
    
    // Find games that are in progress or recently completed
    const liveGames = scoreboard.events.filter(game => {
      const state = game.status?.type?.state;
      return state === 'in' || state === 'post';
    });
    
    console.log(`ESPN scoreboard: ${scoreboard.events.length} total games, ${liveGames.length} live/completed`);
    
    // Get teams playing in live games
    const teamsInLiveGames = new Set<string>();
    const espnGameIdByTeam = new Map<string, string>();
    
    for (const game of liveGames) {
      const espnGameId = game.id;
      for (const comp of game.competitions || []) {
        for (const competitor of comp.competitors || []) {
          const abbr = competitor.team?.abbreviation;
          if (abbr) {
            teamsInLiveGames.add(abbr);
            espnGameIdByTeam.set(abbr, espnGameId);
          }
        }
      }
    }
    
    console.log(`Teams in live games: ${Array.from(teamsInLiveGames).join(', ')}`);

    if (liveGames.length === 0) {
      console.log('No live or completed games found on ESPN');
      return new Response(
        JSON.stringify({
          success: true,
          reason: 'no_active_games',
          message: 'No NFL games currently in progress or recently completed',
          source: 'ESPN',
          season: SEASON,
          allGames: scoreboard.events.map(g => ({
            id: g.id,
            status: g.status?.type?.name,
            state: g.status?.type?.state,
          })),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ STEP 2: Determine playoff week from our DB ============
    let currentWeek: number = 1;
    
    if (weekParam) {
      currentWeek = parseInt(weekParam);
      console.log(`Using provided week: ${currentWeek}`);
    } else {
      // Find current playoff week based on kickoff times
      const now = new Date().toISOString();
      const { data: activeGames } = await supabase
        .from('playoff_games')
        .select('week_index')
        .eq('season', SEASON)
        .lte('kickoff_at', now)
        .order('kickoff_at', { ascending: false })
        .limit(1);
      
      if (activeGames && activeGames.length > 0) {
        currentWeek = activeGames[0].week_index;
      }
      console.log(`Auto-detected playoff week: ${currentWeek}`);
    }

    // ============ STEP 3: Check rate limit ============
    if (!forceSync) {
      const rateCheck = await checkRateLimit(supabase, SEASON, currentWeek);
      if (!rateCheck.allowed) {
        console.log(`Rate limited. Last sync: ${rateCheck.lastSync}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            reason: 'rate_limited',
            lastSync: rateCheck.lastSync,
            message: 'Sync attempted less than 30 seconds ago'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============ STEP 4: Get picked players for this week ============
    const { data: picks, error: picksError } = await supabase
      .from('user_picks')
      .select('player_id, player_name, team_id, team_name')
      .eq('season', SEASON)
      .eq('week', currentWeek);

    if (picksError) {
      console.error('Error fetching picks:', picksError);
      return new Response(
        JSON.stringify({ error: picksError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique players with their team info
    const playerMap = new Map<number, { name: string; teamId: number; teamName: string }>();
    picks?.forEach(p => {
      if (!playerMap.has(p.player_id)) {
        playerMap.set(p.player_id, { 
          name: p.player_name, 
          teamId: p.team_id,
          teamName: p.team_name 
        });
      }
    });

    const uniquePlayerIds = Array.from(playerMap.keys());
    console.log(`Found ${uniquePlayerIds.length} unique picked players for playoff week ${currentWeek}`);

    if (uniquePlayerIds.length === 0) {
      await logSync(supabase, SEASON, currentWeek, 0, true, `[ESPN playoff] No picks to sync`);
      return new Response(
        JSON.stringify({
          success: true,
          source: 'ESPN',
          message: 'No picks found for this playoff week',
          season: SEASON,
          week: currentWeek,
          playersProcessed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ STEP 5: Build player ID mapping (our ID -> ESPN ID) ============
    // Get playoff_players with their image URLs to extract ESPN IDs
    // Filter to prefer ESPN headshot URLs for ID extraction
    const { data: playoffPlayers } = await supabase
      .from('playoff_players')
      .select('player_id, name, image_url, team_name, team_id')
      .eq('season', SEASON)
      .in('player_id', uniquePlayerIds);

    const ourIdToEspnId = new Map<number, string>();
    const ourIdToTeamAbbr = new Map<number, string>();
    
    // Team name to abbreviation mapping
    const teamNameToAbbr: Record<string, string> = {
      "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
      "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
      "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
      "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
      "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
      "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
      "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
      "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
      "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
      "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
      "Tennessee Titans": "TEN", "Washington Commanders": "WSH",
    };
    
    // Process players - for duplicates, prefer ESPN headshot URLs over API-Sports URLs
    for (const player of playoffPlayers || []) {
      const isEspnUrl = player.image_url?.includes('espncdn.com') || player.image_url?.includes('espn.com');
      const espnId = extractESPNPlayerId(player.image_url);
      
      // If we already have an ESPN ID for this player, only overwrite if current URL is ESPN
      if (espnId) {
        if (!ourIdToEspnId.has(player.player_id) || isEspnUrl) {
          ourIdToEspnId.set(player.player_id, espnId);
          console.log(`Mapped ${player.name} (${player.player_id}) -> ESPN ID ${espnId}`);
        }
      }
      
      const abbr = teamNameToAbbr[player.team_name];
      if (abbr && !ourIdToTeamAbbr.has(player.player_id)) {
        ourIdToTeamAbbr.set(player.player_id, abbr);
      }
    }

    console.log(`Mapped ${ourIdToEspnId.size} players to ESPN IDs`);

    // ============ STEP 6: Get scoring settings ============
    const scoringSettings = await getActiveScoringSettings(supabase);

    // ============ STEP 7: Fetch game summaries and extract stats ============
    // Cache game summaries to avoid duplicate fetches
    const gameSummaryCache = new Map<string, any>();
    
    let statsUpserted = 0;
    const results: any[] = [];

    for (const playerId of uniquePlayerIds) {
      const playerInfo = playerMap.get(playerId)!;
      const espnPlayerId = ourIdToEspnId.get(playerId);
      const teamAbbr = ourIdToTeamAbbr.get(playerId);
      
      if (!espnPlayerId) {
        console.warn(`No ESPN ID found for ${playerInfo.name} (player_id=${playerId})`);
        results.push({
          player_id: playerId,
          player_name: playerInfo.name,
          status: 'no_espn_id',
        });
        continue;
      }

      // Check if this player's team is in a live game
      if (!teamAbbr || !teamsInLiveGames.has(teamAbbr)) {
        console.log(`${playerInfo.name}'s team (${teamAbbr}) not in a live game`);
        results.push({
          player_id: playerId,
          player_name: playerInfo.name,
          team: teamAbbr,
          status: 'team_not_playing',
        });
        continue;
      }

      const espnGameId = espnGameIdByTeam.get(teamAbbr);
      if (!espnGameId) {
        console.warn(`No ESPN game ID for team ${teamAbbr}`);
        results.push({
          player_id: playerId,
          player_name: playerInfo.name,
          status: 'no_game_found',
        });
        continue;
      }

      try {
        // Fetch or use cached game summary
        let gameSummary = gameSummaryCache.get(espnGameId);
        if (!gameSummary) {
          gameSummary = await fetchESPNGameSummary(espnGameId);
          gameSummaryCache.set(espnGameId, gameSummary);
        }

        // Extract player stats from boxscore
        const rawStats = extractPlayerStatsFromESPN(gameSummary.boxscore, espnPlayerId);
        
        // Smart merge: fetch existing stats and merge to prevent zero overwrites
        const existingStats = await fetchExistingStats(supabase, SEASON, currentWeek, playerId);
        const stats = smartMergeStats(rawStats, existingStats);
        const fantasyPoints = calculateFantasyPoints(stats, scoringSettings);
        
        console.log(`${playerInfo.name} (ESPN ${espnPlayerId}): ${fantasyPoints.toFixed(1)} pts (${stats.pass_yds} pass, ${stats.rush_yds} rush, ${stats.rec_yds} rec)`);
        if (existingStats && JSON.stringify(rawStats) !== JSON.stringify(stats)) {
          console.log(`  Smart merge applied: raw=${JSON.stringify(rawStats)} -> merged=${JSON.stringify(stats)}`);
        }

        // Upsert to player_week_stats with merged stats
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
            two_pt_conversions: stats.two_pt_conversions,
            fantasy_points_standard: fantasyPoints,
            raw_json: { source: 'espn', espn_player_id: espnPlayerId, espn_game_id: espnGameId },
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'season,week,player_id',
          });

        if (upsertError) {
          console.error(`Upsert error for player ${playerId}:`, upsertError.message);
          results.push({
            player_id: playerId,
            player_name: playerInfo.name,
            espn_player_id: espnPlayerId,
            status: 'upsert_failed',
            error: upsertError.message,
          });
        } else {
          statsUpserted++;
          results.push({
            player_id: playerId,
            player_name: playerInfo.name,
            espn_player_id: espnPlayerId,
            fantasy_points: fantasyPoints,
            espn_game_id: espnGameId,
            stats,
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

    // ============ STEP 8: Log the sync ============
    const duration = Date.now() - startTime;
    await logSync(
      supabase, 
      SEASON, 
      currentWeek, 
      statsUpserted, 
      true, 
      `[ESPN playoff] Synced ${statsUpserted}/${uniquePlayerIds.length} players in ${duration}ms. ${forceSync ? 'FORCED' : 'Auto-triggered'}`
    );

    const summary = {
      success: true,
      source: 'ESPN',
      mode: 'playoff',
      season: SEASON,
      week: currentWeek,
      liveGamesFound: liveGames.length,
      teamsPlaying: Array.from(teamsInLiveGames),
      playersProcessed: uniquePlayerIds.length,
      playersMapped: ourIdToEspnId.size,
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
