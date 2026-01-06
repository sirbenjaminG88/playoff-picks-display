import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wild Card teams
const WILD_CARD_TEAMS = [
  { team_id: 19, name: "Carolina Panthers" },
  { team_id: 31, name: "Los Angeles Rams" },
  { team_id: 16, name: "Chicago Bears" },
  { team_id: 15, name: "Green Bay Packers" },
  { team_id: 2, name: "Jacksonville Jaguars" },
  { team_id: 20, name: "Buffalo Bills" },
  { team_id: 12, name: "Philadelphia Eagles" },
  { team_id: 14, name: "San Francisco 49ers" },
  { team_id: 3, name: "New England Patriots" },
  { team_id: 30, name: "Los Angeles Chargers" },
  { team_id: 22, name: "Pittsburgh Steelers" },
  { team_id: 26, name: "Houston Texans" },
];

// Wild Card games
const WILD_CARD_GAMES = [
  { game_id: 21459, home_team_external_id: 19, away_team_external_id: 31, kickoff_at: '2026-01-10T21:30:00Z', venue_name: "Bank of America Stadium", venue_city: "Charlotte" },
  { game_id: 17589, home_team_external_id: 16, away_team_external_id: 15, kickoff_at: '2026-01-11T01:00:00Z', venue_name: "Soldier Field", venue_city: "Chicago" },
  { game_id: 17587, home_team_external_id: 2, away_team_external_id: 20, kickoff_at: '2026-01-11T18:00:00Z', venue_name: "EverBank Stadium", venue_city: "Jacksonville" },
  { game_id: 17588, home_team_external_id: 12, away_team_external_id: 14, kickoff_at: '2026-01-11T21:30:00Z', venue_name: "Lincoln Financial Field", venue_city: "Philadelphia" },
  { game_id: 21460, home_team_external_id: 3, away_team_external_id: 30, kickoff_at: '2026-01-12T01:00:00Z', venue_name: "Gillette Stadium", venue_city: "Foxborough" },
  { game_id: 17586, home_team_external_id: 22, away_team_external_id: 26, kickoff_at: '2026-01-13T01:15:00Z', venue_name: "Acrisure Stadium", venue_city: "Pittsburgh" },
];

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[insert-2025-wild-card] Starting manual Wild Card insert");

  try {
    // Verify admin auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("[insert-2025-wild-card] Admin verified, inserting teams...");

    // Insert teams
    const teamsToUpsert = WILD_CARD_TEAMS.map(t => ({
      team_id: t.team_id,
      name: t.name,
      season: 2025,
      made_playoffs: true,
    }));

    const { error: teamsError } = await supabase
      .from('playoff_teams')
      .upsert(teamsToUpsert, { onConflict: 'team_id,season' });

    if (teamsError) {
      console.error("[insert-2025-wild-card] Teams upsert error:", teamsError);
      throw new Error(`Teams upsert failed: ${teamsError.message}`);
    }

    console.log(`[insert-2025-wild-card] Upserted ${teamsToUpsert.length} teams`);

    // Insert games
    const gamesToUpsert = WILD_CARD_GAMES.map(g => ({
      game_id: g.game_id,
      season: 2025,
      week_index: 1,
      week_label: 'Wild Card',
      stage: 'Post Season',
      home_team_external_id: g.home_team_external_id,
      away_team_external_id: g.away_team_external_id,
      kickoff_at: g.kickoff_at,
      venue_name: g.venue_name,
      venue_city: g.venue_city,
      status_short: 'NS',
      status_long: 'Not Started',
    }));

    const { error: gamesError } = await supabase
      .from('playoff_games')
      .upsert(gamesToUpsert, { onConflict: 'game_id,season' });

    if (gamesError) {
      console.error("[insert-2025-wild-card] Games upsert error:", gamesError);
      throw new Error(`Games upsert failed: ${gamesError.message}`);
    }

    console.log(`[insert-2025-wild-card] Upserted ${gamesToUpsert.length} games`);

    // Backfill home_team_id and away_team_id UUIDs
    console.log("[insert-2025-wild-card] Backfilling team UUIDs...");

    // Get playoff_teams for UUID lookup
    const { data: playoffTeams, error: lookupError } = await supabase
      .from('playoff_teams')
      .select('id, team_id')
      .eq('season', 2025);

    if (lookupError) {
      console.error("[insert-2025-wild-card] Team lookup error:", lookupError);
      throw new Error(`Team lookup failed: ${lookupError.message}`);
    }

    const teamIdToUUID = new Map<number, string>();
    for (const pt of playoffTeams || []) {
      teamIdToUUID.set(pt.team_id, pt.id);
    }

    // Update each game with UUIDs
    let updatedCount = 0;
    for (const game of WILD_CARD_GAMES) {
      const homeUUID = teamIdToUUID.get(game.home_team_external_id);
      const awayUUID = teamIdToUUID.get(game.away_team_external_id);

      if (homeUUID && awayUUID) {
        const { error: updateError } = await supabase
          .from('playoff_games')
          .update({
            home_team_id: homeUUID,
            away_team_id: awayUUID,
          })
          .eq('game_id', game.game_id)
          .eq('season', 2025);

        if (updateError) {
          console.error(`[insert-2025-wild-card] Failed to update game ${game.game_id}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        console.warn(`[insert-2025-wild-card] Missing UUID for game ${game.game_id}: home=${homeUUID}, away=${awayUUID}`);
      }
    }

    console.log(`[insert-2025-wild-card] Updated ${updatedCount} games with team UUIDs`);

    return new Response(JSON.stringify({
      success: true,
      teamsInserted: teamsToUpsert.length,
      gamesInserted: gamesToUpsert.length,
      gamesUpdatedWithUUIDs: updatedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[insert-2025-wild-card] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
