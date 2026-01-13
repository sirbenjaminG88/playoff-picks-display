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

const TEAM_NAME_TO_ABBR: Record<string, string> = {
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

  for (const teamBox of boxscore.players) {
    for (const statCategory of teamBox.statistics || []) {
      const categoryName = statCategory.name?.toLowerCase() || '';
      
      for (const athlete of statCategory.athletes || []) {
        if (athlete.athlete?.id !== espnPlayerId) continue;
        
        const statLine = athlete.stats || [];
        
        if (categoryName === 'passing') {
          stats.pass_yds = parseFloat(statLine[1]) || 0;
          stats.pass_tds = parseInt(statLine[3]) || 0;
          stats.interceptions = parseInt(statLine[4]) || 0;
        }
        
        if (categoryName === 'rushing') {
          stats.rush_yds = parseFloat(statLine[1]) || 0;
          stats.rush_tds = parseInt(statLine[3]) || 0;
        }
        
        if (categoryName === 'receiving') {
          stats.rec_yds = parseFloat(statLine[1]) || 0;
          stats.rec_tds = parseInt(statLine[3]) || 0;
        }
        
        if (categoryName === 'fumbles') {
          stats.fumbles_lost = parseInt(statLine[1]) || 0;
        }
      }
    }
  }

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

function extractESPNPlayerId(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/players\/full\/(\d+)/);
  return match ? match[1] : null;
}

