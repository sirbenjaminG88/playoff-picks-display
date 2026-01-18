import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify admin role or service key
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string }> {
  // TEMPORARY: Allow unauthenticated for initial data sync
  // TODO: Remove this after sync is complete
  const url = new URL(req.url);
  if (url.searchParams.get('sync_key') === 'initial-2025-sync') {
    return { authorized: true };
  }

  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (authHeader?.includes(serviceKey || '___none___')) {
    return { authorized: true };
  }

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

// Team abbreviation mapping
const teamAbbrMap: Record<string, string> = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',
};

function getTeamAbbr(teamName: string, code?: string): string | null {
  if (code) return code;
  return teamAbbrMap[teamName] || null;
}

function parseWeekNumber(weekStr: string): number | null {
  if (!weekStr) return null;
  const match = weekStr.match(/Week\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  const num = parseInt(weekStr, 10);
  return isNaN(num) ? null : num;
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

    // Fetch ALL games for the season in one call (like the working weeks-14-18 function)
    console.log(`Fetching all ${season} season games from API...`);
    const response = await fetch(
      `https://v1.american-football.api-sports.io/games?season=${season}&league=1`,
      {
        headers: {
          'x-apisports-key': apiKey,
          'accept': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log(`Received ${data.response?.length || 0} total games from API`);

    // Filter for Regular Season games in our week range
    const regularSeasonGames = (data.response || []).filter((game: any) => {
      const weekNum = parseWeekNumber(game.game.week);
      const isRegularSeason = game.game.stage === 'Regular Season';
      return isRegularSeason && weekNum !== null && weekNum >= startWeek && weekNum <= endWeek;
    });

    console.log(`Filtered to ${regularSeasonGames.length} regular season games for weeks ${startWeek}-${endWeek}`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const gameData of regularSeasonGames) {
      const weekNum = parseWeekNumber(gameData.game.week)!;
      const gameDate = gameData.game.date?.date && gameData.game.date?.time
        ? `${gameData.game.date.date}T${gameData.game.date.time}:00Z`
        : null;

      const record = {
        season,
        week: weekNum,
        season_type: 'REG',
        api_game_id: gameData.game.id,
        game_date: gameDate,
        home_team_api_id: gameData.teams.home.id,
        home_team_name: gameData.teams.home.name,
        home_team_abbr: getTeamAbbr(gameData.teams.home.name, gameData.teams.home.code),
        away_team_api_id: gameData.teams.away.id,
        away_team_name: gameData.teams.away.name,
        away_team_abbr: getTeamAbbr(gameData.teams.away.name, gameData.teams.away.code),
        venue: gameData.game.venue?.name || null,
        status: gameData.game.status?.long || gameData.game.status?.short || 'scheduled',
      };

      const { data: existing } = await supabase
        .from('regular_season_games')
        .select('id')
        .eq('api_game_id', record.api_game_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('regular_season_games')
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) errors++;
        else updated++;
      } else {
        const { error } = await supabase.from('regular_season_games').insert(record);
        if (error) errors++;
        else inserted++;
      }
    }

    const totalInserted = inserted + updated;
    
    return new Response(
      JSON.stringify({
        success: true,
        season,
        startWeek,
        endWeek,
        gamesFound: regularSeasonGames.length,
        inserted,
        updated,
        errors,
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
