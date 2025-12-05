import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  // Track 2-pt conversions from each group
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
        // API returns "lost" not "fumbles lost" in the fumbles group
        if (statName === 'lost' || statName === 'fumbles lost') stats.fumbles_lost = value;
      }
    }
  }

  // Total 2-pt conversions from all groups (Yahoo-style: passer, rusher, and receiver each get credit)
  stats.two_pt_conversions = (passingTwoPt || 0) + (rushingTwoPt || 0) + (receivingTwoPt || 0);

  return stats;
}

function calculateFantasyPoints(stats: PlayerStats, settings: ScoringSettings): number {
  // Convert "yards per point" to multipliers
  const passYdsMult = 1 / settings.pass_yds_per_point;
  const rushYdsMult = 1 / settings.rush_yds_per_point;
  const recYdsMult = 1 / settings.rec_yds_per_point;

  return (
    // Passing
    stats.pass_tds * settings.pass_td_points +
    stats.pass_yds * passYdsMult +
    // Rushing
    stats.rush_tds * settings.rush_td_points +
    stats.rush_yds * rushYdsMult +
    // Receiving
    stats.rec_tds * settings.rec_td_points +
    stats.rec_yds * recYdsMult +
    // Turnovers
    stats.interceptions * settings.interception_points +
    stats.fumbles_lost * settings.fumble_lost_points +
    // 2-pt conversions
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

  console.log('Using scoring settings:', data.name);
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

async function fetchAndUpsertPlayerStats(
  supabase: any,
  apiKey: string,
  season: number,
  week: number,
  playerId: number,
  gameId: number,
  scoringSettings: ScoringSettings,
  playerName: string
): Promise<{ success: boolean; fantasyPoints: number; twoPtConversions: number }> {
  
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

  const { error } = await supabase
    .from('player_week_stats')
    .upsert({
      season,
      week,
      player_id: playerId,
      player_name: playerName,
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

  if (error) {
    console.error(`Upsert error for player ${playerId}:`, error.message);
    return { success: false, fantasyPoints: 0, twoPtConversions: 0 };
  }

  return { success: true, fantasyPoints, twoPtConversions: stats.two_pt_conversions };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const week = parseInt(url.searchParams.get('week') || '0');
    const season = 2024;

    if (!week || week < 1 || week > 4) {
      return new Response(
        JSON.stringify({ error: 'Invalid week param (must be 1-4)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Fetch active scoring settings once for all players
    const scoringSettings = await getActiveScoringSettings(supabase);

    // Step 1: Get distinct player_ids from user_picks for this week
    const { data: picks, error: picksError } = await supabase
      .from('user_picks')
      .select('player_id')
      .eq('season', season)
      .eq('week', week);

    if (picksError) {
      console.error('Error fetching picks:', picksError);
      return new Response(
        JSON.stringify({ error: picksError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique player IDs
    const uniquePlayerIds = [...new Set(picks.map(p => p.player_id))];
    console.log(`Found ${uniquePlayerIds.length} unique players for week ${week}`);

    const results: Array<{
      player_id: number;
      player_name: string;
      game_id: number;
      fantasy_points: number;
      two_pt_conversions: number;
      status: string;
    }> = [];

    let statsUpserted = 0;

    for (const playerId of uniquePlayerIds) {
      // Step 2: Look up player's team_id from playoff_players
      const { data: playerData } = await supabase
        .from('playoff_players')
        .select('team_id, name')
        .eq('player_id', playerId)
        .maybeSingle();

      if (!playerData) {
        console.warn(`Player ${playerId} not found in playoff_players, skipping`);
        results.push({
          player_id: playerId,
          player_name: 'Unknown',
          game_id: 0,
          fantasy_points: 0,
          two_pt_conversions: 0,
          status: 'player_not_found',
        });
        continue;
      }

      // Step 3: Find the game for this team in this week
      const { data: teamData } = await supabase
        .from('playoff_teams')
        .select('id')
        .eq('team_id', playerData.team_id)
        .eq('season', season)
        .maybeSingle();

      if (!teamData) {
        console.warn(`Team ${playerData.team_id} not found in playoff_teams for player ${playerData.name}`);
        results.push({
          player_id: playerId,
          player_name: playerData.name,
          game_id: 0,
          fantasy_points: 0,
          two_pt_conversions: 0,
          status: 'team_not_found',
        });
        continue;
      }

      const { data: gameData } = await supabase
        .from('playoff_games')
        .select('game_id')
        .eq('season', season)
        .eq('week_index', week)
        .or(`home_team_id.eq.${teamData.id},away_team_id.eq.${teamData.id}`)
        .maybeSingle();

      if (!gameData) {
        console.warn(`No game found for team ${playerData.team_id} (${playerData.name}) in week ${week}`);
        results.push({
          player_id: playerId,
          player_name: playerData.name,
          game_id: 0,
          fantasy_points: 0,
          two_pt_conversions: 0,
          status: 'game_not_found',
        });
        continue;
      }

      // Step 4: Fetch stats and upsert
      console.log(`Fetching stats for ${playerData.name} (${playerId}) in game ${gameData.game_id}`);
      
      const { success, fantasyPoints, twoPtConversions } = await fetchAndUpsertPlayerStats(
        supabase,
        apiKey,
        season,
        week,
        playerId,
        gameData.game_id,
        scoringSettings,
        playerData.name
      );

      if (success) {
        statsUpserted++;
        results.push({
          player_id: playerId,
          player_name: playerData.name,
          game_id: gameData.game_id,
          fantasy_points: fantasyPoints,
          two_pt_conversions: twoPtConversions,
          status: 'success',
        });
      } else {
        results.push({
          player_id: playerId,
          player_name: playerData.name,
          game_id: gameData.game_id,
          fantasy_points: 0,
          two_pt_conversions: 0,
          status: 'upsert_failed',
        });
      }
    }

    const summary = {
      season,
      week,
      playersProcessed: uniquePlayerIds.length,
      statsUpserted,
      scoringSettingsUsed: scoringSettings,
      results,
    };

    console.log(`Sync complete: ${statsUpserted}/${uniquePlayerIds.length} stats upserted`);

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
