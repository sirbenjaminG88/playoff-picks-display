import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function extractESPNPlayerId(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/players\/full\/(\d+)/);
  return match ? match[1] : null;
}

function calculateFantasyPointsFromESPN(
  stats: string[],
  labels: string[],
  settings: ScoringSettings
): number {
  let points = 0;
  const isQB = labels[0] === 'CMP';
  const isSkillPosition = labels[0] === 'REC';

  if (isQB) {
    // QB stats: CMP, ATT, YDS, CMP%, AVG, TD, INT, LNG, SACK, QBR, RTG, CAR, YDS, AVG, TD, FUM, LST
    const passYds = parseFloat(stats[2]) || 0;
    const passTds = parseInt(stats[5]) || 0;
    const ints = parseInt(stats[6]) || 0;
    const rushYds = parseFloat(stats[12]) || 0;
    const rushTds = parseInt(stats[14]) || 0;

    points += passYds / settings.pass_yds_per_point;
    points += passTds * settings.pass_td_points;
    points += ints * settings.interception_points;
    points += rushYds / settings.rush_yds_per_point;
    points += rushTds * settings.rush_td_points;
  } else if (isSkillPosition) {
    // Skill position stats: REC, TGTS, YDS, AVG, TD, LNG, CAR, YDS, AVG, LNG, TD, FUM, LST
    const recYds = parseFloat(stats[2]) || 0;
    const recTds = parseInt(stats[4]) || 0;
    const rushYds = parseFloat(stats[7]) || 0;
    const rushTds = parseInt(stats[10]) || 0;
    const fumLost = parseInt(stats[12]) || 0;

    points += recYds / settings.rec_yds_per_point;
    points += recTds * settings.rec_td_points;
    points += rushYds / settings.rush_yds_per_point;
    points += rushTds * settings.rush_td_points;
    points += fumLost * settings.fumble_lost_points;
  }

  return points;
}

async function fetchESPNRegularSeasonAvg(
  espnPlayerId: string,
  season: number,
  settings: ScoringSettings
): Promise<{ avgPoints: number; gamesPlayed: number } | null> {
  try {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${espnPlayerId}/gamelog?season=${season}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code === 404) return null;

    const labels = data.labels || [];
    if (labels.length === 0) return null;

    let regularSeasonEvents: any[] = [];
    for (const st of data.seasonTypes || []) {
      if (st.displayName?.includes('Regular Season')) {
        for (const cat of st.categories || []) {
          regularSeasonEvents = cat.events || [];
          break;
        }
        break;
      }
    }

    if (regularSeasonEvents.length === 0) return null;

    let totalPoints = 0;
    let gamesWithStats = 0;

    for (const event of regularSeasonEvents) {
      const stats = event.stats || [];
      if (stats.length > 0) {
        const gamePoints = calculateFantasyPointsFromESPN(stats, labels, settings);
        totalPoints += gamePoints;
        gamesWithStats++;
      }
    }

    if (gamesWithStats === 0) return { avgPoints: 0, gamesPlayed: 0 };

    return { avgPoints: totalPoints / gamesWithStats, gamesPlayed: gamesWithStats };
  } catch (error) {
    console.error(`Error fetching ESPN data for player ${espnPlayerId}:`, error);
    return null;
  }
}