serve(async (req) => {
  console.log('=== backfill-all-playoff-stats invoked ===');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const weekParam = url.searchParams.get('week');
    
    if (!weekParam) {
      return new Response(
        JSON.stringify({ success: false, error: 'week parameter is required (1-4)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const week = parseInt(weekParam);
    if (week < 1 || week > 4) {
      return new Response(
        JSON.stringify({ success: false, error: 'week must be 1-4' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const SEASON = 2025;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get completed games for this week
    const { data: completedGames, error: gamesError } = await supabase
      .from('playoff_games')
      .select('game_id, home_team_external_id, away_team_external_id, status_short')
      .eq('season', SEASON)
      .eq('week_index', week)
      .eq('status_short', 'FT');

    if (gamesError) {
      console.error('Error fetching games:', gamesError);
      return new Response(
        JSON.stringify({ error: gamesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!completedGames || completedGames.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No completed games found', week, season: SEASON }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamIdsInGames = new Set<number>();
    completedGames.forEach(game => {
      teamIdsInGames.add(game.home_team_external_id);
      teamIdsInGames.add(game.away_team_external_id);
    });

    console.log(`Found ${completedGames.length} completed games with teams: ${Array.from(teamIdsInGames).join(', ')}`);

    // Get ALL selectable players from these teams
    const { data: allPlayers, error: playersError } = await supabase
      .from('selectable_playoff_players')
      .select('player_id, name, image_url, team_id, team_name, position')
      .eq('season', SEASON)
      .in('team_id', Array.from(teamIdsInGames));

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return new Response(
        JSON.stringify({ error: playersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allPlayers?.length || 0} selectable players`);

    if (!allPlayers || allPlayers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No selectable players found', week, season: SEASON }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build ESPN game ID mapping by team
    const teamIdToEspnGameId = new Map<number, string>();
    for (const game of completedGames) {
      const espnGameId = game.game_id.toString();
      teamIdToEspnGameId.set(game.home_team_external_id, espnGameId);
      teamIdToEspnGameId.set(game.away_team_external_id, espnGameId);
    }

    // Build player ID to ESPN ID mapping
    const ourIdToEspnId = new Map<number, string>();
    const playerInfoMap = new Map<number, { name: string; teamId: number; teamName: string }>();

    for (const player of allPlayers) {
      const espnId = extractESPNPlayerId(player.image_url);
      if (espnId) {
        ourIdToEspnId.set(player.player_id, espnId);
      }
      playerInfoMap.set(player.player_id, {
        name: player.name,
        teamId: player.team_id,
        teamName: player.team_name,
      });
    }

    console.log(`Mapped ${ourIdToEspnId.size}/${allPlayers.length} players to ESPN IDs`);

    const scoringSettings = await getActiveScoringSettings(supabase);
    const gameSummaryCache = new Map<string, any>();
    
    let statsUpserted = 0;
    let statsSkipped = 0;
    const results: any[] = [];

    const BATCH_SIZE = 10;
    const playerIds = Array.from(playerInfoMap.keys());
    
    for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
      const batch = playerIds.slice(i, i + BATCH_SIZE);
      
      for (const playerId of batch) {
        const playerInfo = playerInfoMap.get(playerId)!;
        const espnPlayerId = ourIdToEspnId.get(playerId);
        const espnGameId = teamIdToEspnGameId.get(playerInfo.teamId);

        if (!espnPlayerId) {
          statsSkipped++;
          results.push({ player_id: playerId, player_name: playerInfo.name, status: 'no_espn_id' });
          continue;
        }

        if (!espnGameId) {
          statsSkipped++;
          results.push({ player_id: playerId, player_name: playerInfo.name, status: 'no_game_found' });
          continue;
        }

        try {
          let gameSummary = gameSummaryCache.get(espnGameId);
          if (!gameSummary) {
            gameSummary = await fetchESPNGameSummary(espnGameId);
            gameSummaryCache.set(espnGameId, gameSummary);
          }

          const rawStats = extractPlayerStatsFromESPN(gameSummary.boxscore, espnPlayerId);
          
          const hasStats = rawStats.pass_yds > 0 || rawStats.rush_yds > 0 || rawStats.rec_yds > 0 || 
                          rawStats.pass_tds > 0 || rawStats.rush_tds > 0 || rawStats.rec_tds > 0;
          
          if (!hasStats) {
            statsSkipped++;
            results.push({ player_id: playerId, player_name: playerInfo.name, status: 'no_stats_in_game' });
            continue;
          }
          
          const existingStats = await fetchExistingStats(supabase, SEASON, week, playerId);
          const stats = smartMergeStats(rawStats, existingStats);
          const fantasyPoints = calculateFantasyPoints(stats, scoringSettings);

          const { error: upsertError } = await supabase
            .from('player_week_stats')
            .upsert({
              season: SEASON,
              week: week,
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
              raw_json: { source: 'espn_backfill', espn_player_id: espnPlayerId },
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'season,week,player_id',
            });

          if (upsertError) {
            console.error(`Upsert error for ${playerInfo.name}:`, upsertError.message);
            results.push({ player_id: playerId, player_name: playerInfo.name, status: 'upsert_failed', error: upsertError.message });
          } else {
            statsUpserted++;
            console.log(`${playerInfo.name}: ${fantasyPoints.toFixed(1)} pts`);
            results.push({ player_id: playerId, player_name: playerInfo.name, fantasy_points: fantasyPoints, status: 'success' });
          }
        } catch (err) {
          console.error(`Error for ${playerInfo.name}:`, err);
          results.push({ player_id: playerId, player_name: playerInfo.name, status: 'fetch_failed', error: err instanceof Error ? err.message : 'Unknown' });
        }
      }
      
      if (i + BATCH_SIZE < playerIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = Date.now() - startTime;

    const summary = {
      success: true,
      source: 'ESPN',
      mode: 'backfill_all_players',
      season: SEASON,
      week,
      completedGames: completedGames.length,
      teamsProcessed: teamIdsInGames.size,
      totalPlayers: allPlayers.length,
      playersMapped: ourIdToEspnId.size,
      statsUpserted,
      statsSkipped,
      durationMs: duration,
      sampleResults: results.filter(r => r.status === 'success').slice(0, 10),
    };

    console.log(`Backfill complete: ${statsUpserted} stats upserted, ${statsSkipped} skipped in ${duration}ms`);

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
