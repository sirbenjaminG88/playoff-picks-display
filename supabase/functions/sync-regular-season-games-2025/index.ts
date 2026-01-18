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

  const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (roleError || !isAdmin) {
    return { authorized: false, error: 'User is not an admin' };
  }

  return { authorized: true };
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorized, error: authError } = await verifyAdmin(req);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const startWeek = parseInt(url.searchParams.get('start_week') || '1');
    const endWeek = parseInt(url.searchParams.get('end_week') || '13');
    const season = 2025;

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

    const results: Array<{
      week: number;
      gamesInserted: number;
      gamesSkipped: number;
    }> = [];

    for (let week = startWeek; week <= endWeek; week++) {
      // API-Sports uses different week numbering for regular season
      // Regular season is stage "Regular Season" or similar
      const apiUrl = `https://v1.american-football.api-sports.io/games?league=1&season=${season}&week=${week}`;
      
      console.log(`Fetching week ${week}: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'x-apisports-key': apiKey,
          'accept': 'application/json',
        },
      });

      const data = await response.json();
      const games = data.response || [];
      
      console.log(`Week ${week}: Found ${games.length} games`);
      
      let gamesInserted = 0;
      let gamesSkipped = 0;

      for (const game of games) {
        // Filter to only regular season games
        if (game.stage !== 'Regular Season' && game.stage !== 'REG') {
          gamesSkipped++;
          continue;
        }

        const gameData = {
          api_game_id: game.game?.id,
          season: season,
          week: week,
          season_type: 'REG',
          home_team_name: game.teams?.home?.name,
          home_team_abbr: game.teams?.home?.code,
          home_team_api_id: game.teams?.home?.id,
          away_team_name: game.teams?.away?.name,
          away_team_abbr: game.teams?.away?.code,
          away_team_api_id: game.teams?.away?.id,
          game_date: game.date,
          venue: game.venue?.name,
          status: game.status?.short,
        };

        if (!gameData.api_game_id || !gameData.home_team_api_id || !gameData.away_team_api_id) {
          gamesSkipped++;
          continue;
        }

        const { error } = await supabase
          .from('regular_season_games')
          .upsert(gameData, {
            onConflict: 'api_game_id',
          });

        if (error) {
          console.error(`Error inserting game ${gameData.api_game_id}:`, error.message);
          gamesSkipped++;
        } else {
          gamesInserted++;
        }
      }

      results.push({
        week,
        gamesInserted,
        gamesSkipped,
      });

      // Rate limit
      await delay(200);
    }

    const totalInserted = results.reduce((sum, r) => sum + r.gamesInserted, 0);
    
    return new Response(
      JSON.stringify({
        success: true,
        season,
        startWeek,
        endWeek,
        totalGamesInserted: totalInserted,
        weeklyResults: results,
      }, null, 2),
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
