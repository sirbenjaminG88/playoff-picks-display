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
    return { authorized: false, error: 'User is not an admin' };
  }

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

// Rate limiter - API-Sports has 10 requests/minute on free tier
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const startWeek = parseInt(url.searchParams.get('start_week') || '1');
    const endWeek = parseInt(url.searchParams.get('end_week') || '18');
    const season = 2025;
    const batchSize = parseInt(url.searchParams.get('batch_size') || '5'); // Process N players per request to avoid timeout

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
    const scoringSettings = await getActiveScoringSettings(supabase);

    // Get players from playoff_players (these are the players we care about for odds calculation)
    const { data: playoffPlayers, error: playersError } = await supabase
      .from('playoff_players')
      .select('player_id, name, team_id, position')
      .eq('season', 2025)
      .in('position', ['QB', 'RB', 'WR', 'TE'])
      .order('player_id');

    if (playersError) {
      return new Response(
        JSON.stringify({ error: playersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${playoffPlayers.length} playoff players to sync`);

    // Get offset for pagination
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const playersToProcess = playoffPlayers.slice(offset, offset + batchSize);

    if (playersToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          complete: true, 
          message: 'All players processed',
          totalPlayers: playoffPlayers.length 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{
      player_id: number;
      player_name: string;
      weeks_synced: number;
      total_fantasy_points: number;
      avg_fantasy_points: number;
    }> = [];

    for (const player of playersToProcess) {
      let weeksSynced = 0;
      let totalPoints = 0;

      // Find games this player's team played in during regular season
      const { data: games } = await supabase
        .from('regular_season_games')
        .select('api_game_id, week')
        .eq('season', season)
        .gte('week', startWeek)
        .lte('week', endWeek)
        .or(`home_team_api_id.eq.${player.team_id},away_team_api_id.eq.${player.team_id}`)
        .order('week');

      if (!games || games.length === 0) {
        console.log(`No regular season games found for ${player.name} (team ${player.team_id})`);
        continue;
      }

      for (const game of games) {
        // Check if we already have stats for this player/week
        const { data: existingStats } = await supabase
          .from('player_week_stats')
          .select('fantasy_points_standard')
          .eq('player_id', player.player_id)
          .eq('week', game.week)
          .eq('season', season)
          .maybeSingle();

        if (existingStats) {
          // Already have this week's stats
          weeksSynced++;
          totalPoints += existingStats.fantasy_points_standard || 0;
          continue;
        }

        // Fetch from API
        const apiUrl = `https://v1.american-football.api-sports.io/games/statistics/players?id=${game.api_game_id}&player=${player.player_id}`;
        
        try {
          const response = await fetch(apiUrl, {
            headers: {
              'x-apisports-key': apiKey,
              'accept': 'application/json',
            },
          });

          const apiResponse = await response.json();
          const stats = extractStats(apiResponse);
          const fantasyPoints = calculateFantasyPoints(stats, scoringSettings);

          // Only upsert if player had some stats (played in the game)
          if (stats.pass_yds > 0 || stats.rush_yds > 0 || stats.rec_yds > 0 || 
              stats.pass_tds > 0 || stats.rush_tds > 0 || stats.rec_tds > 0) {
            
            await supabase
              .from('player_week_stats')
              .upsert({
                season,
                week: game.week,
                player_id: player.player_id,
                player_name: player.name,
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
                raw_json: apiResponse,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'season,week,player_id',
              });

            weeksSynced++;
            totalPoints += fantasyPoints;
            console.log(`Synced ${player.name} week ${game.week}: ${fantasyPoints.toFixed(1)} pts`);
          }

          // Rate limit: wait 150ms between API calls (allows ~6-7 per second, well under limits)
          await delay(150);
          
        } catch (fetchError) {
          console.error(`Error fetching stats for ${player.name} week ${game.week}:`, fetchError);
        }
      }

      results.push({
        player_id: player.player_id,
        player_name: player.name,
        weeks_synced: weeksSynced,
        total_fantasy_points: totalPoints,
        avg_fantasy_points: weeksSynced > 0 ? totalPoints / weeksSynced : 0,
      });
    }

    const response = {
      complete: offset + batchSize >= playoffPlayers.length,
      nextOffset: offset + batchSize,
      totalPlayers: playoffPlayers.length,
      processedInBatch: playersToProcess.length,
      startWeek,
      endWeek,
      results,
    };

    return new Response(
      JSON.stringify(response, null, 2),
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
