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
    console.log('No groups found in response');
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

      // Rushing stats
      if (groupName === 'rushing') {
        if (statName === 'yards') stats.rush_yds = value;
        if (statName === 'rushing touch downs') stats.rush_tds = value;
        if (statName === 'two pt') rushingTwoPt = value;
      }

      // Passing stats
      if (groupName === 'passing') {
        if (statName === 'yards') stats.pass_yds = value;
        if (statName === 'passing touch downs') stats.pass_tds = value;
        if (statName === 'interceptions') stats.interceptions = value;
        if (statName === 'two pt') passingTwoPt = value;
      }

      // Receiving stats
      if (groupName === 'receiving') {
        if (statName === 'yards') stats.rec_yds = value;
        if (statName === 'receiving touch downs') stats.rec_tds = value;
        if (statName === 'two pt') receivingTwoPt = value;
      }

      // Fumbles
      if (groupName === 'fumbles') {
        if (statName === 'fumbles lost') stats.fumbles_lost = value;
      }
    }
  }

  // Total 2-pt conversions from all groups (Yahoo-style: passer, rusher, and receiver each get credit)
  stats.two_pt_conversions = (passingTwoPt || 0) + (rushingTwoPt || 0) + (receivingTwoPt || 0);

  console.log('Extracted stats:', stats);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const season = parseInt(url.searchParams.get('season') || '2024');
    const week = parseInt(url.searchParams.get('week') || '0');
    const gameId = url.searchParams.get('game_id');
    const playerId = url.searchParams.get('player_id');

    if (!gameId || !playerId || !week) {
      return new Response(
        JSON.stringify({ error: 'Missing required params: game_id, player_id, week' }),
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

    // Fetch active scoring settings
    const scoringSettings = await getActiveScoringSettings(supabase);

    // Optional: Check if player exists in playoff_players
    const { data: playerData } = await supabase
      .from('playoff_players')
      .select('*')
      .eq('player_id', parseInt(playerId))
      .maybeSingle();

    if (!playerData) {
      console.warn(`Player ${playerId} not found in playoff_players table`);
    } else {
      console.log(`Found player: ${playerData.name} (${playerData.position}) - ${playerData.team_name}`);
    }

    // Fetch stats from API-Sports
    const apiUrl = `https://v1.american-football.api-sports.io/games/statistics/players?id=${gameId}&player=${playerId}`;
    console.log(`Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'x-apisports-key': apiKey,
        'accept': 'application/json',
      },
    });

    const apiResponse = await response.json();
    console.log('API Response results:', apiResponse.results);

    // Extract stats from response
    const stats = extractStats(apiResponse);
    
    // Calculate fantasy points using configurable settings
    const fantasyPoints = calculateFantasyPoints(stats, scoringSettings);
    console.log(`Calculated fantasy points: ${fantasyPoints}`);

    // Upsert into player_week_stats
    const { error: upsertError } = await supabase
      .from('player_week_stats')
      .upsert({
        season,
        week,
        player_id: parseInt(playerId),
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
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const summary = {
      season,
      week,
      game_id: parseInt(gameId),
      player_id: parseInt(playerId),
      player_name: playerData?.name || 'Unknown',
      stats,
      fantasy_points_standard: fantasyPoints,
      scoring_settings_used: scoringSettings,
    };

    console.log('Upsert successful:', summary);

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
