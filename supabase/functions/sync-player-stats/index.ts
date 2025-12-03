import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fantasy points formula
function calculateFantasyPoints(stats: {
  pass_yds: number;
  pass_tds: number;
  interceptions: number;
  rush_yds: number;
  rush_tds: number;
  rec_yds: number;
  rec_tds: number;
  fumbles_lost: number;
}): number {
  return (
    stats.pass_tds * 4 +
    stats.pass_yds * 0.04 +
    stats.interceptions * -2 +
    stats.rush_tds * 6 +
    stats.rush_yds * 0.1 +
    stats.rec_tds * 6 +
    stats.rec_yds * 0.1 +
    stats.fumbles_lost * -2
  );
}

// Map playoff week to API-Sports game week
// 2024 NFL Playoffs: Wild Card = week 19, Divisional = week 20, Conf Champ = week 21, Super Bowl = week 22
function getApiWeek(playoffWeek: number): number {
  const weekMap: Record<number, number> = {
    1: 19, // Wild Card
    2: 20, // Divisional
    3: 21, // Conference Championships
    4: 22, // Super Bowl
  };
  return weekMap[playoffWeek] || playoffWeek;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const week = parseInt(url.searchParams.get('week') || '1');
    const season = parseInt(url.searchParams.get('season') || '2024');

    console.log(`Syncing stats for season ${season}, playoff week ${week}`);

    const apiSportsKey = Deno.env.get('API_SPORTS_KEY');
    if (!apiSportsKey) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all our playoff players to match against
    const { data: playoffPlayers, error: playersError } = await supabase
      .from('playoff_players')
      .select('player_id, name, team_id, position')
      .eq('season', season);

    if (playersError) {
      throw new Error(`Failed to fetch playoff players: ${playersError.message}`);
    }

    console.log(`Found ${playoffPlayers?.length || 0} playoff players to match`);

    // Create a map for quick lookup
    const playerMap = new Map<number, typeof playoffPlayers[0]>();
    playoffPlayers?.forEach(p => playerMap.set(p.player_id, p));

    // Fetch stats from API-Sports for the given week
    const apiWeek = getApiWeek(week);
    console.log(`Fetching API-Sports stats for API week ${apiWeek}`);

    // Fetch player statistics for all games in that week
    const statsResponse = await fetch(
      `https://v1.american-football.api-sports.io/players/statistics?season=${season}&week=${apiWeek}&league=1`,
      {
        headers: {
          'x-apisports-key': apiSportsKey,
        },
      }
    );

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      throw new Error(`API-Sports request failed: ${statsResponse.status} - ${errorText}`);
    }

    const statsData = await statsResponse.json();
    console.log(`API response contains ${statsData.response?.length || 0} player stats records`);

    const statsToUpsert: Array<{
      season: number;
      week: number;
      player_id: number;
      player_name: string;
      pass_yds: number;
      pass_tds: number;
      interceptions: number;
      rush_yds: number;
      rush_tds: number;
      rec_yds: number;
      rec_tds: number;
      fumbles_lost: number;
      fantasy_points_standard: number;
      raw_json: unknown;
    }> = [];

    const unmatchedPlayers: string[] = [];
    const matchedPlayers: string[] = [];

    // Process each player's stats
    for (const record of statsData.response || []) {
      const apiPlayerId = record.player?.id;
      const playerName = record.player?.name || 'Unknown';
      
      if (!apiPlayerId) {
        console.log(`Skipping record without player ID: ${playerName}`);
        continue;
      }

      // Check if this player is in our playoff_players table
      const ourPlayer = playerMap.get(apiPlayerId);
      if (!ourPlayer) {
        // Only log if this is a skill position player we might care about
        const position = record.player?.position;
        if (['QB', 'RB', 'WR', 'TE'].includes(position)) {
          unmatchedPlayers.push(`${playerName} (ID: ${apiPlayerId}, Pos: ${position})`);
        }
        continue;
      }

      // Extract stats from the API response
      const teams = record.teams || [];
      let pass_yds = 0, pass_tds = 0, interceptions = 0;
      let rush_yds = 0, rush_tds = 0;
      let rec_yds = 0, rec_tds = 0;
      let fumbles_lost = 0;

      // Stats can be nested under teams[].groups[].statistics[]
      for (const team of teams) {
        for (const group of team.groups || []) {
          for (const stat of group.statistics || []) {
            const name = stat.name?.toLowerCase() || '';
            const value = parseFloat(stat.value) || 0;

            // Passing stats
            if (name === 'passing yards' || name === 'pass yards') pass_yds += value;
            if (name === 'passing touchdowns' || name === 'pass td' || name === 'pass touchdowns') pass_tds += value;
            if (name === 'interceptions thrown' || name === 'interceptions') interceptions += value;
            
            // Rushing stats
            if (name === 'rushing yards' || name === 'rush yards') rush_yds += value;
            if (name === 'rushing touchdowns' || name === 'rush td' || name === 'rush touchdowns') rush_tds += value;
            
            // Receiving stats
            if (name === 'receiving yards' || name === 'rec yards') rec_yds += value;
            if (name === 'receiving touchdowns' || name === 'rec td' || name === 'rec touchdowns') rec_tds += value;
            
            // Fumbles
            if (name === 'fumbles lost') fumbles_lost += value;
          }
        }
      }

      const stats = { pass_yds, pass_tds, interceptions, rush_yds, rush_tds, rec_yds, rec_tds, fumbles_lost };
      const fantasy_points = calculateFantasyPoints(stats);

      matchedPlayers.push(`${ourPlayer.name}: ${fantasy_points.toFixed(1)} pts`);

      statsToUpsert.push({
        season,
        week,
        player_id: apiPlayerId,
        player_name: ourPlayer.name,
        ...stats,
        fantasy_points_standard: fantasy_points,
        raw_json: record,
      });
    }

    console.log(`Matched ${matchedPlayers.length} players, ${unmatchedPlayers.length} unmatched skill players`);

    if (unmatchedPlayers.length > 0) {
      console.log('Unmatched skill players:', unmatchedPlayers.slice(0, 20).join(', '));
    }

    // Upsert stats into the database
    if (statsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('player_week_stats')
        .upsert(statsToUpsert, {
          onConflict: 'season,week,player_id',
        });

      if (upsertError) {
        throw new Error(`Failed to upsert stats: ${upsertError.message}`);
      }

      console.log(`Successfully upserted ${statsToUpsert.length} player stats`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        season,
        week,
        apiWeek,
        matched: matchedPlayers.length,
        unmatched: unmatchedPlayers.length,
        unmatchedPlayers: unmatchedPlayers.slice(0, 20),
        matchedPlayers: matchedPlayers.slice(0, 20),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-player-stats:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