async function getActiveScoringSettings(supabase: any): Promise<ScoringSettings> {
  const { data, error } = await supabase
    .from('scoring_settings')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return DEFAULT_SCORING;

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

async function getPlayoffAverage(
  supabase: any,
  playerId: number,
  season: number
): Promise<{ avgPoints: number; gamesPlayed: number }> {
  const { data, error } = await supabase
    .from('player_week_stats')
    .select('fantasy_points_standard')
    .eq('player_id', playerId)
    .eq('season', season)
    .in('week', [1, 2, 3, 4]);

  if (error || !data || data.length === 0) return { avgPoints: 0, gamesPlayed: 0 };

  const gamesWithPoints = data.filter((g: any) => g.fantasy_points_standard > 0);
  if (gamesWithPoints.length === 0) return { avgPoints: 0, gamesPlayed: 0 };

  const total = gamesWithPoints.reduce((sum: number, g: any) => sum + g.fantasy_points_standard, 0);
  return { avgPoints: total / gamesWithPoints.length, gamesPlayed: gamesWithPoints.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const seasonParam = url.searchParams.get('season');
    const limitParam = url.searchParams.get('limit');
    const playerIdParam = url.searchParams.get('player_id');

    const SEASON = seasonParam ? parseInt(seasonParam) : 2025;
    const limit = limitParam ? parseInt(limitParam) : null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const scoringSettings = await getActiveScoringSettings(supabase);

    let query = supabase
      .from('playoff_players')
      .select('player_id, name, position, image_url, team_name')
      .eq('season', SEASON);

    if (playerIdParam) query = query.eq('player_id', parseInt(playerIdParam));
    if (limit) query = query.limit(limit);

    const { data: players, error: playersError } = await query;
    if (playersError) throw new Error(`Failed to fetch players: ${playersError.message}`);

    const results: any[] = [];
    let updated = 0, skipped = 0, errors = 0;

    for (const player of players || []) {
      const espnId = extractESPNPlayerId(player.image_url);

      if (!espnId) {
        results.push({ player_id: player.player_id, name: player.name, status: 'no_espn_id' });
        skipped++;
        continue;
      }

      const regSeasonData = await fetchESPNRegularSeasonAvg(espnId, SEASON, scoringSettings);
      const playoffData = await getPlayoffAverage(supabase, player.player_id, SEASON);

      let projectedPoints: number;
      let projectionSource: string;

      if (playoffData.gamesPlayed > 0 && regSeasonData && regSeasonData.gamesPlayed > 0) {
        // 60% playoff + 40% regular season blend
        projectedPoints = (playoffData.avgPoints * 0.6) + (regSeasonData.avgPoints * 0.4);
        projectionSource = 'blend';
      } else if (playoffData.gamesPlayed > 0) {
        projectedPoints = playoffData.avgPoints;
        projectionSource = 'playoff_only';
      } else if (regSeasonData && regSeasonData.gamesPlayed > 0) {
        projectedPoints = regSeasonData.avgPoints;
        projectionSource = 'regular_season_only';
      } else {
        // Fallback to position-based defaults
        const posDefaults: Record<string, number> = { 'QB': 15, 'RB': 8, 'WR': 8, 'TE': 5 };
        projectedPoints = posDefaults[player.position] || 5;
        projectionSource = 'position_default';
      }

      const { error: updateError } = await supabase
        .from('playoff_players')
        .update({
          espn_player_id: espnId,
          regular_season_avg_pts: regSeasonData?.avgPoints || null,
          regular_season_games: regSeasonData?.gamesPlayed || 0,
          projected_pts: projectedPoints,
          projection_source: projectionSource,
          projection_updated_at: new Date().toISOString(),
        })
        .eq('player_id', player.player_id)
        .eq('season', SEASON);

      if (updateError) {
        results.push({
          player_id: player.player_id,
          name: player.name,
          status: 'update_failed',
          error: updateError.message,
        });
        errors++;
      } else {
        results.push({
          player_id: player.player_id,
          name: player.name,
          position: player.position,
          espn_id: espnId,
          regular_season_avg: regSeasonData?.avgPoints?.toFixed(1) || null,
          playoff_avg: playoffData.avgPoints > 0 ? playoffData.avgPoints.toFixed(1) : null,
          projected_pts: projectedPoints.toFixed(1),
          projection_source: projectionSource,
          status: 'success',
        });
        updated++;
      }

      // Rate limit: 100ms between ESPN API calls
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Response(
      JSON.stringify({
        success: true,
        season: SEASON,
        totalPlayers: players?.length || 0,
        updated,
        skipped,
        errors,
        durationMs: Date.now() - startTime,
        results,
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('sync-player-projections error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
